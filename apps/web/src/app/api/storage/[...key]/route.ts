import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import fs from "fs/promises"
import path from "path"

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".json": "application/json",
}

function storageDir(): string {
  const dir = process.env.STORAGE_DIR
  if (!dir) throw new Error("STORAGE_DIR is not set")
  return dir
}

function resolveKey(key: string): string {
  const normalized = path.normalize(key)
  if (path.isAbsolute(normalized) || normalized.split(path.sep).includes("..")) {
    throw new Error(`Invalid storage key: ${key}`)
  }
  return path.join(storageDir(), normalized)
}

function joinKey(segments: string[]): string {
  return Array.isArray(segments) ? segments.join("/") : segments
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const session = await auth()
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { key } = await params
  const keyStr = joinKey(key)
  let filePath: string
  try {
    filePath = resolveKey(keyStr)
  } catch {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 })
  }

  const data = Buffer.from(await req.arrayBuffer())
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, data)

  return new NextResponse(null, { status: 200 })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const session = await auth()
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { key } = await params
  const keyStr = joinKey(key)
  let filePath: string
  try {
    filePath = resolveKey(keyStr)
  } catch {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 })
  }

  try {
    const data = await fs.readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()
    return new NextResponse(data, {
      headers: {
        "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=86400",
      },
    })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}