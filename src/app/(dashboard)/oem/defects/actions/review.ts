"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import type { Prisma } from "@/generated/prisma/client"
import type { Session } from "next-auth"
import { addCalendarDays } from "@/lib/sla"
import { formatEvidenceSectionLabel } from "@/lib/evidence"
import { getMissingEvidenceForSubmission } from "@/lib/evidence-server"

function canReviewEightD(session: Session | null): session is Session {
  return Boolean(
    session &&
      session.user.companyType === "OEM" &&
      ["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role),
  )
}

async function logDefectEvent(
  defectId: string,
  type: "REVIEW_COMMENT_ADDED" | "REVIEW_COMMENT_RESOLVED" | "REVIEW_COMMENT_REOPENED" | "REVISION_REQUESTED" | "APPROVED",
  actorId: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.defectEvent.create({
    data: { defectId, type, actorId, metadata: metadata as Prisma.InputJsonValue | undefined },
  })
}

export async function addReviewComment(
  defectId: string,
  stepId: string,
  comment: string,
) {
  const session = await auth()
  if (!canReviewEightD(session)) {
    return { success: false as const, error: "Unauthorized" }
  }

  const defect = await prisma.defect.findFirst({
    where: { id: defectId, oemId: session.user.companyId },
    include: { eightDReport: true, supplier: { include: { users: { select: { id: true } } } } },
  })
  if (!defect || !defect.eightDReport) {
    return { success: false as const, error: "Report not found" }
  }

  const reviewComment = await prisma.reviewComment.create({
    data: {
      reportId: defect.eightDReport.id,
      stepId,
      comment,
      authorId: session.user.id!,
    },
  })

  if (defect.supplier.users.length > 0) {
    await prisma.notification.createMany({
      data: defect.supplier.users.map((user) => ({
        userId: user.id,
        message: `New review comment on defect #${defect.partNumber}`,
        type: "REVISION",
        link: `/supplier/defects/${defectId}`,
        isRead: false,
      })),
    })
  }

  await logDefectEvent(defectId, "REVIEW_COMMENT_ADDED", session.user.id, {
    commentId: reviewComment.id,
    stepId,
  })

  revalidatePath(`/oem/defects/${defectId}`)

  return { success: true as const }
}

export async function approveReport(defectId: string) {
  const session = await auth()
  if (!canReviewEightD(session)) {
    return { success: false as const, error: "Unauthorized" }
  }

  const defect = await prisma.defect.findFirst({
    where: { id: defectId, oemId: session.user.companyId, status: "WAITING_APPROVAL" },
    include: {
      supplier: { include: { users: { select: { id: true } } } },
      eightDReport: {
        select: {
          id: true,
          revisionNo: true,
          reviewComments: { where: { status: "OPEN" }, select: { id: true } },
        },
      },
    },
  })
  if (!defect || !defect.eightDReport) {
    return { success: false as const, error: "Defect not found or not awaiting approval" }
  }
  if (defect.eightDReport.reviewComments.length > 0) {
    return { success: false as const, error: "Resolve all open review comments before approval." }
  }

  const missingEvidenceSections = await getMissingEvidenceForSubmission(defectId)
  if (missingEvidenceSections.length > 0) {
    return {
      success: false as const,
      error: `Approval blocked. Missing required evidence: ${missingEvidenceSections.map(formatEvidenceSectionLabel).join(", ")}`,
    }
  }

  const reviewedAt = new Date()
  await Promise.all([
    prisma.defect.update({
      where: { id: defectId },
      data: { status: "RESOLVED", resolvedAt: reviewedAt, currentActionOwner: "NONE" },
    }),
    prisma.eightDReport.update({
      where: { id: defect.eightDReport.id },
      data: {
        lastReviewedAt: reviewedAt,
        approvedAt: reviewedAt,
        approvedById: session.user.id,
        rejectedAt: null,
        rejectedById: null,
      },
    }),
    defect.supplier.users.length > 0
      ? prisma.notification.createMany({
          data: defect.supplier.users.map((user) => ({
            userId: user.id,
            message: `Defect #${defect.partNumber} has been approved and resolved`,
            type: "INFO",
            link: `/supplier/defects/${defectId}`,
            isRead: false,
          })),
        })
      : Promise.resolve(),
  ])

  await logDefectEvent(defectId, "APPROVED", session.user.id, {
    previousStatus: defect.status,
    nextStatus: "RESOLVED",
    revisionNo: defect.eightDReport.revisionNo,
    currentActionOwner: "NONE",
  })

  revalidatePath(`/oem/defects/${defectId}`)
  revalidatePath("/oem")

  return { success: true as const }
}

export async function rejectReport(defectId: string) {
  const session = await auth()
  if (!canReviewEightD(session)) {
    return { success: false as const, error: "Unauthorized" }
  }

  const defect = await prisma.defect.findFirst({
    where: { id: defectId, oemId: session.user.companyId, status: "WAITING_APPROVAL" },
    include: {
      supplier: { include: { users: { select: { id: true } } } },
      eightDReport: {
        select: {
          id: true,
          revisionNo: true,
          reviewComments: { where: { status: "OPEN" }, select: { id: true } },
        },
      },
    },
  })
  if (!defect || !defect.eightDReport) {
    return { success: false as const, error: "Defect not found or not awaiting approval" }
  }
  if (defect.eightDReport.reviewComments.length === 0) {
    return { success: false as const, error: "Add at least one open review comment before requesting revision." }
  }

  const reviewedAt = new Date()
  await Promise.all([
    prisma.defect.update({
      where: { id: defectId },
      data: {
        status: "REJECTED",
        currentActionOwner: "SUPPLIER",
        revisionDueAt: addCalendarDays(reviewedAt, 5),
      },
    }),
    prisma.eightDReport.update({
      where: { id: defect.eightDReport.id },
      data: {
        lastReviewedAt: reviewedAt,
        rejectedAt: reviewedAt,
        rejectedById: session.user.id,
        approvedAt: null,
        approvedById: null,
      },
    }),
    defect.supplier.users.length > 0
      ? prisma.notification.createMany({
          data: defect.supplier.users.map((user) => ({
            userId: user.id,
            message: `Defect #${defect.partNumber} has been rejected and requires revision`,
            type: "REVISION",
            link: `/supplier/defects/${defectId}`,
            isRead: false,
          })),
        })
      : Promise.resolve(),
  ])

  await logDefectEvent(defectId, "REVISION_REQUESTED", session.user.id, {
    previousStatus: defect.status,
    nextStatus: "REJECTED",
    revisionNo: defect.eightDReport.revisionNo,
    openCommentCount: defect.eightDReport.reviewComments.length,
    currentActionOwner: "SUPPLIER",
    revisionDueAt: addCalendarDays(reviewedAt, 5).toISOString(),
  })

  revalidatePath(`/oem/defects/${defectId}`)
  revalidatePath("/oem")

  return { success: true as const }
}

export async function resolveReviewComment(commentId: string) {
  const session = await auth()
  if (!canReviewEightD(session)) {
    return { success: false as const, error: "Unauthorized" }
  }

  const comment = await prisma.reviewComment.findFirst({
    where: {
      id: commentId,
      report: { defect: { oemId: session.user.companyId } },
    },
    include: { report: { select: { defectId: true } } },
  })
  if (!comment) {
    return { success: false as const, error: "Comment not found" }
  }

  await prisma.reviewComment.update({
    where: { id: commentId },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      resolvedById: session.user.id,
    },
  })

  await logDefectEvent(comment.report.defectId, "REVIEW_COMMENT_RESOLVED", session.user.id, {
    commentId,
    stepId: comment.stepId,
  })

  revalidatePath(`/oem/defects/${comment.report.defectId}`)
  return { success: true as const }
}

export async function reopenReviewComment(commentId: string) {
  const session = await auth()
  if (!canReviewEightD(session)) {
    return { success: false as const, error: "Unauthorized" }
  }

  const comment = await prisma.reviewComment.findFirst({
    where: {
      id: commentId,
      report: { defect: { oemId: session.user.companyId } },
    },
    include: { report: { select: { defectId: true } } },
  })
  if (!comment) {
    return { success: false as const, error: "Comment not found" }
  }

  await prisma.reviewComment.update({
    where: { id: commentId },
    data: {
      status: "OPEN",
      resolvedAt: null,
      resolvedById: null,
    },
  })

  await logDefectEvent(comment.report.defectId, "REVIEW_COMMENT_REOPENED", session.user.id, {
    commentId,
    stepId: comment.stepId,
  })

  revalidatePath(`/oem/defects/${comment.report.defectId}`)
  return { success: true as const }
}
