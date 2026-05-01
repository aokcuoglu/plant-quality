import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { FileTextIcon } from "lucide-react"
import Link from "next/link"
import { getPpapStatusColor, PPAP_STATUS_LABELS, isPpapOverdue } from "@/lib/ppap"
import { requireFeature } from "@/lib/billing"

export default async function SupplierPpapPage() {
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "SUPPLIER") redirect("/quality/oem")
  const ppapGate = requireFeature(session, "PPAP")
  if (!ppapGate.allowed) redirect("/quality/supplier")

  const submissions = await prisma.ppapSubmission.findMany({
    where: { supplierId: session.user.companyId },
    orderBy: { createdAt: "desc" },
    include: {
      oem: { select: { name: true } },
      evidences: { where: { deletedAt: null }, select: { id: true, status: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">PPAP Submissions</h1>
        <p className="text-sm text-muted-foreground">Production Part Approval Process</p>
      </div>

      {submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <FileTextIcon className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-sm font-medium text-foreground">No PPAP submissions yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">PPAP requests from OEMs will appear here</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Request #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Part</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Level</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">OEM</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Docs</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {submissions.map((s) => {
                  const total = s.evidences.length
                  const uploaded = s.evidences.filter((e) => e.status !== "MISSING").length
                  const overdue = isPpapOverdue(s.dueDate, s.status)
                  return (
                    <tr key={s.id} className="transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link href={`/quality/supplier/ppap/${s.id}`} className="font-medium text-foreground hover:text-emerald-400">
                          {s.requestNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-foreground">{s.partNumber}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{s.partName}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.level.replace("LEVEL_", "Level ")}</td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[150px]">{s.oem.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{uploaded}/{total}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getPpapStatusColor(s.status)}`}>
                          {PPAP_STATUS_LABELS[s.status] ?? s.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {overdue ? (
                          <span className="text-xs font-medium text-red-400">Overdue</span>
                        ) : (
                          <span className="text-muted-foreground">{s.dueDate?.toLocaleDateString() ?? "—"}</span>
                        )}
                      </td>
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