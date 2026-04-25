import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { FmeaEditor } from "@/components/defects/FmeaEditor"

export default async function SupplierFmeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "SUPPLIER") redirect("/oem")

  const fmea = await prisma.fmea.findUnique({
    where: { id },
    include: {
      oem: { select: { name: true } },
      responsible: { select: { name: true } },
      approvedBy: { select: { name: true } },
      events: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  })

  if (!fmea || fmea.supplierId !== session.user.companyId) notFound()

  const rows = (fmea.rows as Array<Record<string, unknown>>) ?? []
  const canEdit = fmea.status === "DRAFT" || fmea.status === "IN_REVIEW"
  const maxRpn = rows.length > 0 ? Math.max(...rows.map((r) => Number(r.rpn) || 0)) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/supplier/fmea" className="hover:text-foreground">FMEA</Link>
        <span>/</span>
        <span className="text-foreground">{fmea.title}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{fmea.title}</h1>
          <p className="text-sm text-muted-foreground">{fmea.fmeaType === "DESIGN" ? "DFMEA" : "PFMEA"} — {fmea.partNumber} — Rev {fmea.revisionNo}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${fmea.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400" : fmea.status === "DRAFT" ? "bg-muted text-muted-foreground" : "bg-amber-500/10 text-amber-400"}`}>
          {fmea.status.replace("_", " ")}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h2 className="text-sm font-medium text-foreground">Summary</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="text-foreground">{fmea.fmeaType === "DESIGN" ? "Design FMEA" : "Process FMEA"}</dd>
              <dt className="text-muted-foreground">Part Number</dt>
              <dd className="text-foreground">{fmea.partNumber}</dd>
              <dt className="text-muted-foreground">OEM</dt>
              <dd className="text-foreground">{fmea.oem.name}</dd>
              <dt className="text-muted-foreground">Responsible</dt>
              <dd className="text-foreground">{fmea.responsible?.name ?? "—"}</dd>
              <dt className="text-muted-foreground">Total Rows</dt>
              <dd className="text-foreground">{rows.length}</dd>
              <dt className="text-muted-foreground">Max RPN</dt>
              <dd className={`font-semibold ${maxRpn >= 200 ? "text-red-400" : maxRpn >= 100 ? "text-amber-400" : "text-emerald-400"}`}>{maxRpn}</dd>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="text-foreground">{fmea.createdAt.toLocaleDateString()}</dd>
            </dl>
          </div>

          <FmeaEditor
            fmeaId={fmea.id}
            initialRows={rows.map((r) => ({
              id: String(r.id ?? ""),
              processStep: r.processStep ? String(r.processStep) : undefined,
              potentialFailureMode: String(r.potentialFailureMode ?? ""),
              potentialEffect: String(r.potentialEffect ?? ""),
              severity: Number(r.severity) || 5,
              potentialCause: String(r.potentialCause ?? ""),
              occurrence: Number(r.occurrence) || 3,
              currentControl: String(r.currentControl ?? ""),
              detection: Number(r.detection) || 5,
              rpn: Number(r.rpn) || 0,
              recommendedAction: String(r.recommendedAction ?? ""),
            }))}
            fmeaType={fmea.fmeaType}
            canEdit={canEdit}
            plan={session.user.plan}
            partNumber={fmea.partNumber}
            partName={fmea.partName}
            processStep={fmea.processStep}
          />
        </div>

        <div>
          {fmea.events.length > 0 && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium text-foreground">Activity</h2>
              <div className="space-y-2">
                {fmea.events.slice(0, 10).map((e) => (
                  <div key={e.id} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{e.createdAt.toLocaleDateString()}</span>
                    <span className="text-foreground">{e.type.replace(/_/g, " ").toLowerCase()}</span>
                    {e.actor && <span className="text-muted-foreground">by {e.actor.name}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {fmea.notes && (
            <div className="mt-4 rounded-lg border bg-card p-4 space-y-2">
              <h2 className="text-sm font-medium text-foreground">Notes</h2>
              <p className="text-sm text-muted-foreground">{fmea.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}