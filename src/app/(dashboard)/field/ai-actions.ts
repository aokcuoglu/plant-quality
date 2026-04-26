"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { classifyFieldDefect } from "@/lib/ai/classify-field-defect"
import { findSimilarIssues } from "@/lib/ai/similar-issues"
import { isAiEnabled } from "@/lib/ai/provider"
import { revalidatePath } from "next/cache"
import { createHash } from "crypto"
import type { FieldDefectSeverity } from "@/generated/prisma/client"

function isOemEditor(role: string) {
  return role === "ADMIN" || role === "QUALITY_ENGINEER"
}

export async function generateClassification(fieldDefectId: string) {
  const session = await auth()
  if (!session?.user?.companyId || !isOemEditor(session.user.role) || session.user.companyType !== "OEM") {
    return { ok: false as const, error: "Unauthorized" }
  }

  if (!isAiEnabled()) {
    return { ok: false as const, error: "AI suggestions are not configured" }
  }

  if (session.user.plan !== "PRO") {
    return { ok: false as const, error: "AI features require a PRO plan" }
  }

  const fd = await prisma.fieldDefect.findFirst({
    where: { id: fieldDefectId, oemId: session.user.companyId, deletedAt: null },
  })
  if (!fd) {
    return { ok: false as const, error: "Field defect not found" }
  }

  const inputHash = createHash("sha256")
    .update(JSON.stringify({ title: fd.title, description: fd.description, partNumber: fd.partNumber, partName: fd.partName, vehicleModel: fd.vehicleModel, vin: fd.vin, severity: fd.severity }))
    .digest("hex")

  const existing = await prisma.aiSuggestion.findFirst({
    where: {
      fieldDefectId: fd.id,
      companyId: session.user.companyId,
      suggestionType: "CLASSIFICATION",
      status: "GENERATED",
      inputHash,
    },
    orderBy: { createdAt: "desc" },
  })

  if (existing) {
    return { ok: true as const, suggestionId: existing.id, classification: existing.resultJson as Record<string, unknown> }
  }

  const result = await classifyFieldDefect({
    title: fd.title,
    description: fd.description,
    partNumber: fd.partNumber,
    partName: fd.partName,
    vehicleModel: fd.vehicleModel,
    vin: fd.vin,
    severity: fd.severity,
    source: fd.source,
  })

  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }

  const suggestion = await prisma.aiSuggestion.create({
    data: {
      companyId: session.user.companyId,
      fieldDefectId: fd.id,
      suggestionType: "CLASSIFICATION",
      inputHash,
      resultJson: JSON.parse(JSON.stringify(result.classification)),
      confidence: result.classification.confidence,
      createdById: session.user.id,
    },
  })

  await prisma.fieldDefectEvent.create({
    data: {
      fieldDefectId: fd.id,
      type: "AI_CLASSIFICATION_GENERATED",
      actorId: session.user.id,
      metadata: { suggestionId: suggestion.id },
    },
  })

  revalidatePath(`/quality/oem/field/${fieldDefectId}`)
  return { ok: true as const, suggestionId: suggestion.id, classification: result.classification }
}

export async function generateSimilarIssues(fieldDefectId: string) {
  const session = await auth()
  if (!session?.user?.companyId || !isOemEditor(session.user.role) || session.user.companyType !== "OEM") {
    return { ok: false as const, error: "Unauthorized" }
  }

  const fd = await prisma.fieldDefect.findFirst({
    where: { id: fieldDefectId, oemId: session.user.companyId, deletedAt: null },
  })
  if (!fd) {
    return { ok: false as const, error: "Field defect not found" }
  }

  const similarIssues = await findSimilarIssues(session.user.companyId, fd.id, {
    title: fd.title,
    description: fd.description,
    partNumber: fd.partNumber,
    partName: fd.partName,
    vehicleModel: fd.vehicleModel,
    vin: fd.vin,
    supplierId: fd.supplierId,
  })

  const existing = await prisma.aiSuggestion.findFirst({
    where: {
      fieldDefectId: fd.id,
      companyId: session.user.companyId,
      suggestionType: "SIMILAR_ISSUES",
      status: "GENERATED",
    },
    orderBy: { createdAt: "desc" },
  })

  if (existing) {
    await prisma.aiSuggestion.update({
      where: { id: existing.id },
      data: { resultJson: JSON.parse(JSON.stringify(similarIssues)) },
    })
  } else {
    await prisma.aiSuggestion.create({
      data: {
        companyId: session.user.companyId,
        fieldDefectId: fd.id,
        suggestionType: "SIMILAR_ISSUES",
        resultJson: JSON.parse(JSON.stringify(similarIssues)),
        createdById: session.user.id,
      },
    })
  }

  revalidatePath(`/quality/oem/field/${fieldDefectId}`)
  return { ok: true as const, similarIssues }
}

export async function acceptSuggestion(suggestionId: string, fieldDefectId: string) {
  const session = await auth()
  if (!session?.user?.companyId || !isOemEditor(session.user.role) || session.user.companyType !== "OEM") {
    return { ok: false as const, error: "Unauthorized" }
  }

  const suggestion = await prisma.aiSuggestion.findFirst({
    where: {
      id: suggestionId,
      fieldDefectId,
      companyId: session.user.companyId,
      status: "GENERATED",
    },
  })

  if (!suggestion) {
    return { ok: false as const, error: "Suggestion not found or already processed" }
  }

  if (suggestion.suggestionType === "CLASSIFICATION") {
    const classification = suggestion.resultJson as Record<string, unknown>
    if (classification.suggestedSeverity && ["MINOR", "MAJOR", "CRITICAL"].includes(classification.suggestedSeverity as string)) {
      await prisma.fieldDefect.update({
        where: { id: fieldDefectId },
        data: { severity: classification.suggestedSeverity as FieldDefectSeverity },
      })
    }
  }

  await prisma.aiSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: "ACCEPTED",
      acceptedById: session.user.id,
      acceptedAt: new Date(),
    },
  })

  await prisma.fieldDefectEvent.create({
    data: {
      fieldDefectId,
      type: "AI_SUGGESTION_ACCEPTED",
      actorId: session.user.id,
      metadata: { suggestionId, suggestionType: suggestion.suggestionType },
    },
  })

  revalidatePath(`/quality/oem/field/${fieldDefectId}`)
  return { ok: true as const }
}

export async function rejectSuggestion(suggestionId: string, fieldDefectId: string) {
  const session = await auth()
  if (!session?.user?.companyId || !isOemEditor(session.user.role) || session.user.companyType !== "OEM") {
    return { ok: false as const, error: "Unauthorized" }
  }

  const suggestion = await prisma.aiSuggestion.findFirst({
    where: {
      id: suggestionId,
      fieldDefectId,
      companyId: session.user.companyId,
      status: "GENERATED",
    },
  })

  if (!suggestion) {
    return { ok: false as const, error: "Suggestion not found or already processed" }
  }

  await prisma.aiSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: "REJECTED",
      rejectedById: session.user.id,
      rejectedAt: new Date(),
    },
  })

  await prisma.fieldDefectEvent.create({
    data: {
      fieldDefectId,
      type: "AI_SUGGESTION_REJECTED",
      actorId: session.user.id,
      metadata: { suggestionId, suggestionType: suggestion.suggestionType },
    },
  })

  revalidatePath(`/quality/oem/field/${fieldDefectId}`)
  return { ok: true as const }
}

export async function getSuggestions(fieldDefectId: string) {
  const session = await auth()
  if (!session?.user?.companyId) {
    return []
  }

  const where: Record<string, unknown> =
    session.user.companyType === "OEM"
      ? { fieldDefectId, companyId: session.user.companyId }
      : { fieldDefectId, companyId: session.user.companyId }

  return prisma.aiSuggestion.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true, email: true } },
      acceptedBy: { select: { name: true, email: true } },
      rejectedBy: { select: { name: true, email: true } },
    },
  })
}

export async function checkAiConfig() {
  return { enabled: isAiEnabled() }
}