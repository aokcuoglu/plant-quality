import { app, BrowserWindow, dialog } from "electron"
import { spawn, type ChildProcess } from "child_process"
import { randomBytes } from "crypto"
import fs from "fs/promises"
import net from "net"
import path from "path"
import EmbeddedPostgres from "embedded-postgres"

interface AppConfig {
  dbMode: "embedded" | "remote"
  remoteDatabaseUrl?: string
  aiApiKey?: string
  secret: string
}

const isPackaged = app.isPackaged
const appDir = isPackaged
  ? path.join(process.resourcesPath, "app")
  : path.join(__dirname, "app")

const userDataDir = app.getPath("userData")
const dataDir = path.join(userDataDir, "data")
const pgDir = path.join(dataDir, "pg")
const storageDir = path.join(dataDir, "storage")

let pg: EmbeddedPostgres | null = null
let nextProcess: ChildProcess | null = null
let mainWindow: BrowserWindow | null = null
let nextPort = 0

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      const port = typeof address === "object" && address ? address.port : 0
      server.close(() => resolve(port))
    })
  })
}

async function loadConfig(): Promise<AppConfig> {
  const configPath = path.join(dataDir, "config.json")
  const defaults: AppConfig = {
    dbMode: "embedded",
    secret: randomBytes(32).toString("base64"),
  }
  try {
    const raw = await fs.readFile(configPath, "utf8")
    const parsed = JSON.parse(raw) as Partial<AppConfig>
    const config: AppConfig = { ...defaults, ...parsed }
    if (!config.secret) config.secret = defaults.secret
    if (config.secret !== defaults.secret || !parsed.secret) {
      await fs.writeFile(configPath, JSON.stringify(config, null, 2))
    }
    return config
  } catch {
    await fs.writeFile(configPath, JSON.stringify(defaults, null, 2))
    return defaults
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function nodeSpawn(bin: string, args: string[], env: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", ...env },
      cwd: appDir,
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stderr = ""
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString()
    })
    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Command failed (${code}): node ${args.join(" ")}\n${stderr}`))
      }
    })
  })
}

async function runDbSetup(databaseUrl: string): Promise<void> {
  const marker = path.join(dataDir, ".db-ready")
  if (await fileExists(marker)) return

  const nodeBin = process.execPath
  const prismaCli = path.join(appDir, "node_modules", "prisma", "build", "index.js")
  const seedEntry = path.join(appDir, "node_modules", "tsx", "dist", "cli.mjs")
  const seedFile = path.join(appDir, "prisma", "seed.ts")
  const env = { DATABASE_URL: databaseUrl }

  console.log("[plantquality] Applying schema…")
  await nodeSpawn(nodeBin, [prismaCli, "db", "push", "--accept-data-loss"], env)
  console.log("[plantquality] Seeding database…")
  await nodeSpawn(nodeBin, [seedEntry, seedFile], env)

  await fs.writeFile(marker, String(Date.now()))
}

async function cleanStalePostgresLock(): Promise<void> {
  const pidFile = path.join(pgDir, "postmaster.pid")
  try {
    const raw = await fs.readFile(pidFile, "utf8")
    const pid = Number(raw.split("\n")[0])
    if (Number.isInteger(pid) && pid > 0) {
      try {
        process.kill(pid, 0)
        return
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ESRCH") {
          await fs.rm(pidFile, { force: true })
          await fs.rm(path.join(pgDir, "postmaster.opts"), { force: true })
        }
      }
    }
  } catch {
    // No lock file present.
  }
}

async function startEmbeddedPostgres(config: AppConfig): Promise<string> {
  if (config.dbMode !== "embedded") {
    const url = config.remoteDatabaseUrl
    if (!url) throw new Error("dbMode is 'remote' but no remoteDatabaseUrl is configured.")
    return url
  }

  const pgPort = await getFreePort()
  pg = new EmbeddedPostgres({
    databaseDir: pgDir,
    user: "postgres",
    password: "postgres",
    port: pgPort,
    persistent: true,
    authMethod: "password",
  })

  console.log("[plantquality] Initialising embedded PostgreSQL…")
  try {
    await pg.initialise()
  } catch (err) {
    console.warn("[plantquality] initialise() warn:", err)
  }

  await cleanStalePostgresLock()
  await pg.start()

  try {
    await pg.createDatabase("plantx")
  } catch {
    // Database already exists on subsequent runs.
  }

  return `postgresql://postgres:postgres@127.0.0.1:${pgPort}/plantx`
}

async function startNextServer(databaseUrl: string, config: AppConfig): Promise<void> {
  nextPort = await getFreePort()

  // In a monorepo the standalone nests the app under apps/web/ (relative
  // symlinks in .next/node_modules break if moved). Run it in place.
  const nestedServer = path.join(appDir, "apps", "web", "server.js")
  const serverEntry = (await fileExists(nestedServer)) ? nestedServer : path.join(appDir, "server.js")
  const serverCwd = path.dirname(serverEntry)

  const env: Record<string, string> = {
    NODE_ENV: "production",
    HOSTNAME: "127.0.0.1",
    PORT: String(nextPort),
    DATABASE_URL: databaseUrl,
    STORAGE_MODE: "local",
    STORAGE_DIR: storageDir,
    AUTH_SECRET: config.secret,
    AUTH_URL: `http://127.0.0.1:${nextPort}`,
    NEXTAUTH_URL: `http://127.0.0.1:${nextPort}`,
    AUTH_TRUST_HOST: "true",
    AUTH_AZURE_AD_ID: process.env.AUTH_AZURE_AD_ID ?? "",
    AUTH_AZURE_AD_SECRET: process.env.AUTH_AZURE_AD_SECRET ?? "",
    AUTH_AZURE_AD_TENANT_ID: process.env.AUTH_AZURE_AD_TENANT_ID ?? "common",
    EMAIL_SERVER: '{"host":"127.0.0.1","port":1025}',
    EMAIL_FROM: "noreply@plantquality.com",
    AI_ENABLED: "true",
    AI_API_KEY: config.aiApiKey ?? process.env.AI_API_KEY ?? "",
    AI_BASE_URL: process.env.AI_BASE_URL ?? "https://api.deepseek.com/v1",
    AI_MODEL: process.env.AI_MODEL ?? "deepseek-chat",
    CRON_SECRET: "local-desktop-cron-secret",
    SENTRY_DSN: "",
    NEXT_PUBLIC_SENTRY_DSN: "",
    SENTRY_ORG: "",
    SENTRY_PROJECT: "",
    SENTRY_AUTH_TOKEN: "",
    R2_ACCOUNT_ID: "local",
    R2_BUCKET_NAME: "local",
  }

  nextProcess = spawn(process.execPath, [serverEntry], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", ...env },
    cwd: serverCwd,
    stdio: ["ignore", "pipe", "pipe"],
  })
  nextProcess.stdout?.on("data", (chunk) => {
    console.log("[next]", chunk.toString().trimEnd())
  })
  nextProcess.stderr?.on("data", (chunk) => {
    console.error("[next]", chunk.toString().trimEnd())
  })
}

async function waitForServer(url: string, timeoutMs = 120000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.status < 500) return
    } catch {
      // not ready yet
    }
    await sleep(300)
  }
  throw new Error(`Timed out waiting for the Next.js server at ${url}`)
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: "PlantQuality",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadURL(`http://127.0.0.1:${nextPort}`)
  mainWindow.once("ready-to-show", () => mainWindow?.show())
  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

async function boot(): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true })
  await fs.mkdir(storageDir, { recursive: true })

  const config = await loadConfig()

  const databaseUrl = await startEmbeddedPostgres(config)
  await runDbSetup(databaseUrl)
  await startNextServer(databaseUrl, config)
  await waitForServer(`http://127.0.0.1:${nextPort}`)
  console.log(`[plantquality] Ready at http://127.0.0.1:${nextPort}`)
  createWindow()
}

async function cleanup(): Promise<void> {
  if (nextProcess && !nextProcess.killed) {
    nextProcess.kill()
  }
  if (pg) {
    try {
      await pg.stop()
    } catch {
      // best effort
    }
  }
}

app.whenReady().then(() => {
  boot().catch((err) => {
    console.error("[plantquality] Failed to start:", err)
    dialog.showErrorBox("PlantQuality failed to start", String(err?.message ?? err))
    app.quit()
  })
})

app.on("window-all-closed", () => {
  app.quit()
})

app.on("before-quit", () => {
  void cleanup()
})