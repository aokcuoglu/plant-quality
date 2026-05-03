import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { requireFeature } from "@/lib/billing"
import { ShieldAlertIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { getFmeaStatusColor, getRpnColor, isFmeaOverdue, FMEA_STATUS_LABELS, FMEA_TYPE_LABELS } from "@/lib/fmea"
import type { FmeaStatus } from "@/generated/prisma/client"

export default async function OemFmeaPage() {
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")
  const fmeaGate = requireFeature(session, "FMEA")
  if (!fmeaGate.allowed) redirect("/quality/oem")

  const fmeas = await prisma.fmea.findMany({
    where: { oemId: session.user.companyId },
    orderBy: { createdAt: "desc" },
    include: {
      supplier: { select: { name: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">FMEA Analysis</h1>
          <p className="text-sm text-muted-foreground">Failure Mode and Effects Analysis</p>
        </div>
        <Link href="/quality/oem/fmea/new">
          <button className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition-colors">
            <PlusIcon className="size-4" />
            New FMEA
          </button>
        </Link>
      </div>

      {fmeas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <ShieldAlertIcon className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-sm font-medium text-foreground">No FMEA analyses yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">Create your first FMEA to get started</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Part</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Max RPN</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Due</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fmeas.map((f) => {
                  const rows = (f.rows as Array<Record<string, unknown>>) ?? []
                  const maxRpn = rows.length > 0 ? Math.max(...rows.map(r => Number(r.rpn) || 0)) : 0
                  const overdue = isFmeaOverdue(f.dueDate, f.status as FmeaStatus)
                  return (
                    <tr key={f.id} className="transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link href={`/quality/oem/fmea/${f.id}`} className="font-medium text-foreground hover:text-emerald-400">{f.fmeaNumber}</Link>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">{f.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{FMEA_TYPE_LABELS[f.fmeaType] ?? f.fmeaType}</td>
                      <td className="px-4 py-3 text-muted-foreground">{f.partNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground">{f.supplier?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getFmeaStatusColor(f.status as FmeaStatus)}`}>
                          {FMEA_STATUS_LABELS[f.status as FmeaStatus] ?? f.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-semibold ${getRpnColor(maxRpn)}`}>{maxRpn || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {f.dueDate ? (
                          <span className={overdue ? "text-red-400" : ""}>
                            {f.dueDate.toLocaleDateString()}
                            {overdue && " (Overdue)"}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{f.createdAt.toLocaleDateString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}