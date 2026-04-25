import { S3Client } from "@aws-sdk/client-s3"

function env(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing env: ${name}`)
  return val
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

export const s3Client = new S3Client({
  region: "auto",
  endpoint: getS3Endpoint(),
  credentials: {
    accessKeyId: env("R2_ACCESS_KEY_ID"),
    secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
  },
  forcePathStyle: true,
})

export const S3_BUCKET_NAME = env("R2_BUCKET_NAME")
