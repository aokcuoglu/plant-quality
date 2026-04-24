import { S3Client } from "@aws-sdk/client-s3"

function env(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing env: ${name}`)
  return val
}

function isMinIO(): boolean {
  const endpoint = process.env.R2_PUBLIC_URL || ""
  return endpoint.includes("orb.local") || endpoint.includes("minio")
}

const accountId = env("R2_ACCOUNT_ID")

export const s3Client = new S3Client({
  region: "auto",
  endpoint: isMinIO()
    ? "https://s3.plantquality.orb.local"
    : `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env("R2_ACCESS_KEY_ID"),
    secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
  },
  forcePathStyle: true,
})

export const S3_BUCKET_NAME = env("R2_BUCKET_NAME")
