import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"

export default async function SupplierPpapDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "SUPPLIER") redirect("/quality/oem")

  const ppap = await prisma.ppapSubmission.findFirst({
    where: { id, supplierId: session.user.companyId },
    include: {
      oem: { select: { name: true } },
      oemOwner: { select: { name: true, email: true } },
      supplierAssignee: { select: { name: true, email: true } },
      evidences: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      events: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  })

  if (!ppap) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/quality/supplier/ppap" className="hover:text-foreground">PPAP</Link>
        <span>/</span>
        <span className="text-foreground">{ppap.partNumber} — {ppap.partName}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">PPAP {ppap.partNumber}</h1>
          <p className="text-sm text-muted-foreground">Revision {ppap.revision} — {ppap.level.replace("LEVEL_", "Level ")} — {ppap.oem.name}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${ppap.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400" : ppap.status === "REJECTED" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>
          {ppap.status.replace("_", " ")}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h2 className="text-sm font-medium text-foreground">Submission Details</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Part Number</dt>
              <dd className="text-foreground">{ppap.partNumber}</dd>
              <dt className="text-muted-foreground">Part Name</dt>
              <dd className="text-foreground">{ppap.partName}</dd>
              <dt className="text-muted-foreground">OEM</dt>
              <dd className="text-foreground">{ppap.oem.name}</dd>
              <dt className="text-muted-foreground">Level</dt>
              <dd className="text-foreground">{ppap.level.replace("LEVEL_", "Level ")}</dd>
              <dt className="text-muted-foreground">OEM Reviewer</dt>
              <dd className="text-foreground">{ppap.oemOwner?.name ?? "Unassigned"}</dd>
              <dt className="text-muted-foreground">Due Date</dt>
              <dd className="text-foreground">{ppap.dueDate?.toLocaleDateString() ?? "—"}</dd>
            </dl>
          </div>

          {ppap.evidences.length > 0 && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium text-foreground">Uploaded Evidence ({ppap.evidences.length})</h2>
              <div className="space-y-2">
                {ppap.evidences.map((e) => (
                  <div key={e.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                    <div>
                      <p className="text-sm text-foreground">{e.fileName}</p>
                      <p className="text-xs text-muted-foreground">{e.requirement.replace(/_/g, " ").toLowerCase()}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{(e.sizeBytes / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ppap.rejectionReason && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 space-y-2">
              <h2 className="text-sm font-medium text-destructive">Rejection Reason</h2>
              <p className="text-sm text-muted-foreground">{ppap.rejectionReason}</p>
            </div>
          )}
        </div>

        <div>
          {ppap.events.length > 0 && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium text-foreground">Activity</h2>
              <div className="space-y-2">
                {ppap.events.slice(0, 10).map((e) => (
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