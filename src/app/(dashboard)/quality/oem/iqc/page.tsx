import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { requireFeature } from "@/lib/billing"
import { ClipboardCheckIcon } from "lucide-react"
import Link from "next/link"

export default async function OemIqcPage() {
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")
  const iqcGate = requireFeature(session, "IQC")
  if (!iqcGate.allowed) redirect("/quality/oem")

  const reports = await prisma.iqcReport.findMany({
    where: { oemId: session.user.companyId },
    orderBy: { createdAt: "desc" },
    include: { supplier: { select: { name: true } } },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">IQC Reports</h1>
        <p className="text-sm text-muted-foreground">Incoming Quality Control inspections</p>
      </div>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <ClipboardCheckIcon className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-sm font-medium text-foreground">No IQC reports yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">Incoming quality inspections will appear here</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Lot Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Part Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Result</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Inspection Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Link href={`/quality/oem/iqc/${r.id}`} className="font-medium text-foreground hover:text-emerald-400">{r.lotNumber}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.partNumber}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.supplier.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.quantityAccepted}/{r.quantity}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${r.status === "PASSED" ? "bg-emerald-500/10 text-emerald-400" : r.status === "FAILED" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>
                      {r.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.inspectionDate?.toLocaleDateString() ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}