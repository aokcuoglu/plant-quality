import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { canSubmit, canSupplierEdit, getFmeaStatusColor, getActionStatusColor, isFmeaOverdue, FMEA_STATUS_LABELS, FMEA_TYPE_LABELS } from "@/lib/fmea"
import { getOpenActionCount, getCompletedActionCount, getMaxRpn, type FmeaRow } from "@/lib/fmea/types"
import { SupplierFmeaActions } from "./SupplierFmeaActions"
import { SupplierFmeaRowEditor } from "./SupplierFmeaRowEditor"
import { requireFeature, normalizePlan, canUseFeature } from "@/lib/billing"
import type { FmeaStatus, FmeaActionStatus } from "@/generated/prisma/client"
import { RelatedQualityRecordsPanel, UpgradeLinkageBanner } from "@/components/quality-linkage/related-records-panel"
import { findRelatedForFmea } from "@/lib/quality-linkage"
import { clearSupplierNameCache } from "@/lib/quality-linkage/find-related"

export default async function SupplierFmeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "SUPPLIER") redirect("/quality/oem")

  const fmeaGate = requireFeature(session, "FMEA")
  if (!fmeaGate.allowed) redirect("/quality/supplier")

  const fmea = await prisma.fmea.findFirst({
    where: { id, supplierId: session.user.companyId },
    include: {
      oem: { select: { name: true } },
      responsible: { select: { name: true } },
      approvedBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
      createdBy: { select: { name: true } },
      events: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  })

  if (!fmea) notFound()

  const rows = (fmea.rows as FmeaRow[] | null) ?? []
  const maxRpn = getMaxRpn(rows)
  const openActions = getOpenActionCount(rows)
  const completedActions = getCompletedActionCount(rows)
  const canSubmitFmea = canSubmit(fmea.status as FmeaStatus)
  const canEditRows = canSupplierEdit(fmea.status as FmeaStatus)
  const overdue = isFmeaOverdue(fmea.dueDate, fmea.status as FmeaStatus)
  const isSupplierAdminOrQe = ["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)

  const plan = normalizePlan(session.user.plan)
  const canUseLinkage = canUseFeature(plan, "SUPPLIER", "QUALITY_LINKAGE")
  clearSupplierNameCache()
  const relatedRecords = canUseLinkage
    ? await findRelatedForFmea(id, { companyId: session.user.companyId, companyType: "SUPPLIER", role: session.user.role })
    : []
  const manualLinks = canUseLinkage
    ? await prisma.qualityRecordLink.findMany({
        where: {
          companyId: fmea.oemId,
          OR: [
            { sourceType: "FMEA", sourceId: id },
            { targetType: "FMEA", targetId: id },
          ],
        },
      })
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/quality/supplier/fmea" className="hover:text-foreground">FMEA</Link>
        <span>/</span>
        <span className="text-foreground">{fmea.fmeaNumber}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{fmea.title}</h1>
          <p className="text-sm text-muted-foreground">
            {FMEA_TYPE_LABELS[fmea.fmeaType]} — {fmea.partNumber} — Rev {fmea.revision ?? "A"}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${getFmeaStatusColor(fmea.status as FmeaStatus)}`}>
          {FMEA_STATUS_LABELS[fmea.status as FmeaStatus] ?? fmea.status.replaceAll("_", " ")}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h2 className="text-sm font-medium text-foreground">Summary</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="text-foreground">{fmea.fmeaType === "DESIGN" ? "Design FMEA (DFMEA)" : "Process FMEA (PFMEA)"}</dd>
              <dt className="text-muted-foreground">Part Number</dt>
              <dd className="text-foreground">{fmea.partNumber}</dd>
              {fmea.partName && <><dt className="text-muted-foreground">Part Name</dt><dd className="text-foreground">{fmea.partName}</dd></>}
              {fmea.processName && <><dt className="text-muted-foreground">Process</dt><dd className="text-foreground">{fmea.processName}</dd></>}
              <dt className="text-muted-foreground">OEM</dt>
              <dd className="text-foreground">{fmea.oem.name}</dd>
              <dt className="text-muted-foreground">Responsible</dt>
              <dd className="text-foreground">{fmea.responsible?.name ?? "—"}</dd>
              <dt className="text-muted-foreground">Total Rows</dt>
              <dd className="text-foreground">{rows.length}</dd>
              <dt className="text-muted-foreground">Max RPN</dt>
              <dd className={`font-semibold ${maxRpn >= 200 ? "text-red-400" : maxRpn >= 100 ? "text-amber-400" : "text-emerald-400"}`}>{maxRpn || "—"}</dd>
              <dt className="text-muted-foreground">Open Actions</dt>
              <dd className="text-foreground">{openActions}</dd>
              <dt className="text-muted-foreground">Completed Actions</dt>
              <dd className="text-foreground">{completedActions}</dd>
              <dt className="text-muted-foreground">Due Date</dt>
              <dd className={overdue ? "text-red-400" : "text-foreground"}>
                {fmea.dueDate ? fmea.dueDate.toLocaleDateString() : "—"}
                {overdue && " (Overdue)"}
              </dd>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="text-foreground">{fmea.createdAt.toLocaleDateString()}</dd>
              {fmea.submittedAt && <><dt className="text-muted-foreground">Submitted</dt><dd className="text-foreground">{fmea.submittedAt.toLocaleDateString()}</dd></>}
              {fmea.reviewedAt && <><dt className="text-muted-foreground">Reviewed</dt><dd className="text-foreground">{fmea.reviewedAt.toLocaleDateString()}</dd></>}
              {fmea.approvedAt && <><dt className="text-muted-foreground">Approved</dt><dd className="text-foreground">{fmea.approvedAt.toLocaleDateString()}</dd></>}
              {fmea.rejectionReason && <><dt className="text-muted-foreground">Rejection Reason</dt><dd className="text-red-400">{fmea.rejectionReason}</dd></>}
            </dl>
          </div>

          {isSupplierAdminOrQe && canEditRows ? (
            <div>
              <h2 className="text-sm font-medium text-foreground mb-2">Risk Matrix ({rows.length} rows) — Editable</h2>
              <SupplierFmeaRowEditor fmeaId={fmea.id} initialRows={rows} fmeaType={fmea.fmeaType} />
            </div>
          ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {fmea.fmeaType === "PROCESS" && <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Step</th>}
                  <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Failure Mode</th>
                  <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Effect</th>
                  <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-12">Sev</th>
                  <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Cause</th>
                  <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-12">Occ</th>
                  <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Ctrl</th>
                  <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-12">Det</th>
                  <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-14">RPN</th>
                  <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground min-w-[100px]">Action</th>
                  <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-20">Status</th>
                  <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-12">R-Sev</th>
                  <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-12">R-Occ</th>
                  <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-12">R-Det</th>
                  <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-14">R-RPN</th>
                  <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground min-w-[100px]">Supplier Comment</th>
                  <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground min-w-[100px]">OEM Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row, i) => (
                  <tr key={row.id ?? i} className={Number.isFinite(row.rpn) && row.rpn >= 200 ? "bg-red-500/5" : Number.isFinite(row.rpn) && row.rpn >= 100 ? "bg-amber-500/5" : ""}>
                    {fmea.fmeaType === "PROCESS" && <td className="px-2 py-2 text-foreground">{row.processStep ?? "—"}</td>}
                    <td className="max-w-[200px] truncate px-2 py-2 text-foreground">{row.failureMode || "—"}</td>
                    <td className="max-w-[200px] truncate px-2 py-2 text-muted-foreground">{row.failureEffect || "—"}</td>
                    <td className="px-2 py-2 text-center text-foreground">{row.severity}</td>
                    <td className="px-2 py-2 text-muted-foreground">{row.failureCause || "—"}</td>
                    <td className="px-2 py-2 text-center text-foreground">{row.occurrence}</td>
                    <td className="px-2 py-2 text-muted-foreground">{(row.preventionControl ?? row.currentControl) || "—"}</td>
                    <td className="px-2 py-2 text-center text-foreground">{row.detection}</td>
                    <td className={`px-2 py-2 text-center font-semibold ${row.rpn >= 200 ? "text-red-400" : row.rpn >= 100 ? "text-amber-400" : "text-emerald-400"}`}>{row.rpn}</td>
                    <td className="px-2 py-2 text-muted-foreground">{row.recommendedAction || "—"}</td>
                    <td className="px-2 py-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${getActionStatusColor((row.actionStatus ?? "OPEN") as FmeaActionStatus)}`}>
                        {(row.actionStatus ?? "OPEN").replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center text-foreground">{row.revisedSeverity ?? "—"}</td>
                    <td className="px-2 py-2 text-center text-foreground">{row.revisedOccurrence ?? "—"}</td>
                    <td className="px-2 py-2 text-center text-foreground">{row.revisedDetection ?? "—"}</td>
                    <td className={`px-2 py-2 text-center font-semibold ${(row.revisedRpn ?? 0) >= 200 ? "text-red-400" : (row.revisedRpn ?? 0) >= 100 ? "text-amber-400" : row.revisedRpn != null ? "text-emerald-400" : ""}`}>{row.revisedRpn ?? "—"}</td>
                    <td className="max-w-[150px] truncate px-2 py-2 text-muted-foreground">{row.supplierComment || "—"}</td>
                    <td className="max-w-[150px] truncate px-2 py-2 text-muted-foreground">{row.oemComment || "—"}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={fmea.fmeaType === "PROCESS" ? 17 : 16} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No rows added yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}

          {fmea.notes && (
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <h2 className="text-sm font-medium text-foreground">Notes</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{fmea.notes}</p>
            </div>
          )}

          {canUseLinkage ? (
            <RelatedQualityRecordsPanel
              groupedRecords={relatedRecords}
              sourceType="FMEA"
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

        <div className="space-y-4">
          {isSupplierAdminOrQe && canSubmitFmea && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium text-foreground">Actions</h2>
              <SupplierFmeaActions fmeaId={fmea.id} status={fmea.status as FmeaStatus} rows={rows} />
            </div>
          )}

          {fmea.events.length > 0 && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium text-foreground">Activity</h2>
              <div className="space-y-2">
                {fmea.events.slice(0, 20).map(e => (
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