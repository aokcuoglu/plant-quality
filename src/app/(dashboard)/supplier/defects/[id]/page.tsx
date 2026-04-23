import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DefectDetailView } from "@/components/defects/DefectDetailView"

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

  const D_STEPS = ["d1_team", "d2_problem", "d3_containment", "d4_rootCause", "d5_d6_action", "d7_preventive", "d8_recognition"] as const

  const labelMap: Record<string, string> = {
    d1_team: "D1 — 8D Team",
    d2_problem: "D2 — Problem Description",
    d3_containment: "D3 — Containment Actions",
    d4_rootCause: "D4 — Root Cause Analysis",
    d5_d6_action: "D5-D6 — Corrective Actions",
    d7_preventive: "D7 — Preventive Actions",
    d8_recognition: "D8 — Recognition & Closure",
  }

  const reviewSections = report
    ? D_STEPS.map((stepId) => ({
        stepId,
        label: labelMap[stepId] ?? stepId,
        content: (report as unknown as Record<string, string | null>)[stepId] ?? null,
        comments: report.reviewComments.filter((c) => c.stepId === stepId),
      }))
    : []

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
      companyType="SUPPLIER"
    />
  )
}
