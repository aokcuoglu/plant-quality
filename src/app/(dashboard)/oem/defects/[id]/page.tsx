import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DefectDetailView, type ReviewSection } from "@/components/defects/DefectDetailView"

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
    return { ...base, content: (report as unknown as Record<string, string | null>)[stepId] ?? null }
  })
}

export default async function OemDefectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") redirect("/login")

  const { id } = await params

  const defect = await prisma.defect.findFirst({
    where: { id, oemId: session.user.companyId },
    include: {
      supplier: { select: { name: true } },
      oem: { select: { name: true } },
      eightDReport: {
        include: {
          reviewComments: {
            include: { author: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  })

  if (!defect) notFound()

  const report = defect.eightDReport

  const reviewSections = report ? buildReviewSections(report) : []

  return (
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
        eightDSubmitted: !!report,
        eightDReport: report
          ? {
              id: report.id,
              submittedAt: report.submittedAt,
              reviewSections,
            }
          : null,
      }}
      companyType="OEM"
    />
  )
}
