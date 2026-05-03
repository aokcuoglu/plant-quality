import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DefectDetailView, type ReviewSection } from "@/components/defects/DefectDetailView"
import { hasRequiredSubmissionEvidence } from "@/lib/evidence"
import { normalizePlan, canUseFeature } from "@/lib/billing"
import { RelatedQualityRecordsPanel, UpgradeLinkageBanner } from "@/components/quality-linkage/related-records-panel"
import { findRelatedForDefect } from "@/lib/quality-linkage"
import { clearSupplierNameCache } from "@/lib/quality-linkage/find-related"
import type { EightDSection } from "@/generated/prisma/client"

const D_STEPS = ["d1_team", "d2_problem", "d3_containment", "d4_rootCause", "d5_actions", "d6_actions", "d7_impacts", "d7_preventive", "d8_recognition"] as const

const LABEL_MAP: Record<string, string> = {
  d1_team: "D1 — 8D Team",
  d2_problem: "D2 — Problem Description",
  d3_containment: "D3 — Containment Actions",
  d4_rootCause: "D4 — Root Cause Analysis",
  d5_actions: "D5 — Permanent Corrective Actions",
  d6_actions: "D6 — Validation & Implementation",
  d7_impacts: "D7 — Document & Process Updates",
  d7_preventive: "D7 — Preventive Actions",
  d8_recognition: "D8 — Recognition & Closure",
}

const COMMENT_STEP_ALIASES: Record<string, string[]> = {
  d5_actions: ["d5_actions", "d5_d6_action"],
  d6_actions: ["d6_actions", "d5_d6_action"],
}

const CONTENT_FIELD_MAP: Partial<Record<(typeof D_STEPS)[number], string>> = {
  d7_preventive: "d7Preventive",
}

function buildReviewSections(report: {
  team: unknown
  containmentActions: unknown
  d5Actions: unknown
  d6Actions: unknown
  d2_problem: string | null
  d4_rootCause: string | null
  d5_d6_action: string | null
  d7Preventive: string | null
  d7Impacts: unknown
  d8_recognition: string | null
  reviewComments: ReviewSection["comments"]
}): ReviewSection[] {
  return D_STEPS.map((stepId) => {
    const commentKeys = COMMENT_STEP_ALIASES[stepId] ?? [stepId]
    const base = { stepId, label: LABEL_MAP[stepId] ?? stepId, comments: report.reviewComments.filter((c) => commentKeys.includes(c.stepId)) }
    if (stepId === "d1_team" && Array.isArray(report.team) && report.team.length > 0) {
      return { ...base, headers: ["Name", "Role"], rows: (report.team as Array<Record<string, string>>).map((m) => ({ cells: [m.userName ?? "", m.role === "champion" ? "Champion" : m.role === "teamLeader" ? "Team Leader" : "Member"] })) }
    }
    if (stepId === "d3_containment" && Array.isArray(report.containmentActions) && report.containmentActions.length > 0) {
      return { ...base, headers: ["Action", "Responsible", "% Effectiveness", "Target Date", "Actual Date"], rows: (report.containmentActions as Array<Record<string, string>>).map((a) => ({ cells: [a.description ?? "", a.responsibleName ?? "", `${a.effectiveness ?? 0}%`, a.targetDate ?? "", a.actualDate ?? ""] })) }
    }
    if (stepId === "d5_actions" && Array.isArray(report.d5Actions) && report.d5Actions.length > 0) {
      return { ...base, headers: ["Action", "Verification", "% Effectiveness"], rows: (report.d5Actions as Array<Record<string, string>>).map((a) => ({ cells: [a.action ?? "", a.verificationMethod ?? "", `${a.effectiveness ?? 0}%`] })) }
    }
    if (stepId === "d6_actions" && Array.isArray(report.d6Actions) && report.d6Actions.length > 0) {
      return { ...base, headers: ["Action", "Target Date", "Actual Date", "Validated By"], rows: (report.d6Actions as Array<Record<string, string>>).map((a) => ({ cells: [a.actionDescription ?? "", a.targetDate ?? "", a.actualDate ?? "", a.validatedByName ?? ""] })) }
    }
    if (stepId === "d7_impacts" && Array.isArray(report.d7Impacts) && report.d7Impacts.length > 0) {
      return { ...base, headers: ["Document", "Revision No"], rows: (report.d7Impacts as Array<Record<string, string>>).map((i) => ({ cells: [i.documentType ?? "", i.revisionNo ?? ""] })) }
    }
    const contentField = CONTENT_FIELD_MAP[stepId] ?? stepId
    return { ...base, content: (report as unknown as Record<string, string | null>)[contentField] ?? null }
  })
}

export default async function SupplierDefectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || session.user.companyType !== "SUPPLIER") redirect("/login")

  const { id } = await params

  const defect = await prisma.defect.findFirst({
    where: { id, supplierId: session.user.companyId },
    include: {
      supplier: { select: { name: true, users: { select: { id: true, name: true, email: true }, orderBy: { name: "asc" } } } },
      oem: { select: { name: true, users: { select: { id: true, name: true, email: true }, orderBy: { name: "asc" } } } },
      oemOwner: { select: { name: true, email: true } },
      supplierAssignee: { select: { name: true, email: true } },
      eightDReport: {
        include: {
          reviewComments: {
            include: { author: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      evidences: {
        where: { deletedAt: null },
        include: { uploadedBy: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
      events: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "desc" as const },
      },
    },
  })

  if (!defect) notFound()

  const report = defect.eightDReport

  const reviewSections = report ? buildReviewSections(report) : []

  const evidenceCounts = defect.evidences.reduce<Partial<Record<EightDSection, number>>>((acc, item) => {
    acc[item.section] = (acc[item.section] ?? 0) + 1
    return acc
  }, {})
  const evidenceReady = hasRequiredSubmissionEvidence(evidenceCounts)
  const canManageEvidence = false

  const plan = normalizePlan(session.user.plan)
  const canUseLinkage = canUseFeature(plan, "SUPPLIER", "QUALITY_LINKAGE")
  clearSupplierNameCache()
  const relatedRecords = canUseLinkage
    ? await findRelatedForDefect(id, { companyId: session.user.companyId, companyType: "SUPPLIER", role: session.user.role })
    : []
  const defectManualLinks = canUseLinkage
    ? await prisma.qualityRecordLink.findMany({
        where: {
          companyId: defect.oemId,
          OR: [
            { sourceType: "DEFECT", sourceId: id },
            { targetType: "DEFECT", targetId: id },
          ],
        },
      })
    : []

  return (
    <div className="space-y-6">
      <DefectDetailView
        defect={{
          id: defect.id,
          partNumber: defect.partNumber,
          description: defect.description,
          status: defect.status,
          imageUrls: defect.imageUrls,
          createdAt: defect.createdAt,
          supplierName: defect.supplier.name,
          oemName: defect.oem.name,
          oemOwnerId: defect.oemOwnerId,
          oemOwnerName: defect.oemOwner?.name ?? defect.oemOwner?.email ?? null,
          supplierAssigneeId: defect.supplierAssigneeId,
          supplierAssigneeName: defect.supplierAssignee?.name ?? defect.supplierAssignee?.email ?? null,
          supplierResponseDueAt: defect.supplierResponseDueAt,
          eightDSubmissionDueAt: defect.eightDSubmissionDueAt,
          oemReviewDueAt: defect.oemReviewDueAt,
          revisionDueAt: defect.revisionDueAt,
          currentActionOwner: defect.currentActionOwner,
          oemUsers: defect.oem.users,
          supplierUsers: defect.supplier.users,
          canEditSla: false,
          canEditSupplierAssignee: session.user.role === "ADMIN",
          canSelfAssign: session.user.role === "QUALITY_ENGINEER" && !defect.supplierAssigneeId,
          evidenceReady,
          canUploadEvidence: canManageEvidence,
          evidences: defect.evidences.map((evidence) => ({
            id: evidence.id,
            section: evidence.section,
            fileName: evidence.fileName,
            mimeType: evidence.mimeType,
            sizeBytes: evidence.sizeBytes,
            createdAt: evidence.createdAt,
            uploaderName: evidence.uploadedBy.name ?? evidence.uploadedBy.email,
            canRemove: false,
            downloadUrl: `/api/defects/evidence/${evidence.id}`,
          })),
          eightDSubmitted: !!report,
          eightDReport: report
            ? {
                id: report.id,
                submittedAt: report.submittedAt,
                reviewSections,
              }
            : null,
          events: defect.events.map((e) => ({
            id: e.id,
            type: e.type,
            actor: e.actor ? { name: e.actor.name } : null,
            metadata: e.metadata,
            createdAt: e.createdAt,
          })),
        }}
        companyType="SUPPLIER"
      />

      {canUseLinkage ? (
        <RelatedQualityRecordsPanel
          groupedRecords={relatedRecords}
          sourceType="DEFECT"
          sourceId={id}
          canLink={false}
          manualLinks={defectManualLinks.map((l) => ({
            id: l.id,
            sourceType: l.sourceType,
            sourceId: l.sourceId,
            targetType: l.targetType,
            targetId: l.targetId,
            linkType: l.linkType,
            reason: l.reason,
          }))}
        />
      ) : (
        <UpgradeLinkageBanner />
      )}
    </div>
  )
}
