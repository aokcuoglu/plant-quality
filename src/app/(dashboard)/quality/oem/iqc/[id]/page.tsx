import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { requireFeature, normalizePlan, canUseFeature } from "@/lib/billing"
import { getIqcStatusColor, getIqcResultColor, IQC_STATUS_LABELS, IQC_RESULT_LABELS, IQC_INSPECTION_TYPE_LABELS, isNegativeResult, canManageIqc } from "@/lib/iqc"
import { LinkIcon } from "lucide-react"
import { IqcChecklistEditor } from "./checklist-editor"
import { CompleteInspectionDialog } from "./complete-dialog"
import { CancelInspectionButton } from "./cancel-button"
import { CreateDefectFromIqcButton } from "./create-defect-button"
import { RelatedQualityRecordsPanel, UpgradeLinkageBanner } from "@/components/quality-linkage/related-records-panel"
import { findRelatedForIqc } from "@/lib/quality-linkage"
import { clearSupplierNameCache } from "@/lib/quality-linkage/find-related"

export default async function OemIqcDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const featureGate = requireFeature(session, "IQC")
  if (!featureGate.allowed) redirect("/quality/oem")

  const report = await prisma.iqcReport.findUnique({
    where: { id },
    include: {
      supplier: { select: { name: true } },
      inspector: { select: { name: true, email: true } },
      checklistItems: { orderBy: { createdAt: "asc" } },
      events: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      linkedDefect: { select: { id: true, partNumber: true, description: true, status: true } },
      createdBy: { select: { name: true, email: true } },
      completedBy: { select: { name: true, email: true } },
    },
  })

  if (!report || report.oemId !== session.user.companyId) notFound()

  const checklistItems = report.checklistItems.map((c) => ({
    id: c.id,
    itemName: c.itemName,
    requirement: c.requirement,
    result: c.result,
    measuredValue: c.measuredValue,
    comment: c.comment,
  }))

  const hasNokItems = checklistItems.some((c) => c.result === "NOK")
  const canComplete = ["PLANNED", "IN_PROGRESS"].includes(report.status) && canManageIqc(session)
  const canCancel = ["PLANNED", "IN_PROGRESS"].includes(report.status) && canManageIqc(session)
  const canCreateDefect = report.result && isNegativeResult(report.result) && !report.linkedDefectId && canManageIqc(session)
  const isEditable = canComplete

  const plan = normalizePlan(session.user.plan)
  const canUseLinkage = canUseFeature(plan, "OEM", "QUALITY_LINKAGE")
  clearSupplierNameCache()
  const relatedRecords = canUseLinkage
    ? await findRelatedForIqc(id, { companyId: session.user.companyId, companyType: "OEM", role: session.user.role })
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
        <Link href="/quality/oem/iqc" className="hover:text-foreground">IQC</Link>
        <span>/</span>
        <span className="text-foreground">{report.inspectionNumber}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {report.inspectionNumber}
          </h1>
          <p className="text-sm text-muted-foreground">
            {report.partNumber}{report.partName ? ` — ${report.partName}` : ""} &middot; {report.supplier.name}
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
            <h2 className="text-sm font-medium text-foreground">Inspection Details</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Inspection Number</dt>
              <dd className="text-foreground font-mono text-xs">{report.inspectionNumber}</dd>
              <dt className="text-muted-foreground">Part Number</dt>
              <dd className="text-foreground">{report.partNumber}</dd>
              {report.partName && (<><dt className="text-muted-foreground">Part Name</dt><dd className="text-foreground">{report.partName}</dd></>)}
              <dt className="text-muted-foreground">Supplier</dt>
              <dd className="text-foreground">{report.supplier.name}</dd>
              <dt className="text-muted-foreground">Inspector</dt>
              <dd className="text-foreground">{report.inspector?.name ?? "—"}</dd>
              <dt className="text-muted-foreground">Inspection Type</dt>
              <dd className="text-foreground">{IQC_INSPECTION_TYPE_LABELS[report.inspectionType] ?? report.inspectionType.replace(/_/g, " ")}</dd>
              <dt className="text-muted-foreground">Quantity Received</dt>
              <dd className="text-foreground">{report.quantityReceived}</dd>
              <dt className="text-muted-foreground">Inspection Quantity</dt>
              <dd className="text-foreground">{report.inspectionQuantity || "—"}</dd>
              {report.lotNumber && (<><dt className="text-muted-foreground">Lot Number</dt><dd className="text-foreground">{report.lotNumber}</dd></>)}
              {report.batchNumber && (<><dt className="text-muted-foreground">Batch Number</dt><dd className="text-foreground">{report.batchNumber}</dd></>)}
              {report.purchaseOrder && (<><dt className="text-muted-foreground">Purchase Order</dt><dd className="text-foreground">{report.purchaseOrder}</dd></>)}
              {report.vehicleModel && (<><dt className="text-muted-foreground">Vehicle Model</dt><dd className="text-foreground">{report.vehicleModel}</dd></>)}
              {report.projectName && (<><dt className="text-muted-foreground">Project</dt><dd className="text-foreground">{report.projectName}</dd></>)}
              {report.samplingPlan && (<><dt className="text-muted-foreground">Sampling Plan</dt><dd className="text-foreground">{report.samplingPlan}</dd></>)}
              <dt className="text-muted-foreground">Inspection Date</dt>
              <dd className="text-foreground">{report.inspectionDate?.toLocaleDateString() ?? "—"}</dd>
              {report.quantityAccepted > 0 && (<><dt className="text-muted-foreground">Accepted / Rejected</dt><dd className="text-foreground">{report.quantityAccepted} / {report.quantityRejected}</dd></>)}
              <dt className="text-muted-foreground">Created By</dt>
              <dd className="text-foreground">{report.createdBy?.name ?? "—"}</dd>
              {report.completedAt && (<><dt className="text-muted-foreground">Completed</dt><dd className="text-foreground">{report.completedAt.toLocaleDateString()} by {report.completedBy?.name ?? "—"}</dd></>)}
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

          <IqcChecklistEditor items={checklistItems} editable={isEditable} />

          {report.linkedDefect && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium text-foreground">Linked Defect</h2>
              <Link href={`/quality/oem/defects/${report.linkedDefect.id}`} className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:underline">
                <LinkIcon className="size-3.5" />
                {report.linkedDefect.partNumber} — {report.linkedDefect.description.length > 80 ? report.linkedDefect.description.slice(0, 80) + "..." : report.linkedDefect.description}
              </Link>
            </div>
          )}

          {canUseLinkage ? (
            <RelatedQualityRecordsPanel
              groupedRecords={relatedRecords}
              sourceType="IQC"
              sourceId={id}
              canLink={canManageIqc(session)}
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

        <div className="space-y-4">
          {(canComplete || canCancel || canCreateDefect) && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium text-foreground">Actions</h2>
              <div className="space-y-2">
                {canComplete && <CompleteInspectionDialog inspectionId={report.id} hasNokItems={hasNokItems} />}
                {canCancel && <CancelInspectionButton inspectionId={report.id} />}
                {canCreateDefect && <CreateDefectFromIqcButton inspectionId={report.id} />}
              </div>
            </div>
          )}

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