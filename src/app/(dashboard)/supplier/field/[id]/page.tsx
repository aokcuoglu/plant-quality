import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeftIcon, LinkIcon } from "lucide-react"
import { FieldDefectStatusBadge } from "@/components/field/FieldDefectStatusBadge"
import { FieldDefectSeverityBadge } from "@/components/field/FieldDefectSeverityBadge"
import { FieldDefectSourceBadge } from "@/components/field/FieldDefectSourceBadge"
import { SupplierCommentSection } from "./supplier-comment-section"
import { DetailRow } from "@/components/DetailRow"

export default async function SupplierFieldDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || session.user.companyType !== "SUPPLIER") redirect("/login")

  const { id } = await params

  const fd = await prisma.fieldDefect.findFirst({
    where: { id, supplierId: session.user.companyId, deletedAt: null },
    include: {
      oem: { select: { name: true } },
      supplier: { select: { id: true, name: true } },
      createdBy: { select: { name: true, email: true } },
      linkedDefect: { select: { id: true, partNumber: true, status: true } },
      attachments: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      comments: { include: { author: { select: { name: true, email: true, companyId: true } } }, orderBy: { createdAt: "asc" } },
      events: { include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } },
    },
  })

  if (!fd) notFound()

  const canComment = ["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)

  function formatDate(d: Date | null) {
    if (!d) return "—"
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/supplier/field" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">{fd.title}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">Problem Details</h2>
            </div>
            <div className="px-4">
              <DetailRow label="Description" value={<p className="whitespace-pre-wrap">{fd.description}</p>} />
              <DetailRow label="Source" value={<FieldDefectSourceBadge source={fd.source} />} />
              <DetailRow label="Severity" value={<FieldDefectSeverityBadge severity={fd.severity} />} />
              <DetailRow label="Safety Impact" value={fd.safetyImpact ? "⚠️ Yes" : "No"} />
              <DetailRow label="Vehicle Down" value={fd.vehicleDown ? "🚫 Yes" : "No"} />
              <DetailRow label="Repeat Issue" value={fd.repeatIssue ? "🔁 Yes" : "No"} />
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">Vehicle Information</h2>
            </div>
            <div className="px-4">
              <DetailRow label="VIN" value={fd.vin ? <span className="font-mono text-xs">{fd.vin}</span> : "—"} />
              <DetailRow label="Vehicle Model" value={fd.vehicleModel} />
              <DetailRow label="Vehicle Variant" value={fd.vehicleVariant} />
              <DetailRow label="Mileage" value={fd.mileage ? `${fd.mileage.toLocaleString()} km` : "—"} />
              <DetailRow label="Failure Date" value={formatDate(fd.failureDate)} />
              <DetailRow label="Location" value={fd.location} />
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">Part Information</h2>
            </div>
            <div className="px-4">
              <DetailRow label="Part Number" value={fd.partNumber ? <span className="font-mono">{fd.partNumber}</span> : "—"} />
              <DetailRow label="Part Name" value={fd.partName} />
              <DetailRow label="OEM" value={fd.oem?.name ?? "—"} />
            </div>
          </div>

          {fd.attachments.length > 0 && (
            <div className="rounded-lg border bg-card">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold">Attachments ({fd.attachments.length})</h2>
              </div>
              <div className="px-4 py-3 space-y-2">
                {fd.attachments.map((att) => (
                  <a key={att.id} href={`/api/field/attachments/${att.storageKey}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-foreground hover:underline">
                    <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {att.fileName}
                    <span className="text-xs text-muted-foreground">({(att.fileSize / 1024).toFixed(1)} KB)</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {fd.linkedDefectId && fd.linkedDefect && (
            <div className="rounded-lg border bg-emerald-500/10">
              <div className="px-4 py-3 border-b border-emerald-500/20">
                <h2 className="text-sm font-semibold text-emerald-400">Linked to 8D Report</h2>
              </div>
              <div className="px-4 py-3">
                <Link href={`/supplier/defects/${fd.linkedDefect.id}`} className="text-sm text-emerald-400 hover:underline">
                  View 8D Report → (Defect #{fd.linkedDefect.partNumber})
                </Link>
              </div>
            </div>
          )}

          <SupplierCommentSection fieldDefectId={id} comments={fd.comments} canComment={canComment} />
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">Summary</h2>
            </div>
            <div className="px-4 space-y-3">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Status</span>
                <FieldDefectStatusBadge status={fd.status} />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Severity</span>
                <FieldDefectSeverityBadge severity={fd.severity} />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Source</span>
                <FieldDefectSourceBadge source={fd.source} />
              </div>
              <div className="flex items-center justify-between py-1 text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(fd.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between py-1 text-sm">
                <span className="text-muted-foreground">Report Date</span>
                <span>{formatDate(fd.reportDate)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">Activity</h2>
            </div>
            <div className="px-4 py-3 max-h-80 overflow-y-auto">
              {fd.events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {fd.events.map((event) => (
                    <div key={event.id} className="text-xs">
                      <span className="text-muted-foreground">
                        {event.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="ml-2 text-foreground">
                        {event.actor?.name ?? event.actor?.email ?? "System"} — {event.type.replace(/_/g, " ").toLowerCase().replace(/^field defect /, "")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}