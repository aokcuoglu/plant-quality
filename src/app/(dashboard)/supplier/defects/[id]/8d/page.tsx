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
      eightDReport: true,
      oem: { select: { name: true } },
    },
  })

  if (!defect) notFound()
  if (defect.status === "RESOLVED" || defect.status === "REJECTED") {
    redirect(`/supplier/defects/${id}`)
  }

  const report = defect.eightDReport
  const initialData: Record<string, string | null> = {
    d1_team: report?.d1_team ?? null,
    d2_problem: report?.d2_problem ?? null,
    d3_containment: report?.d3_containment ?? null,
    d4_rootCause: report?.d4_rootCause ?? null,
    d4_why1: null,
    d4_why2: null,
    d4_why3: null,
    d4_why4: null,
    d4_why5: null,
    d5_d6_action: report?.d5_d6_action ?? null,
    d7_preventive: report?.d7_preventive ?? null,
    d8_recognition: report?.d8_recognition ?? null,
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/supplier/defects/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to defect detail
      </Link>

      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Part:</span>{" "}
          {defect.partNumber}
          <span className="mx-3">&middot;</span>
          <span className="font-medium text-foreground">Customer:</span>{" "}
          {defect.oem.name}
        </p>
      </div>

      <EightDWizardForm defectId={id} initialData={initialData} />
    </div>
  )
}
