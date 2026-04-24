import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ArrowLeftIcon } from "lucide-react"
import { EightDWizardForm } from "@/components/defects/EightDWizardForm"

export default async function EightDReportPage({
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
      eightDReport: {
        include: {
          reviewComments: {
            include: { author: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      oem: { select: { name: true } },
    },
  })

  if (!defect) notFound()
  if (defect.status === "RESOLVED") {
    redirect(`/supplier/defects/${id}`)
  }

  const report = defect.eightDReport
  const initialData: Record<string, string | null> = {
    d1_team: report?.team != null ? JSON.stringify(report.team) : null,
    d2_problem: report?.d2_problem ?? null,
    d3_containment: report?.containmentActions != null ? JSON.stringify(report.containmentActions) : null,
    d4_rootCause: report?.d4_rootCause ?? null,
    d5_actions: report?.d5Actions != null ? JSON.stringify(report.d5Actions) : null,
    d6_actions: report?.d6Actions != null ? JSON.stringify(report.d6Actions) : null,
    d7_impacts: report?.d7Impacts != null ? JSON.stringify(report.d7Impacts) : null,
    d7_preventive: report?.d7Preventive ?? null,
    d8_recognition: report?.d8_recognition ?? null,
  }

  const reviewComments = report?.reviewComments ?? []

  return (
    <div className="space-y-6">
      <Link
        href={`/supplier/defects/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to defect detail
      </Link>

      {defect.status === "REJECTED" && (
        <div className="rounded-lg border border-rose-200 bg-rose-50/50 px-4 py-3 dark:border-rose-900 dark:bg-rose-950/10">
          <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
            Revision Requested
          </p>
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-500">
            The customer has requested changes. Please review their comments below, update the relevant sections, and resubmit the report.
          </p>
        </div>
      )}

      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Part:</span>{" "}
          {defect.partNumber}
          <span className="mx-3">&middot;</span>
          <span className="font-medium text-foreground">Customer:</span>{" "}
          {defect.oem.name}
        </p>
      </div>

      <EightDWizardForm
        defectId={id}
        initialData={initialData}
        reviewComments={reviewComments}
        userPlan={session.user.plan}
        imageUrls={defect.imageUrls}
        defectTitle={defect.description}
        partName={defect.partNumber}
        symptoms={defect.description}
      />
    </div>
  )
}
