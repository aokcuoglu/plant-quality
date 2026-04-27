"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { reviewEightD, type Ai8dReviewResult, type EightDCompletenessResult } from "@/lib/ai/review-8d"
import { suggestRootCause, type RootCauseSuggestion } from "@/lib/ai/root-cause-suggestion"
import { isAiEnabled } from "@/lib/ai/provider"
import { validateEightDCompleteness } from "@/lib/ai/validate-8d-completeness"
import { revalidatePath } from "next/cache"
import type { Prisma } from "@/generated/prisma/client"
import type { Session } from "next-auth"

function canReviewAi(session: Session | null): session is Session {
  return Boolean(
    session &&
      session.user.companyType === "OEM" &&
      ["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role),
  )
}

function canViewAiReview(session: Session | null): session is Session {
  return Boolean(
    session &&
      session.user.companyType === "OEM",
  )
}

async function logDefectEvent(
  defectId: string,
  type: "AI_8D_REVIEW_GENERATED" | "AI_8D_REVIEW_MARKED_REVIEWED" | "AI_8D_REVIEW_REJECTED" | "AI_ROOT_CAUSE_SUGGESTED",
  actorId: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.defectEvent.create({
    data: { defectId, type, actorId, metadata: metadata as Prisma.InputJsonValue | undefined },
  })
}

export async function generateAi8dReview(defectId: string) {
  const session = await auth()
  if (!canReviewAi(session)) {
    return { success: false as const, error: "Unauthorized" }
  }

  if (!isAiEnabled()) {
    return { success: false as const, error: "AI suggestions are not configured" }
  }

  if (session.user.plan !== "PRO") {
    return { success: false as const, error: "AI features require a PRO plan" }
  }

  const defect = await prisma.defect.findFirst({
    where: { id: defectId, oemId: session.user.companyId },
    include: {
      eightDReport: {
        include: {
          reviewComments: {
            include: { author: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      supplier: { select: { name: true } },
      linkedFieldDefect: {
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          subcategory: true,
          probableArea: true,
        },
      },
    },
  })

  if (!defect) {
    return { success: false as const, error: "Defect not found" }
  }

  if (!defect.eightDReport) {
    const deterministic = validateEightDCompleteness({
      team: null,
      d2_problem: null,
      containmentActions: null,
      d4_rootCause: null,
      d5Actions: null,
      d6Actions: null,
      d7Preventive: null,
      d7Impacts: null,
      d8_recognition: null,
    })
    return { success: false as const, error: "No 8D report found", deterministic }
  }

  const report = defect.eightDReport

  const result = await reviewEightD({
    defectDescription: defect.description,
    partNumber: defect.partNumber,
    supplierName: defect.supplier.name,
    report: {
      team: report.team,
      d2_problem: report.d2_problem,
      containmentActions: report.containmentActions,
      d4_rootCause: report.d4_rootCause,
      d5Actions: report.d5Actions,
      d6Actions: report.d6Actions,
      d7Preventive: report.d7Preventive,
      d7Impacts: report.d7Impacts,
      d8_recognition: report.d8_recognition,
    },
    reviewComments: report.reviewComments.map((c) => ({
      stepId: c.stepId,
      comment: c.comment,
      supplierResponse: c.supplierResponse,
    })),
  })

  if (!result.ok) {
    return { success: false as const, error: result.error }
  }

  const ai8dReview = await prisma.ai8dReview.create({
    data: {
      companyId: session.user.companyId,
      eightDId: report.id,
      linkedFieldDefectId: defect.linkedFieldDefect?.id ?? null,
      resultJson: result.review as unknown as Prisma.InputJsonValue,
      status: "GENERATED",
      score: result.review.overallScore,
      createdById: session.user.id,
    },
  })

  await logDefectEvent(defectId, "AI_8D_REVIEW_GENERATED", session.user.id, {
    reviewId: ai8dReview.id,
    score: result.review.overallScore,
    reviewStatus: result.review.reviewStatus,
  })

  revalidatePath(`/quality/oem/defects/${defectId}`)

  return {
    success: true as const,
    reviewId: ai8dReview.id,
    review: result.review,
    deterministicCompleteness: result.deterministicCompleteness,
  }
}

export async function generateRootCauseSuggestion(defectId: string) {
  const session = await auth()
  if (!canReviewAi(session)) {
    return { success: false as const, error: "Unauthorized" }
  }

  if (!isAiEnabled()) {
    return { success: false as const, error: "AI suggestions are not configured" }
  }

  if (session.user.plan !== "PRO") {
    return { success: false as const, error: "AI features require a PRO plan" }
  }

  const defect = await prisma.defect.findFirst({
    where: { id: defectId, oemId: session.user.companyId },
    include: {
      eightDReport: true,
      supplier: { select: { name: true } },
      linkedFieldDefect: {
        select: {
          title: true,
          description: true,
          category: true,
          subcategory: true,
          probableArea: true,
        },
      },
    },
  })

  if (!defect) {
    return { success: false as const, error: "Defect not found" }
  }

  const report = defect.eightDReport

  const result = await suggestRootCause({
    defectDescription: defect.description,
    partNumber: defect.partNumber,
    supplierName: defect.supplier.name,
    d2Problem: report?.d2_problem ?? null,
    d4RootCause: report?.d4_rootCause ?? null,
    containmentActions: report?.containmentActions,
    category: defect.linkedFieldDefect?.category ?? null,
    subcategory: defect.linkedFieldDefect?.subcategory ?? null,
    probableArea: defect.linkedFieldDefect?.probableArea ?? null,
    fieldDefectTitle: defect.linkedFieldDefect?.title ?? null,
    fieldDefectDescription: defect.linkedFieldDefect?.description ?? null,
  })

  if (!result.ok) {
    return { success: false as const, error: result.error }
  }

  await logDefectEvent(defectId, "AI_ROOT_CAUSE_SUGGESTED", session.user.id, {
    confidence: result.suggestion.confidence,
  })

  revalidatePath(`/quality/oem/defects/${defectId}`)

  return {
    success: true as const,
    suggestion: result.suggestion,
  }
}

export async function markAi8dReviewAsReviewed(reviewId: string) {
  const session = await auth()
  if (!canReviewAi(session)) {
    return { success: false as const, error: "Unauthorized" }
  }

  if (session.user.plan !== "PRO") {
    return { success: false as const, error: "AI features require a PRO plan" }
  }

  const review = await prisma.ai8dReview.findFirst({
    where: { id: reviewId, companyId: session.user.companyId, status: "GENERATED" },
    include: { eightDReport: { select: { defectId: true } } },
  })

  if (!review) {
    return { success: false as const, error: "Review not found or already processed" }
  }

  await prisma.ai8dReview.update({
    where: { id: reviewId, companyId: session.user.companyId },
    data: {
      status: "REVIEWED",
      reviewedById: session.user.id,
      reviewedAt: new Date(),
    },
  })

  await logDefectEvent(review.eightDReport.defectId, "AI_8D_REVIEW_MARKED_REVIEWED", session.user.id, {
    reviewId,
  })

  revalidatePath(`/quality/oem/defects/${review.eightDReport.defectId}`)

  return { success: true as const }
}

export async function rejectAi8dReview(reviewId: string) {
  const session = await auth()
  if (!canReviewAi(session)) {
    return { success: false as const, error: "Unauthorized" }
  }

  if (session.user.plan !== "PRO") {
    return { success: false as const, error: "AI features require a PRO plan" }
  }

  const review = await prisma.ai8dReview.findFirst({
    where: { id: reviewId, companyId: session.user.companyId, status: "GENERATED" },
    include: { eightDReport: { select: { defectId: true } } },
  })

  if (!review) {
    return { success: false as const, error: "Review not found or already processed" }
  }

  await prisma.ai8dReview.update({
    where: { id: reviewId, companyId: session.user.companyId },
    data: {
      status: "REJECTED",
      rejectedById: session.user.id,
      rejectedAt: new Date(),
    },
  })

  await logDefectEvent(review.eightDReport.defectId, "AI_8D_REVIEW_REJECTED", session.user.id, {
    reviewId,
  })

  revalidatePath(`/quality/oem/defects/${review.eightDReport.defectId}`)

  return { success: true as const }
}

export async function getAi8dReviews(eightDId: string) {
  const session = await auth()
  if (!canViewAiReview(session)) {
    return []
  }

  const report = await prisma.eightDReport.findFirst({
    where: { id: eightDId, defect: { oemId: session.user.companyId } },
    select: { id: true },
  })

  if (!report) return []

  return prisma.ai8dReview.findMany({
    where: { eightDId, companyId: session.user.companyId },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
      rejectedBy: { select: { name: true, email: true } },
    },
  })
}

export async function getLatestAi8dReview(defectId: string) {
  const session = await auth()
  if (!canViewAiReview(session)) {
    return null
  }

  const defect = await prisma.defect.findFirst({
    where: { id: defectId, oemId: session.user.companyId },
    include: { eightDReport: true },
  })

  if (!defect?.eightDReport) return null

  const latestReview = await prisma.ai8dReview.findFirst({
    where: { eightDId: defect.eightDReport.id, companyId: session.user.companyId },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
      rejectedBy: { select: { name: true, email: true } },
    },
  })

  return latestReview
}

export type { Ai8dReviewResult, EightDCompletenessResult, RootCauseSuggestion }