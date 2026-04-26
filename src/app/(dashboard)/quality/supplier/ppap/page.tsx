import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { FileTextIcon } from "lucide-react"
import Link from "next/link"

export default async function SupplierPpapPage() {
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "SUPPLIER") redirect("/quality/oem")

  const submissions = await prisma.ppapSubmission.findMany({
    where: { supplierId: session.user.companyId },
    orderBy: { createdAt: "desc" },
    include: { oem: { select: { name: true } } },
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Part Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Part Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">OEM</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {submissions.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Link href={`/quality/supplier/ppap/${s.id}`} className="font-medium text-foreground hover:text-emerald-400">{s.partNumber}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.partName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.level.replace("LEVEL_", "Level ")}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.oem.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${s.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400" : s.status === "REJECTED" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>
                      {s.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.dueDate?.toLocaleDateString() ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}