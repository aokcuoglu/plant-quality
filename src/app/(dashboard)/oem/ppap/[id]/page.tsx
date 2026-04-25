import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"

export default async function OemPpapDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/supplier")

  const ppap = await prisma.ppapSubmission.findUnique({
    where: { id },
    include: {
      supplier: { select: { name: true } },
      oemOwner: { select: { name: true, email: true } },
      supplierAssignee: { select: { name: true, email: true } },
      evidences: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      reviewComments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      events: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  })

  if (!ppap || ppap.oemId !== session.user.companyId) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/oem/ppap" className="hover:text-foreground">PPAP</Link>
        <span>/</span>
        <span className="text-foreground">{ppap.partNumber} — {ppap.partName}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">PPAP {ppap.partNumber}</h1>
          <p className="text-sm text-muted-foreground">Revision {ppap.revision} — {ppap.level.replace("LEVEL_", "Level ")}</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
          {ppap.status.replace("_", " ")}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h2 className="text-sm font-medium text-foreground">Details</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Part Number</dt>
              <dd className="text-foreground">{ppap.partNumber}</dd>
              <dt className="text-muted-foreground">Part Name</dt>
              <dd className="text-foreground">{ppap.partName}</dd>
              <dt className="text-muted-foreground">Supplier</dt>
              <dd className="text-foreground">{ppap.supplier.name}</dd>
              <dt className="text-muted-foreground">Level</dt>
              <dd className="text-foreground">{ppap.level.replace("LEVEL_", "Level ")}</dd>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="text-foreground">{ppap.createdAt.toLocaleDateString()}</dd>
            </dl>
          </div>

          {ppap.evidences.length > 0 && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium text-foreground">Evidence ({ppap.evidences.length})</h2>
              <div className="space-y-2">
                {ppap.evidences.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{e.requirement.replace(/_/g, " ").toLowerCase()}</span>
                    <span className="text-foreground">{e.fileName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h2 className="text-sm font-medium text-foreground">Review Comments ({ppap.reviewComments.length})</h2>
            {ppap.reviewComments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No comments yet</p>
            ) : (
              <div className="space-y-3">
                {ppap.reviewComments.map((c) => (
                  <div key={c.id} className="border-l-2 border-border pl-3">
                    <p className="text-xs font-medium text-foreground">{c.author.name}</p>
                    <p className="text-sm text-muted-foreground">{c.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

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