import { NextRequest, NextResponse } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { S3_BUCKET_NAME, s3Client } from "@/lib/s3"
import { canUserAccessDefectEvidence } from "@/lib/evidence-server"

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const evidence = await prisma.defectEvidence.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      defectId: true,
      storageKey: true,
      fileName: true,
      mimeType: true,
      companyId: true,
    },
  })
  if (!evidence) {
    return NextResponse.json({ error: "Evidence not found" }, { status: 404 })
  }

  const access = await canUserAccessDefectEvidence(session, evidence.defectId, "read")
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: 403 })

  try {
    const { Body, ContentType } = await s3Client.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: evidence.storageKey,
      }),
    )
    if (!Body) return NextResponse.json({ error: "Evidence not found" }, { status: 404 })

    const bytes = await Body.transformToByteArray()
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": ContentType ?? evidence.mimeType ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(evidence.fileName)}"`,
        "Cache-Control": "private, max-age=60",
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch evidence" }, { status: 500 })
  }
}
