import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"

export default async function OemFmeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/supplier")

  const fmea = await prisma.fmea.findUnique({
    where: { id },
    include: {
      supplier: { select: { name: true } },
      responsible: { select: { name: true } },
      approvedBy: { select: { name: true } },
      events: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  })

  if (!fmea || fmea.oemId !== session.user.companyId) notFound()

  const rows = (fmea.rows as Array<Record<string, unknown>>) ?? []
  const computeMaxRpn = (data: Array<Record<string, unknown>>) => {
    if (data.length === 0) return 0
    return Math.max(...data.map((r) => (r.rpn as number) ?? 0))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/oem/fmea" className="hover:text-foreground">FMEA</Link>
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
              <dt className="text-muted-foreground">Supplier</dt>
              <dd className="text-foreground">{fmea.supplier.name}</dd>
              <dt className="text-muted-foreground">Responsible</dt>
              <dd className="text-foreground">{fmea.responsible?.name ?? "—"}</dd>
              <dt className="text-muted-foreground">Total Rows</dt>
              <dd className="text-foreground">{rows.length}</dd>
              <dt className="text-muted-foreground">Max RPN</dt>
              <dd className="text-foreground">{computeMaxRpn(rows)}</dd>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="text-foreground">{fmea.createdAt.toLocaleDateString()}</dd>
            </dl>
          </div>

          {rows.length > 0 && (
            <div className="rounded-lg border bg-card p-4 space-y-3 overflow-x-auto">
              <h2 className="text-sm font-medium text-foreground">Risk Matrix ({rows.length} rows)</h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Failure Mode</th>
                    <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Effect</th>
                    <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Sev</th>
                    <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Occ</th>
                    <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Det</th>
                    <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">RPN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/50">
                      <td className="px-2 py-2 text-foreground">{String(row.potentialFailureMode ?? "")}</td>
                      <td className="px-2 py-2 text-muted-foreground">{String(row.potentialEffect ?? "")}</td>
                      <td className="px-2 py-2 text-center text-foreground">{String(row.severity ?? "")}</td>
                      <td className="px-2 py-2 text-center text-foreground">{String(row.occurrence ?? "")}</td>
                      <td className="px-2 py-2 text-center text-foreground">{String(row.detection ?? "")}</td>
                      <td className={`px-2 py-2 text-center font-semibold ${Number(row.rpn) >= 200 ? "text-red-400" : Number(row.rpn) >= 100 ? "text-amber-400" : "text-emerald-400"}`}>{String(row.rpn ?? "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
        </div>
      </div>
    </div>
  )
}