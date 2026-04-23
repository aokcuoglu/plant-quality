import { NextRequest, NextResponse } from "next/server"
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key")
  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 })
  }

  const url = await getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key }),
    { expiresIn: 3600 },
  )

  const imgRes = await fetch(url)
  if (!imgRes.ok) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 })
  }

  return new NextResponse(imgRes.body, {
    headers: {
      "Content-Type": imgRes.headers.get("content-type") ?? "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
