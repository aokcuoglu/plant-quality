import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getSignedUrl, s3Client, S3_BUCKET_NAME } from "@/lib/s3"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { randomUUID } from "crypto"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { fileName, contentType } = await req.json()
  if (!fileName || !contentType) {
    return NextResponse.json({ error: "fileName and contentType are required" }, { status: 400 })
  }

  const ext = fileName.split(".").pop() ?? "bin"
  const key = `defects/${session.user.companyId}/${randomUUID()}.${ext}`

  const uploadUrl = await getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 300 },
  )

  return NextResponse.json({ key, uploadUrl })
}
