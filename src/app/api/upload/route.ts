import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { s3Client, S3_BUCKET_NAME, S3_PUBLIC_URL } from "@/lib/s3"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { randomUUID } from "crypto"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 })
  }

  const ext = file.name.split(".").pop() ?? "bin"
  const key = `defects/${session.user.companyId}/${randomUUID()}.${ext}`

  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type,
    }),
  )

  const publicUrl = `${S3_PUBLIC_URL}/${key}`

  return NextResponse.json({ key, publicUrl })
}
