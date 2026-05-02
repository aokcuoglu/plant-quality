import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { requireFeature } from "@/lib/billing"
import { getIqcStatusColor, getIqcResultColor, IQC_STATUS_LABELS, IQC_RESULT_LABELS, IQC_INSPECTION_TYPE_LABELS } from "@/lib/iqc"
import { ClipboardCheckIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function OemIqcPage() {
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")
  const iqcGate = requireFeature(session, "IQC")
  if (!iqcGate.allowed) redirect("/quality/oem")

  const reports = await prisma.iqcReport.findMany({
    where: { oemId: session.user.companyId },
    orderBy: { createdAt: "desc" },
    include: {
      supplier: { select: { name: true } },
      inspector: { select: { name: true, email: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">IQC Inspections</h1>
          <p className="text-sm text-muted-foreground">Incoming Quality Control inspections</p>
        </div>
        <Link href="/quality/oem/iqc/new">
          <Button>
            <PlusIcon className="mr-1.5 size-4" />
            New Inspection
          </Button>
        </Link>
      </div>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <ClipboardCheckIcon className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-sm font-medium text-foreground">No IQC inspections yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">Create your first incoming quality inspection</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Inspection #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Part</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Result</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Link href={`/quality/oem/iqc/${r.id}`} className="font-medium text-foreground hover:text-emerald-400 truncate block max-w-[200px]">{r.inspectionNumber}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="truncate max-w-[180px] text-muted-foreground">{r.partNumber}</div>
                    {r.partName && <div className="truncate max-w-[180px] text-xs text-muted-foreground">{r.partName}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[150px]">{r.supplier.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{IQC_INSPECTION_TYPE_LABELS[r.inspectionType] ?? r.inspectionType.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getIqcStatusColor(r.status)}`}>
                      {IQC_STATUS_LABELS[r.status] ?? r.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.result ? (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getIqcResultColor(r.result)}`}>
                        {IQC_RESULT_LABELS[r.result] ?? r.result.replace(/_/g, " ")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{r.inspectionDate?.toLocaleDateString() ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}