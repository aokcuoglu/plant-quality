import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ShieldAlertIcon } from "lucide-react"
import Link from "next/link"

export default async function OemFmeaPage() {
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/supplier")

  const fmeas = await prisma.fmea.findMany({
    where: { oemId: session.user.companyId },
    orderBy: { createdAt: "desc" },
    include: { supplier: { select: { name: true } } },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">FMEA Analysis</h1>
        <p className="text-sm text-muted-foreground">Failure Mode and Effects Analysis</p>
      </div>

      {fmeas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <ShieldAlertIcon className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-sm font-medium text-foreground">No FMEA analyses yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">FMEA analyses will appear here when created</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Part Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Revision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {fmeas.map((f) => (
                <tr key={f.id} className="transition-colors hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Link href={`/oem/fmea/${f.id}`} className="font-medium text-foreground hover:text-emerald-400">{f.title}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{f.fmeaType === "DESIGN" ? "DFMEA" : "PFMEA"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{f.partNumber}</td>
                  <td className="px-4 py-3 text-muted-foreground">{f.supplier.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${f.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400" : f.status === "DRAFT" ? "bg-muted text-muted-foreground" : "bg-amber-500/10 text-amber-400"}`}>
                      {f.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">Rev {f.revisionNo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}