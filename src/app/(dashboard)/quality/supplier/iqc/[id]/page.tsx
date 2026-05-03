import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { requireFeature, normalizePlan, canUseFeature } from "@/lib/billing"
import { getIqcStatusColor, getIqcResultColor, IQC_STATUS_LABELS, IQC_RESULT_LABELS, IQC_INSPECTION_TYPE_LABELS, getIqcChecklistResultColor, getIqcChecklistResultIcon } from "@/lib/iqc"
import { LinkIcon } from "lucide-react"
import { RelatedQualityRecordsPanel, UpgradeLinkageBanner } from "@/components/quality-linkage/related-records-panel"
import { findRelatedForIqc } from "@/lib/quality-linkage"
import { clearSupplierNameCache } from "@/lib/quality-linkage/find-related"

export default async function SupplierIqcDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "SUPPLIER") redirect("/quality/oem")

  const featureGate = requireFeature(session, "IQC")
  if (!featureGate.allowed) redirect("/quality/supplier")

  const report = await prisma.iqcReport.findFirst({
    where: { id, supplierId: session.user.companyId },
    include: {
      oem: { select: { name: true } },
      inspector: { select: { name: true, email: true } },
      checklistItems: { orderBy: { createdAt: "asc" } },
      events: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      linkedDefect: { select: { id: true, partNumber: true, description: true, status: true } },
    },
  })

  if (!report) notFound()

  const checklistSummary = {
    total: report.checklistItems.length,
    ok: report.checklistItems.filter((c) => c.result === "OK").length,
    nok: report.checklistItems.filter((c) => c.result === "NOK").length,
    na: report.checklistItems.filter((c) => c.result === "NA").length,
    pending: report.checklistItems.filter((c) => c.result === "PENDING").length,
  }

  const plan = normalizePlan(session.user.plan)
  const canUseLinkage = canUseFeature(plan, "SUPPLIER", "QUALITY_LINKAGE")
  clearSupplierNameCache()
  const relatedRecords = canUseLinkage
    ? await findRelatedForIqc(id, { companyId: session.user.companyId, companyType: "SUPPLIER", role: session.user.role })
    : []
  const manualLinks = canUseLinkage
    ? await prisma.qualityRecordLink.findMany({
        where: {
          companyId: session.user.companyId,
          OR: [
            { sourceType: "IQC", sourceId: id },
            { targetType: "IQC", targetId: id },
          ],
        },
      })
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/quality/supplier/iqc" className="hover:text-foreground">IQC</Link>
        <span>/</span>
        <span className="text-foreground">{report.inspectionNumber}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {report.inspectionNumber}
          </h1>
          <p className="text-sm text-muted-foreground">
            {report.partNumber}{report.partName ? ` — ${report.partName}` : ""} &middot; {report.oem.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${getIqcStatusColor(report.status)}`}>
            {IQC_STATUS_LABELS[report.status] ?? report.status.replace(/_/g, " ")}
          </span>
          {report.result && (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${getIqcResultColor(report.result)}`}>
              {IQC_RESULT_LABELS[report.result] ?? report.result.replace(/_/g, " ")}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h2 className="text-sm font-medium text-foreground">Inspection Summary</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Inspection Number</dt>
              <dd className="text-foreground font-mono text-xs">{report.inspectionNumber}</dd>
              <dt className="text-muted-foreground">Part Number</dt>
              <dd className="text-foreground">{report.partNumber}</dd>
              {report.partName && (<><dt className="text-muted-foreground">Part Name</dt><dd className="text-foreground">{report.partName}</dd></>)}
              <dt className="text-muted-foreground">OEM</dt>
              <dd className="text-foreground">{report.oem.name}</dd>
              <dt className="text-muted-foreground">Inspector</dt>
              <dd className="text-foreground">{report.inspector?.name ?? "—"}</dd>
              <dt className="text-muted-foreground">Inspection Type</dt>
              <dd className="text-foreground">{IQC_INSPECTION_TYPE_LABELS[report.inspectionType] ?? report.inspectionType.replace(/_/g, " ")}</dd>
              <dt className="text-muted-foreground">Quantity Received</dt>
              <dd className="text-foreground">{report.quantityReceived}</dd>
              {report.inspectionQuantity > 0 && (<><dt className="text-muted-foreground">Inspection Quantity</dt><dd className="text-foreground">{report.inspectionQuantity}</dd></>)}
              {report.lotNumber && (<><dt className="text-muted-foreground">Lot Number</dt><dd className="text-foreground">{report.lotNumber}</dd></>)}
              {report.batchNumber && (<><dt className="text-muted-foreground">Batch Number</dt><dd className="text-foreground">{report.batchNumber}</dd></>)}
              <dt className="text-muted-foreground">Inspection Date</dt>
              <dd className="text-foreground">{report.inspectionDate?.toLocaleDateString() ?? "—"}</dd>
              {report.quantityAccepted > 0 && (<><dt className="text-muted-foreground">Accepted / Rejected</dt><dd className="text-foreground">{report.quantityAccepted} / {report.quantityRejected}</dd></>)}
            </dl>
          </div>

          {report.dispositionNotes && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium text-foreground">Disposition Notes</h2>
              <p className="text-sm text-muted-foreground">{report.dispositionNotes}</p>
            </div>
          )}

          {report.notes && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium text-foreground">Notes</h2>
              <p className="text-sm text-muted-foreground">{report.notes}</p>
            </div>
          )}

          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">Checklist</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-emerald-400">{checklistSummary.ok} OK</span>
                <span className="text-red-400">{checklistSummary.nok} NOK</span>
                <span>{checklistSummary.na} N/A</span>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Item</th>
                  <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Requirement</th>
                  <th className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground w-20">Result</th>
                  <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-24">Value</th>
                  <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-32">Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.checklistItems.map((item) => (
                  <tr key={item.id} className="transition-colors">
                    <td className="px-2 py-2 text-foreground">{item.itemName}</td>
                    <td className="px-2 py-2 text-muted-foreground text-xs max-w-[200px] truncate">{item.requirement ?? "—"}</td>
                    <td className="px-2 py-2 text-center">
                      <span className={`inline-flex items-center justify-center size-6 rounded-full text-xs font-bold ${getIqcChecklistResultColor(item.result)}`}>
                        {getIqcChecklistResultIcon(item.result)}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-foreground text-xs">{item.measuredValue ?? "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground text-xs max-w-[150px] truncate">{item.comment ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {report.linkedDefect && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium text-foreground">Related Defect</h2>
              <Link href={`/quality/supplier/defects/${report.linkedDefect.id}`} className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:underline">
                <LinkIcon className="size-3.5" />
                {report.linkedDefect.partNumber} — Defect raised from this inspection
              </Link>
            </div>
          )}

          {canUseLinkage ? (
            <RelatedQualityRecordsPanel
              groupedRecords={relatedRecords}
              sourceType="IQC"
              sourceId={id}
              canLink={false}
              manualLinks={manualLinks.map((l) => ({
                id: l.id,
                sourceType: l.sourceType,
                sourceId: l.sourceId,
                targetType: l.targetType,
                targetId: l.targetId,
                linkType: l.linkType,
                reason: l.reason,
              }))}
            />
          ) : (
            <UpgradeLinkageBanner />
          )}
        </div>

        <div>
          {report.events.length > 0 && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium text-foreground">Activity</h2>
              <div className="space-y-2">
                {report.events.slice(0, 15).map((e) => (
                  <div key={e.id} className="flex items-start gap-2 text-xs">
                    <span className="text-muted-foreground shrink-0">{e.createdAt.toLocaleDateString()}</span>
                    <span className="text-foreground">{(e.type as string).replace(/_/g, " ").toLowerCase()}</span>
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