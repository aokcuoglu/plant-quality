#!/usr/bin/env node
import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const webDir = path.join(root, "apps", "web")
const dbDir = path.join(root, "packages", "db")
const dist = path.join(root, "apps", "desktop", "dist")
const appDist = path.join(dist, "app")
const nextDistName = ".next-desktop"
const nextDist = path.join(webDir, nextDistName)

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", ...opts })
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed with status ${res.status}`)
  }
}

async function cp(src, dest) {
  await fs.cp(src, dest, { recursive: true })
}

async function mkdirp(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"))
}

async function exists(file) {
  try {
    await fs.access(file)
    return true
  } catch {
    return false
  }
}

async function main() {
  console.log("[desktop] Building Next.js standalone app…")
  run("npm", ["run", "build"], {
    cwd: webDir,
    env: { ...process.env, NEXT_DIST_DIR: nextDistName },
  })

  console.log("[desktop] Assembling desktop bundle…")
  await fs.rm(dist, { recursive: true, force: true })
  await mkdirp(dist)

  const standalone = path.join(nextDist, "standalone")
  const staticDir = path.join(nextDist, "static")
  const publicDir = path.join(webDir, "public")
  const prismaDir = path.join(dbDir, "prisma")
  const generatedDir = path.join(dbDir, "src", "generated")

  console.log("[desktop] Copying standalone server…")
  await cp(standalone, appDist)

  // In a monorepo the standalone nests the app under apps/web/. The relative
  // symlinks in .next/node_modules break if we move it up, so run it in place.
  const nestedApp = path.join(appDist, "apps", "web")
  const appRoot = (await exists(path.join(nestedApp, "server.js"))) ? nestedApp : appDist
  await fs.rm(path.join(appRoot, ".env"), { force: true })

  console.log("[desktop] Copying static assets and runtime files…")
  await cp(staticDir, path.join(appRoot, nextDistName, "static"))
  if (await exists(publicDir)) {
    await cp(publicDir, path.join(appDist, "public"))
  }
  await cp(prismaDir, path.join(appDist, "prisma"))
  await fs.copyFile(path.join(dbDir, "prisma.config.ts"), path.join(appDist, "prisma.config.ts"))
  await cp(generatedDir, path.join(appDist, "src", "generated"))
  await fs.copyFile(path.join(webDir, "package.json"), path.join(appDist, "package.json"))

  for (const mod of [
    "prisma",
    "@prisma",
    "tsx",
    "dotenv",
    "effect",
    "fast-check",
    "pure-rand",
    "@standard-schema",
    "c12",
    "deepmerge-ts",
    "empathic",
  ]) {
    const src = path.join(root, "node_modules", mod)
    if (await exists(src)) {
      await cp(src, path.join(appDist, "node_modules", mod))
    }
  }

  console.log("[desktop] Compiling Electron main + preload…")
  run(
    "npx",
    [
      "esbuild",
      "apps/desktop/electron/main.ts",
      "--bundle",
      "--platform=node",
      "--format=cjs",
      "--external:electron",
      "--external:embedded-postgres",
      "--outfile=apps/desktop/dist/main.js",
    ],
    { cwd: root },
  )
  run(
    "npx",
    [
      "esbuild",
      "apps/desktop/electron/preload.ts",
      "--bundle",
      "--platform=node",
      "--format=cjs",
      "--external:electron",
      "--outfile=apps/desktop/dist/preload.js",
    ],
    { cwd: root },
  )

  const rootPkg = await readJson(path.join(root, "package.json"))
  const embeddedPkg = await readJson(path.join(root, "node_modules", "embedded-postgres", "package.json"))

  const desktopPkg = {
    name: "plantquality-desktop",
    version: rootPkg.version,
    private: true,
    main: "main.js",
    dependencies: {
      "embedded-postgres": embeddedPkg.version,
    },
  }
  await fs.writeFile(path.join(dist, "package.json"), JSON.stringify(desktopPkg, null, 2))

  const installed = await exists(path.join(dist, "node_modules", "embedded-postgres"))
  if (!installed) {
    console.log("[desktop] Installing desktop runtime dependencies…")
    run("npm", ["install", "--omit=dev", "--no-package-lock", "--no-audit", "--no-fund", "--prefix", dist], {
      cwd: dist,
    })
  } else {
    console.log("[desktop] Runtime dependencies already installed (skip).")
  }

  // npm 11 gates install scripts (allow-scripts). Re-hydrate the embedded
  // Postgres symlinks explicitly so the binaries are executable at runtime.
  const embeddedBinPkgs = path.join(dist, "node_modules", "@embedded-postgres")
  const platformDirs = (await exists(embeddedBinPkgs))
    ? (await fs.readdir(embeddedBinPkgs)).filter((d) => d !== ".bin")
    : []
  for (const platform of platformDirs) {
    const pkgDir = path.join(embeddedBinPkgs, platform)
    const hydrate = path.join(pkgDir, "scripts", "hydrate-symlinks.js")
    if (await exists(hydrate)) {
      run("node", [hydrate], { cwd: pkgDir })
    }
  }

  console.log("[desktop] Done. Bundle at", dist)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
