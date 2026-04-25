import { NextRequest, NextResponse } from "next/server"
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { S3_BUCKET_NAME, s3Client } from "@/lib/s3"
import {
  EVIDENCE_SECTIONS,
  MAX_EVIDENCE_FILES_PER_SECTION,
  buildEvidenceStorageKey,
  validateEvidenceFile,
} from "@/lib/evidence"
import { canUserAccessDefectEvidence } from "@/lib/evidence-server"
import type { EightDSection, Prisma } from "@/generated/prisma/client"

function isEvidenceSection(value: string): value is EightDSection {
  return EVIDENCE_SECTIONS.includes(value as EightDSection)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const formData = await req.formData()

  const defectId = String(formData.get("defectId") ?? "")
  const sectionRaw = String(formData.get("section") ?? "")
  const file = formData.get("file")

  if (!defectId || !sectionRaw || !(file instanceof File)) {
    return NextResponse.json({ error: "defectId, section and file are required" }, { status: 400 })
  }
  if (!isEvidenceSection(sectionRaw)) {
    return NextResponse.json({ error: "Invalid evidence section" }, { status: 400 })
  }

  const access = await canUserAccessDefectEvidence(session, defectId, "write")
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: 403 })

  const validation = validateEvidenceFile(file)
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })

  const existingCount = await prisma.defectEvidence.count({
    where: { defectId, section: sectionRaw, deletedAt: null },
  })
  if (existingCount >= MAX_EVIDENCE_FILES_PER_SECTION) {
    return NextResponse.json(
      { error: `Maximum ${MAX_EVIDENCE_FILES_PER_SECTION} files are allowed for ${sectionRaw}.` },
      { status: 400 },
    )
  }

  const key = buildEvidenceStorageKey(defectId, sectionRaw, file.name)
  const bytes = await file.arrayBuffer()

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: Buffer.from(bytes),
        ContentType: file.type,
      }),
    )
  } catch (err) {
    console.error("S3 upload failed:", err)
    return NextResponse.json({ error: "File storage upload failed. Please try again." }, { status: 502 })
  }

  const evidence = await prisma.defectEvidence.create({
    data: {
      defectId,
      section: sectionRaw,
      storageKey: key,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      uploadedById: session.user.id,
      companyId: session.user.companyId,
    },
    select: {
      id: true,
      section: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      uploadedBy: { select: { name: true, email: true } },
      createdAt: true,
    },
  })

  await prisma.defectEvent.create({
    data: {
      defectId,
      type: "EVIDENCE_ADDED",
      actorId: session.user.id,
      metadata: {
        evidenceId: evidence.id,
        section: evidence.section,
        fileName: evidence.fileName,
        mimeType: evidence.mimeType,
        sizeBytes: evidence.sizeBytes,
      } as Prisma.InputJsonValue,
    },
  })

  return NextResponse.json({
    evidence: {
      ...evidence,
      uploaderName: evidence.uploadedBy.name ?? evidence.uploadedBy.email,
      downloadUrl: `/api/defects/evidence/${evidence.id}`,
      canRemove: true,
    },
  })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { evidenceId } = await req.json()
  if (!evidenceId || typeof evidenceId !== "string") {
    return NextResponse.json({ error: "evidenceId is required" }, { status: 400 })
  }

  const evidence = await prisma.defectEvidence.findFirst({
    where: { id: evidenceId, deletedAt: null },
    include: { defect: { select: { id: true } } },
  })
  if (!evidence) {
    return NextResponse.json({ error: "Evidence not found" }, { status: 404 })
  }

  const access = await canUserAccessDefectEvidence(session, evidence.defectId, "write")
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: 403 })
  if (evidence.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  await prisma.defectEvidence.update({
    where: { id: evidenceId },
    data: { deletedAt: new Date() },
  })

  await prisma.defectEvent.create({
    data: {
      defectId: evidence.defectId,
      type: "EVIDENCE_REMOVED",
      actorId: session.user.id,
      metadata: {
        evidenceId: evidence.id,
        section: evidence.section,
        fileName: evidence.fileName,
        mimeType: evidence.mimeType,
        sizeBytes: evidence.sizeBytes,
      } as Prisma.InputJsonValue,
    },
  })

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: evidence.storageKey,
      }),
    )
  } catch {
    // Soft delete in database is the source of truth; storage delete is best effort.
  }

  return NextResponse.json({ success: true })
}
