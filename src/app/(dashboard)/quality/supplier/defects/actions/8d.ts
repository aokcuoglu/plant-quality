"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import type { DefectStatus, Prisma } from "@/generated/prisma/client"
import type { Session } from "next-auth"
import { addCalendarDays } from "@/lib/sla"
import { formatEvidenceSectionLabel } from "@/lib/evidence"
import { getMissingEvidenceForSubmission } from "@/lib/evidence-server"

export interface TeamMember {
  id: string
  userId: string
  userName: string
  role: "champion" | "teamLeader" | "member"
}

export interface ContainmentAction {
  id: string
  description: string
  responsibleUserId: string
  responsibleName: string
  effectiveness: number
  targetDate: string
  actualDate: string
}

export interface RootCauseEntry {
  id: string
  cause: string
  contribution: number
}

export interface D5Action {
  id: string
  action: string
  verificationMethod: string
  effectiveness: number
}

export interface D6Action {
  id: string
  actionId: string
  actionDescription: string
  targetDate: string
  actualDate: string
  validatedByUserId: string
  validatedByName: string
}

export interface D7Impact {
  id: string
  documentType: string
  revisionNo: string
}

const ALLOWED_FIELDS = new Set([
  "d2_problem",
  "d4_rootCause",
  "d5_d6_action",
  "d8_recognition",
])

const SUPPLIER_EDIT_STATUSES: DefectStatus[] = ["OPEN", "IN_PROGRESS", "REJECTED"]

function canSubmitEightD(session: Session | null): session is Session {
  return Boolean(
    session &&
      session.user.companyType === "SUPPLIER" &&
      ["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role),
  )
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
}

function hasArrayItem<T extends object>(
  value: unknown,
  predicate: (item: T) => boolean,
) {
  return Array.isArray(value) && value.some((item) => item && typeof item === "object" && predicate(item as T))
}

function validateEightDReport(report: {
  team: unknown
  containmentActions: unknown
  d5Actions: unknown
  d6Actions: unknown
  d7Impacts: unknown
  d7Preventive: string | null
  d2_problem: string | null
  d4_rootCause: string | null
  d8_recognition: string | null
}) {
  const missing: string[] = []

  if (!hasArrayItem<TeamMember>(report.team, (m) => hasText(m.userId) && hasText(m.userName))) missing.push("D1 Team")
  if (!hasText(report.d2_problem)) missing.push("D2 Problem Description")
  if (!hasArrayItem<ContainmentAction>(report.containmentActions, (a) => hasText(a.description))) missing.push("D3 Containment Actions")
  if (!hasText(report.d4_rootCause)) missing.push("D4 Root Cause Analysis")
  if (!hasArrayItem<D5Action>(report.d5Actions, (a) => hasText(a.action) && hasText(a.verificationMethod))) missing.push("D5 Corrective Actions")
  if (!hasArrayItem<D6Action>(report.d6Actions, (a) => hasText(a.actionId) && hasText(a.targetDate) && hasText(a.validatedByUserId))) missing.push("D6 Validation")
  if (!hasText(report.d7Preventive)) missing.push("D7 Preventive Actions")
  if (!hasText(report.d8_recognition)) missing.push("D8 Recognition & Closure")

  return missing
}

async function logDefectEvent(
  defectId: string,
  type: "EIGHT_D_STARTED" | "EIGHT_D_STEP_SAVED" | "EIGHT_D_SUBMITTED" | "REVIEW_COMMENT_RESPONDED",
  actorId: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.defectEvent.create({
    data: { defectId, type, actorId, metadata: metadata as Prisma.InputJsonValue | undefined },
  })
}

export async function saveEightDStep(defectId: string, data: Record<string, unknown>) {
  const session = await auth()
  if (!canSubmitEightD(session)) {
    return { success: false as const, error: "Unauthorized" }
  }

  const defect = await prisma.defect.findFirst({
    where: { id: defectId, supplierId: session.user.companyId },
  })
  if (!defect) {
    return { success: false as const, error: "Defect not found" }
  }
  if (!SUPPLIER_EDIT_STATUSES.includes(defect.status)) {
    return { success: false as const, error: "This report is locked while awaiting customer review or after approval." }
  }

  const scalarData: Record<string, string> = {}
  const structuredData: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (ALLOWED_FIELDS.has(key)) {
      scalarData[key] = String(value ?? "")
    } else if (key.startsWith("d1_") || key.startsWith("d3_") || key.startsWith("d5_") || key.startsWith("d6_") || key.startsWith("d7_")) {
      structuredData[key] = value
    }
  }

  const dbUpdate: Record<string, unknown> = { ...scalarData }

  if (structuredData["d1_team"] !== undefined) dbUpdate["team"] = structuredData["d1_team"]
  if (structuredData["d3_containmentActions"] !== undefined) dbUpdate["containmentActions"] = structuredData["d3_containmentActions"]
  if (structuredData["d5_actions"] !== undefined) dbUpdate["d5Actions"] = structuredData["d5_actions"]
  if (structuredData["d6_actions"] !== undefined) dbUpdate["d6Actions"] = structuredData["d6_actions"]
  if (structuredData["d7_impacts"] !== undefined) dbUpdate["d7Impacts"] = structuredData["d7_impacts"]
  if (structuredData["d7_preventive"] !== undefined) dbUpdate["d7Preventive"] = structuredData["d7_preventive"]

  const wasDraft = defect.status === "OPEN" || defect.status === "REJECTED"

  await prisma.eightDReport.upsert({
    where: { defectId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: { defectId, ...dbUpdate } as any,
    update: dbUpdate,
  })

  const eightDSubmissionDueAt = defect.eightDSubmissionDueAt ?? defect.supplierResponseDueAt ?? addCalendarDays(defect.createdAt, 7)

  if (wasDraft) {
    await prisma.defect.update({
      where: { id: defectId },
      data: {
        status: "IN_PROGRESS",
        currentActionOwner: "SUPPLIER",
        eightDSubmissionDueAt,
      },
    })
    await logDefectEvent(defectId, "EIGHT_D_STARTED", session.user.id, {
      previousStatus: defect.status,
      nextStatus: "IN_PROGRESS",
      currentActionOwner: "SUPPLIER",
      eightDSubmissionDueAt: eightDSubmissionDueAt.toISOString(),
    })
  } else if (!defect.eightDSubmissionDueAt) {
    await prisma.defect.update({
      where: { id: defectId },
      data: { eightDSubmissionDueAt },
    })
    await logDefectEvent(defectId, "EIGHT_D_STEP_SAVED", session.user.id, {
      initializedEightDSubmissionDueAt: eightDSubmissionDueAt.toISOString(),
    })
  }

  await logDefectEvent(defectId, "EIGHT_D_STEP_SAVED", session.user.id, {
    keys: Object.keys(data),
  })

  revalidatePath(`/quality/supplier/defects/${defectId}/8d`)

  return { success: true as const }
}

export async function submitEightDReport(defectId: string) {
  const session = await auth()
  if (!canSubmitEightD(session)) {
    return { success: false as const, error: "Unauthorized" }
  }

  const defect = await prisma.defect.findFirst({
    where: { id: defectId, supplierId: session.user.companyId },
    include: { eightDReport: true },
  })
  if (!defect) {
    return { success: false as const, error: "Defect not found" }
  }
  if (!SUPPLIER_EDIT_STATUSES.includes(defect.status)) {
    return { success: false as const, error: "This report cannot be submitted in its current status." }
  }

  if (!defect.eightDReport) {
    return { success: false as const, error: "No 8D report data found" }
  }

  const missing = validateEightDReport(defect.eightDReport)
  if (missing.length > 0) {
    return {
      success: false as const,
      error: `Complete the following sections before submitting: ${missing.join(", ")}`,
    }
  }

  const missingEvidenceSections = await getMissingEvidenceForSubmission(defectId)
  if (missingEvidenceSections.length > 0) {
    return {
      success: false as const,
      error: `Add required evidence before submitting: ${missingEvidenceSections.map(formatEvidenceSectionLabel).join(", ")}`,
    }
  }

  const nextRevisionNo = defect.eightDReport.revisionNo + 1

  await prisma.eightDReport.update({
    where: { defectId },
    data: {
      submittedAt: defect.eightDReport.submittedAt ?? new Date(),
      lastSubmittedAt: new Date(),
      revisionNo: nextRevisionNo,
    },
  })

  const updatedDefect = await prisma.defect.update({
    where: { id: defectId },
    data: {
      status: "WAITING_APPROVAL",
      currentActionOwner: "OEM",
      oemReviewDueAt: addCalendarDays(new Date(), 3),
    },
    include: { oem: { include: { users: { select: { id: true } } } } },
  })

  if (updatedDefect.oem.users.length > 0) {
    await prisma.notification.createMany({
      data: updatedDefect.oem.users.map((user) => ({
        userId: user.id,
        companyId: updatedDefect.oemId,
        message: `8D Report submitted for defect #${defect.partNumber} — ready for review`,
        type: "INFO",
        link: `/quality/oem/defects/${defectId}`,
        isRead: false,
      })),
    })
  }

  await logDefectEvent(defectId, "EIGHT_D_SUBMITTED", session.user.id, {
    previousStatus: defect.status,
    nextStatus: "WAITING_APPROVAL",
    revisionNo: nextRevisionNo,
    currentActionOwner: "OEM",
    oemReviewDueAt: updatedDefect.oemReviewDueAt?.toISOString() ?? null,
  })

  revalidatePath(`/quality/supplier/defects/${defectId}/8d`)
  revalidatePath(`/quality/supplier/defects/${defectId}`)
  revalidatePath("/quality/supplier")

  return { success: true as const }
}

export async function respondToReviewComment(commentId: string, response: string) {
  const session = await auth()
  if (!canSubmitEightD(session)) {
    return { success: false as const, error: "Unauthorized" }
  }

  const trimmed = response.trim()
  if (!trimmed) {
    return { success: false as const, error: "Response is required" }
  }

  const comment = await prisma.reviewComment.findFirst({
    where: {
      id: commentId,
      report: {
        defect: { supplierId: session.user.companyId },
      },
    },
    include: { report: { select: { defectId: true } } },
  })
  if (!comment) {
    return { success: false as const, error: "Comment not found" }
  }

  await prisma.reviewComment.update({
    where: { id: commentId },
    data: { supplierResponse: trimmed },
  })

  await logDefectEvent(comment.report.defectId, "REVIEW_COMMENT_RESPONDED", session.user.id, {
    commentId,
    responseOnly: true,
  })

  revalidatePath(`/quality/supplier/defects/${comment.report.defectId}/8d`)
  revalidatePath(`/quality/supplier/defects/${comment.report.defectId}`)

  return { success: true as const }
}
