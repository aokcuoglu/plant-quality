import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const key = req.nextUrl.searchParams.get("key")
  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 })
  }

  let parentOwnerOk = false

  if (key.startsWith("defects/")) {
    const parts = key.split("/")
    if (parts.length >= 3) {
      const defect = await prisma.defect.findFirst({
        where: { id: parts[2] },
        select: { id: true, oemId: true, supplierId: true },
      })
      if (defect && (defect.oemId === session.user.companyId || defect.supplierId === session.user.companyId)) {
        parentOwnerOk = true
      }
    }
  } else if (key.startsWith("field-defects/")) {
    const parts = key.split("/")
    if (parts.length >= 2) {
      const fd = await prisma.fieldDefect.findFirst({
        where: { id: parts[1], deletedAt: null },
        select: { id: true, oemId: true, supplierId: true },
      })
      if (fd && (fd.oemId === session.user.companyId || fd.supplierId === session.user.companyId)) {
        parentOwnerOk = true
      }
    }
  } else if (key.startsWith("ppap/")) {
    const parts = key.split("/")
    if (parts.length >= 3) {
      const ppap = await prisma.ppapSubmission.findFirst({
        where: { id: parts[2] },
        select: { id: true, oemId: true, supplierId: true },
      })
      if (ppap && (ppap.oemId === session.user.companyId || ppap.supplierId === session.user.companyId)) {
        parentOwnerOk = true
      }
    }
  } else if (key.startsWith("iqc/")) {
    const parts = key.split("/")
    if (parts.length >= 3) {
      const iqc = await prisma.iqcReport.findFirst({
        where: { id: parts[2] },
        select: { id: true, oemId: true, supplierId: true },
      })
      if (iqc && (iqc.oemId === session.user.companyId || iqc.supplierId === session.user.companyId)) {
        parentOwnerOk = true
      }
    }
  } else if (key.startsWith("fmea/")) {
    const parts = key.split("/")
    if (parts.length >= 3) {
      const fmea = await prisma.fmea.findFirst({
        where: { id: parts[2] },
        select: { id: true, oemId: true, supplierId: true },
      })
      if (fmea && (fmea.oemId === session.user.companyId || fmea.supplierId === session.user.companyId)) {
        parentOwnerOk = true
      }
    }
  }

  if (!parentOwnerOk) {
    const attachment = await prisma.fieldDefectAttachment.findFirst({
      where: { storageKey: key, deletedAt: null },
      select: { fieldDefectId: true },
    })
    if (attachment) {
      const fd = await prisma.fieldDefect.findFirst({
        where: { id: attachment.fieldDefectId, deletedAt: null },
        select: { oemId: true, supplierId: true },
      })
      if (fd && (fd.oemId === session.user.companyId || fd.supplierId === session.user.companyId)) {
        parentOwnerOk = true
      }
    }
  }

  if (!parentOwnerOk) {
    const evidence = await prisma.defectEvidence.findFirst({
      where: { storageKey: key, deletedAt: null },
      select: { defectId: true },
    })
    if (evidence) {
      const defect = await prisma.defect.findFirst({
        where: { id: evidence.defectId },
        select: { oemId: true, supplierId: true },
      })
      if (defect && (defect.oemId === session.user.companyId || defect.supplierId === session.user.companyId)) {
        parentOwnerOk = true
      }
    }
  }

  if (!parentOwnerOk) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  try {
    const { Body, ContentType } = await s3Client.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
      }),
    )

    if (!Body) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    const bytes = await Body.transformToByteArray()
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": ContentType ?? "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 })
  }
}