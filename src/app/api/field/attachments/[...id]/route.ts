import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string[] }> },
) {
  const session = await auth()
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const storageKey = id.join("/")

  if (!storageKey.startsWith("field-defects/")) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 })
  }

  const attachment = await prisma.fieldDefectAttachment.findFirst({
    where: { storageKey, deletedAt: null },
  })

  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
  }

  const fieldDefect = await prisma.fieldDefect.findFirst({
    where: {
      id: attachment.fieldDefectId,
      deletedAt: null,
      OR: [
        { oemId: session.user.companyId },
        { supplierId: session.user.companyId },
      ],
    },
  })
  if (!fieldDefect) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  const command = new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: attachment.storageKey })
  try {
    const response = await s3Client.send(command)
    const body = await response.Body?.transformToByteArray()
    if (!body) return NextResponse.json({ error: "Empty response" }, { status: 500 })
    const headers = new Headers()
    headers.set("Content-Type", attachment.mimeType || "application/octet-stream")
    headers.set("Content-Disposition", `inline; filename="${attachment.fileName}"`)
    headers.set("Cache-Control", "private, max-age=86400")
    return new NextResponse(Buffer.from(body), { headers })
  } catch {
    return NextResponse.json({ error: "File not found in storage" }, { status: 404 })
  }
}