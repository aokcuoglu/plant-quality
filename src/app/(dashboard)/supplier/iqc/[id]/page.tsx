import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"

export default async function SupplierIqcDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "SUPPLIER") redirect("/oem")

  const report = await prisma.iqcReport.findUnique({
    where: { id },
    include: {
      oem: { select: { name: true } },
      inspector: { select: { name: true, email: true } },
      events: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  })

  if (!report || report.supplierId !== session.user.companyId) notFound()

  const measurements = (report.measurements as Array<Record<string, unknown>>) ?? []
  const nonconformities = (report.nonconformities as Array<Record<string, unknown>>) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/supplier/iqc" className="hover:text-foreground">IQC</Link>
        <span>/</span>
        <span className="text-foreground">Lot {report.lotNumber}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">IQC Report — {report.lotNumber}</h1>
          <p className="text-sm text-muted-foreground">{report.partNumber} — {report.oem.name}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${report.status === "PASSED" ? "bg-emerald-500/10 text-emerald-400" : report.status === "FAILED" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>
          {report.status.replace("_", " ")}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h2 className="text-sm font-medium text-foreground">Inspection Summary</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Lot Number</dt>
              <dd className="text-foreground">{report.lotNumber}</dd>
              <dt className="text-muted-foreground">Part Number</dt>
              <dd className="text-foreground">{report.partNumber}</dd>
              <dt className="text-muted-foreground">OEM</dt>
              <dd className="text-foreground">{report.oem.name}</dd>
              <dt className="text-muted-foreground">Inspector</dt>
              <dd className="text-foreground">{report.inspector?.name ?? "—"}</dd>
              <dt className="text-muted-foreground">Sample Size</dt>
              <dd className="text-foreground">{report.quantity}</dd>
              <dt className="text-muted-foreground">Accepted / Rejected</dt>
              <dd className="text-foreground">{report.quantityAccepted} / {report.quantityRejected}</dd>
              <dt className="text-muted-foreground">Inspection Date</dt>
              <dd className="text-foreground">{report.inspectionDate?.toLocaleDateString() ?? "—"}</dd>
            </dl>
          </div>

          {measurements.length > 0 && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium text-foreground">Measurements</h2>
              <pre className="text-xs text-muted-foreground overflow-auto">{JSON.stringify(measurements, null, 2)}</pre>
            </div>
          )}

          {nonconformities.length > 0 && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium text-foreground">Nonconformities</h2>
              <pre className="text-xs text-muted-foreground overflow-auto">{JSON.stringify(nonconformities, null, 2)}</pre>
            </div>
          )}

          {report.dispositionNotes && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium text-foreground">Disposition Notes</h2>
              <p className="text-sm text-muted-foreground">{report.dispositionNotes}</p>
            </div>
          )}
        </div>

        <div>
          {report.events.length > 0 && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium text-foreground">Activity</h2>
              <div className="space-y-2">
                {report.events.slice(0, 10).map((e) => (
                  <div key={e.id} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{e.createdAt.toLocaleDateString()}</span>
                    <span className="text-foreground">{e.type.replace(/_/g, " ").toLowerCase()}</span>
                    {e.actor && <span className="text-muted-foreground">by {e.actor.name}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}