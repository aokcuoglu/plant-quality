import { S3Client } from "@aws-sdk/client-s3"
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner"
import fs from "fs/promises"
import path from "path"

function env(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing env: ${name}`)
  return val
}

export function isLocalStorage(): boolean {
  return process.env.STORAGE_MODE === "local"
}

function localStorageDir(): string {
  const dir = process.env.STORAGE_DIR
  if (!dir) throw new Error("Missing env: STORAGE_DIR")
  return dir
}

function resolveStorageKey(key: string): string {
  const normalized = path.normalize(key)
  if (path.isAbsolute(normalized) || normalized.split(path.sep).includes("..")) {
    throw new Error(`Invalid storage key: ${key}`)
  }
  return path.join(localStorageDir(), normalized)
}

async function readBody(body: unknown): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body
  if (body instanceof Uint8Array) return Buffer.from(body)
  const stream = body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined
  if (stream?.transformToByteArray) {
    return Buffer.from(await stream.transformToByteArray())
  }
  return Buffer.from(String(body ?? ""))
}

class LocalStorageClient {
  async send(command: unknown): Promise<unknown> {
    if (command instanceof PutObjectCommand) {
      const filePath = resolveStorageKey(command.input.Key ?? "")
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, await readBody(command.input.Body))
      return {}
    }

    if (command instanceof GetObjectCommand) {
      const filePath = resolveStorageKey(command.input.Key ?? "")
      let data: Buffer
      try {
        data = await fs.readFile(filePath)
      } catch {
        const err = new Error("NoSuchKey: The specified key does not exist.")
        ;(err as { name?: string }).name = "NoSuchKey"
        throw err
      }
      const bytes = new Uint8Array(data)
      return {
        $metadata: {},
        Body: {
          transformToByteArray: () => Promise.resolve(bytes),
          transformToString: () => Promise.resolve(data.toString()),
        },
        ContentType: undefined,
      }
    }

    if (command instanceof DeleteObjectCommand) {
      const filePath = resolveStorageKey(command.input.Key ?? "")
      try {
        await fs.unlink(filePath)
      } catch {
        // Storage delete is best effort; soft delete in DB is the source of truth.
      }
      return {}
    }

    const name = (command as { constructor?: { name?: string } })?.constructor?.name ?? "unknown"
    throw new Error(`Local storage does not support command: ${name}`)
  }
}

function isMinIO(): boolean {
  const endpoint = process.env.R2_PUBLIC_URL || ""
  const accountId = process.env.R2_ACCOUNT_ID || ""
  return (
    endpoint.includes("orb.local") ||
    endpoint.includes("minio") ||
    endpoint.includes("host.docker.internal") ||
    endpoint.includes("localhost") ||
    accountId === "local"
  )
}

function getS3Endpoint(): string {
  if (isMinIO()) {
    const url = process.env.R2_PUBLIC_URL || ""
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.host}`
  }
  return `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`
}

export const s3Client: S3Client = isLocalStorage()
  ? (new LocalStorageClient() as unknown as S3Client)
  : new S3Client({
      region: "auto",
      endpoint: getS3Endpoint(),
      credentials: {
        accessKeyId: env("R2_ACCESS_KEY_ID"),
        secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
      },
      forcePathStyle: true,
    })

export const S3_BUCKET_NAME = isLocalStorage() ? "local" : env("R2_BUCKET_NAME")

export async function getSignedUrl(
  client: S3Client,
  command: PutObjectCommand | GetObjectCommand,
  options?: { expiresIn?: number },
): Promise<string> {
  if (isLocalStorage()) {
    const key = command.input.Key ?? ""
    return `/api/storage/${key}`
  }
  return awsGetSignedUrl(
    client,
    command as Parameters<typeof awsGetSignedUrl>[1],
    options,
  )
}