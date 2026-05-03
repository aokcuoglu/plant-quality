"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireFeature } from "@/lib/billing/guards"
import type { QualityRecordType, QualityLinkType } from "@/generated/prisma/client"
import { revalidatePath } from "next/cache"

async function getSessionOrRedirect() {
  const session = await auth()
  if (!session?.user?.companyId) {
    return { error: "Unauthorized" }
  }
  if (session.user.companyType !== "OEM") {
    return { error: "Only OEM users can create manual links" }
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "QUALITY_ENGINEER") {
    return { error: "Only Admin or Quality Engineer can create manual links" }
  }
  const featureCheck = requireFeature(session, "QUALITY_LINKAGE")
  if (!featureCheck.allowed) {
    return { error: featureCheck.reason ?? "Quality Linkage feature not available" }
  }
  return { session }
}

interface CreateManualLinkInput {
  sourceType: QualityRecordType
  sourceId: string
  targetType: QualityRecordType
  targetId: string
  linkType: QualityLinkType
  reason?: string
}

export async function createManualQualityLink(input: CreateManualLinkInput) {
  const result = await getSessionOrRedirect()
  if ("error" in result) return { error: result.error }
  const { session } = result
  const companyId = session.user.companyId!

  if (input.sourceType === input.targetType && input.sourceId === input.targetId) {
    return { error: "Cannot link a record to itself" }
  }

  const validLinkTypes: QualityLinkType[] = ["MANUAL", "SAME_PART", "SAME_SUPPLIER", "SAME_FAILURE_MODE", "SAME_VEHICLE", "PPAP_REFERENCE", "FMEA_COVERAGE", "RELATED_HISTORY"]
  if (!validLinkTypes.includes(input.linkType)) {
    return { error: "Invalid link type for manual creation" }
  }

  const sourceValid = await verifyRecordBelongsToCompany(input.sourceType, input.sourceId, companyId)
  if (!sourceValid) return { error: "Source record not found or not accessible" }

  const targetValid = await verifyRecordBelongsToCompany(input.targetType, input.targetId, companyId)
  if (!targetValid) return { error: "Target record not found or not accessible" }

  const existing = await prisma.qualityRecordLink.findFirst({
    where: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      targetType: input.targetType,
      targetId: input.targetId,
      linkType: input.linkType,
    },
  })
  if (existing) return { error: "This link already exists" }

  const reverseExisting = await prisma.qualityRecordLink.findFirst({
    where: {
      sourceType: input.targetType,
      sourceId: input.targetId,
      targetType: input.sourceType,
      targetId: input.sourceId,
      linkType: input.linkType,
    },
  })
  if (reverseExisting) return { error: "A reverse link already exists" }

  const link = await prisma.qualityRecordLink.create({
    data: {
      companyId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      targetType: input.targetType,
      targetId: input.targetId,
      linkType: input.linkType,
      reason: input.reason,
      createdById: session.user.id!,
    },
  })

  await revalidateRelatedPaths(input.sourceType, input.sourceId, input.targetType, input.targetId)

  return { ok: true, linkId: link.id }
}

export async function removeManualQualityLink(linkId: string) {
  const result = await getSessionOrRedirect()
  if ("error" in result) return { error: result.error }
  const { session } = result
  const companyId = session.user.companyId!

  const link = await prisma.qualityRecordLink.findFirst({
    where: { id: linkId, companyId },
  })
  if (!link) return { error: "Link not found or not accessible" }

  await prisma.qualityRecordLink.delete({ where: { id: linkId } })

  await revalidateRelatedPaths(link.sourceType, link.sourceId, link.targetType, link.targetId)

  return { ok: true }
}

async function verifyRecordBelongsToCompany(
  recordType: QualityRecordType,
  recordId: string,
  companyId: string,
): Promise<boolean> {
  switch (recordType) {
    case "FIELD_DEFECT": {
      const count = await prisma.fieldDefect.count({ where: { id: recordId, oemId: companyId, deletedAt: null } })
      return count > 0
    }
    case "DEFECT":
    case "EIGHT_D": {
      const count = await prisma.defect.count({ where: { id: recordId, oemId: companyId } })
      return count > 0
    }
    case "PPAP": {
      const count = await prisma.ppapSubmission.count({ where: { id: recordId, oemId: companyId } })
      return count > 0
    }
    case "IQC": {
      const count = await prisma.iqcReport.count({ where: { id: recordId, oemId: companyId } })
      return count > 0
    }
    case "FMEA": {
      const count = await prisma.fmea.count({ where: { id: recordId, oemId: companyId } })
      return count > 0
    }
  }
}

async function revalidateRelatedPaths(
  sourceType: QualityRecordType,
  sourceId: string,
  targetType: QualityRecordType,
  targetId: string,
) {
  const paths = new Set<string>()
  for (const [type, id] of [[sourceType, sourceId], [targetType, targetId]] as const) {
    switch (type) {
      case "FIELD_DEFECT":
        paths.add(`/quality/oem/field/${id}`)
        break
      case "DEFECT":
      case "EIGHT_D":
        paths.add(`/quality/oem/defects/${id}`)
        break
      case "PPAP":
        paths.add(`/quality/oem/ppap/${id}`)
        break
      case "IQC":
        paths.add(`/quality/oem/iqc/${id}`)
        break
      case "FMEA":
        paths.add(`/quality/oem/fmea/${id}`)
        break
    }
  }
  for (const p of paths) {
    revalidatePath(p)
  }
  revalidatePath("/quality/oem/field")
  revalidatePath("/quality/oem/defects")
  revalidatePath("/quality/oem/ppap")
  revalidatePath("/quality/oem/iqc")
  revalidatePath("/quality/oem/fmea")
  revalidatePath("/quality/supplier/field")
  revalidatePath("/quality/supplier/defects")
  revalidatePath("/quality/supplier/ppap")
  revalidatePath("/quality/supplier/iqc")
  revalidatePath("/quality/supplier/fmea")
}