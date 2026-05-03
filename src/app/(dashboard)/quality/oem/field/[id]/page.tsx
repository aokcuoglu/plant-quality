import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import { normalizePlan, canUseFeature } from "@/lib/billing"
import Link from "next/link"
import { ArrowLeftIcon, PencilIcon, LinkIcon } from "lucide-react"
import { FieldDefectStatusBadge } from "@/components/field/FieldDefectStatusBadge"
import { FieldDefectSeverityBadge } from "@/components/field/FieldDefectSeverityBadge"
import { FieldDefectSourceBadge } from "@/components/field/FieldDefectSourceBadge"
import { EscalationBadge } from "@/components/field/EscalationBadge"
import { SlaStatusBadge } from "@/components/field/SlaStatusBadge"
import { ChangeStatusForm } from "./change-status-form"
import { AssignSupplierForm } from "./assign-supplier-form"
import { CommentSection } from "./comment-section"
import { ConvertTo8DButton } from "./convert-to-8d-button"
import { EscalateButton } from "./escalate-button"
import { SlaUpdateForm } from "./sla-update-form"
import { AiInsightPanel } from "@/components/field/AiInsightPanel"
import { SimilarIssuesPanel } from "@/components/field/SimilarIssuesPanel"
import { RelatedQualityRecordsPanel, UpgradeLinkageBanner } from "@/components/quality-linkage/related-records-panel"
import { DetailRow } from "@/components/DetailRow"
import { formatDueDate } from "@/lib/sla"
import { getFieldDefectSlaStatus, getFieldDefectActiveDueDate } from "@/lib/sla-field-defect"
import { isAiEnabled } from "@/lib/ai/provider"
import { findSimilarIssues } from "@/lib/ai/similar-issues"
import { findRelatedForFieldDefect } from "@/lib/quality-linkage"
import { clearSupplierNameCache } from "@/lib/quality-linkage/find-related"

export default async function OemFieldDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") redirect("/login")

  const { id } = await params

  const fd = await prisma.fieldDefect.findFirst({
    where: { id, oemId: session.user.companyId, deletedAt: null },
    include: {
      oem: { select: { name: true } },
      supplier: { select: { id: true, name: true } },
      createdBy: { select: { name: true, email: true } },
      updatedBy: { select: { name: true, email: true } },
      convertedBy: { select: { name: true, email: true } },
      escalatedBy: { select: { name: true, email: true } },
      linkedDefect: { select: { id: true, partNumber: true, description: true, status: true, eightDReport: { select: { id: true, ai8dReviews: { where: { companyId: session.user.companyId }, orderBy: { createdAt: "desc" }, take: 1, select: { id: true, status: true, score: true, resultJson: true, createdAt: true } } } } } },
      attachments: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      comments: { include: { author: { select: { name: true, email: true, companyId: true } } }, orderBy: { createdAt: "asc" } },
      events: { include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } },
    },
  })

  if (!fd) notFound()

  const canEdit = ["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role) && ["DRAFT", "OPEN", "UNDER_REVIEW", "SUPPLIER_ASSIGNED"].includes(fd.status)
  const canConvert = ["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role) && !fd.linkedDefectId && fd.supplierId && ["OPEN", "UNDER_REVIEW", "SUPPLIER_ASSIGNED"].includes(fd.status)
  const canChangeStatus = ["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)
  const canAssign = ["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role) && ["DRAFT", "OPEN", "UNDER_REVIEW"].includes(fd.status)
  const aiEnabled = isAiEnabled()
  const plan = normalizePlan(session.user.plan)
  const canUseAi = canUseFeature(plan, "OEM", "AI_CLASSIFICATION")
  const canUseSimilar = canUseFeature(plan, "OEM", "SIMILAR_ISSUES")

  const aiSuggestions = aiEnabled && canUseAi
    ? await prisma.aiSuggestion.findMany({
        where: { fieldDefectId: id, companyId: session.user.companyId },
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { name: true, email: true } },
          acceptedBy: { select: { name: true, email: true } },
          rejectedBy: { select: { name: true, email: true } },
        },
      })
    : []

  const similarIssueSuggestion = aiSuggestions.find(
    (s) => s.suggestionType === "SIMILAR_ISSUES" && s.status === "GENERATED",
  )

  const similarIssues: Array<{
    id: string
    title: string
    status: string
    severity: string
    supplierName: string | null
    vehicleModel: string | null
    partNumber: string | null
    partName: string | null
    similarityReasons: string[]
    similarityScore: number
    sourceType: string
    category: string | null
    subcategory: string | null
  }> = similarIssueSuggestion
    ? (similarIssueSuggestion.resultJson as Array<{
        id: string
        title: string
        status: string
        severity: string
        supplierName: string | null
        vehicleModel: string | null
        partNumber: string | null
        partName: string | null
        similarityReasons: string[]
        similarityScore: number
        sourceType: string
        category: string | null
        subcategory: string | null
      }>)
    : canUseSimilar && aiEnabled
      ? await findSimilarIssues(session.user.companyId, id, {
          title: fd.title,
          description: fd.description,
          partNumber: fd.partNumber,
          partName: fd.partName,
          vehicleModel: fd.vehicleModel,
          vin: fd.vin,
          supplierId: fd.supplierId,
          category: fd.category,
          subcategory: fd.subcategory,
          probableArea: fd.probableArea,
        })
      : []

  const slaStatus = getFieldDefectSlaStatus(fd)
  const activeDueDate = getFieldDefectActiveDueDate(fd)

  const canUseLinkage = canUseFeature(plan, "OEM", "QUALITY_LINKAGE")
  clearSupplierNameCache()
  const relatedRecords = canUseLinkage
    ? await findRelatedForFieldDefect(id, { companyId: session.user.companyId, companyType: "OEM", role: session.user.role })
    : []

  const manualLinks = canUseLinkage
    ? await prisma.qualityRecordLink.findMany({
        where: {
          companyId: session.user.companyId,
          OR: [
            { sourceType: "FIELD_DEFECT", sourceId: id },
            { targetType: "FIELD_DEFECT", targetId: id },
          ],
        },
      })
    : []

  function formatDate(d: Date | null) {
    if (!d) return "—"
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/quality/oem/field" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">{fd.title}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">Problem Details</h2>
            </div>
            <div className="px-4">
              <DetailRow label="Description" value={<p className="whitespace-pre-wrap">{fd.description}</p>} />
              <DetailRow label="Source" value={<FieldDefectSourceBadge source={fd.source} />} />
              <DetailRow label="Severity" value={<FieldDefectSeverityBadge severity={fd.severity} />} />
              <DetailRow label="Category" value={
                fd.category ? (
                  <span className="text-sm text-foreground">
                    {fd.category}{fd.subcategory ? ` / ${fd.subcategory}` : ""}
                    {fd.aiCategoryApplied && <span className="ml-2 text-xs font-medium text-emerald-500">(AI)</span>}
                  </span>
                ) : (
                  <span className="text-sm italic text-muted-foreground">Uncategorized</span>
                )
              } />
              {fd.probableArea && (
                <DetailRow label="Probable Area" value={
                  <span className="text-sm text-foreground">
                    {fd.probableArea}
                    {fd.aiCategoryApplied && <span className="ml-2 text-xs font-medium text-emerald-500">(AI)</span>}
                  </span>
                } />
              )}
              {fd.aiCategoryApplied && (
                <DetailRow label="Classification Source" value={<span className="text-xs font-medium text-emerald-500">AI-applied classification</span>} />
              )}
              <DetailRow label="Safety Impact" value={fd.safetyImpact ? <span className="text-destructive font-medium">Yes</span> : "No"} />
              <DetailRow label="Vehicle Down" value={fd.vehicleDown ? <span className="text-destructive font-medium">Yes</span> : "No"} />
              <DetailRow label="Repeat Issue" value={fd.repeatIssue ? <span className="text-amber-600 font-medium dark:text-amber-400">Yes</span> : "No"} />
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">Vehicle Information</h2>
            </div>
            <div className="px-4">
              <DetailRow label="VIN" value={fd.vin ? <span className="font-mono text-xs">{fd.vin}</span> : "\u2014"} />
              <DetailRow label="Vehicle Model" value={fd.vehicleModel} />
              <DetailRow label="Vehicle Variant" value={fd.vehicleVariant} />
              <DetailRow label="Mileage" value={fd.mileage ? `${fd.mileage.toLocaleString()} km` : "\u2014"} />
              <DetailRow label="Failure Date" value={formatDate(fd.failureDate)} />
              <DetailRow label="Report Date" value={formatDate(fd.reportDate)} />
              <DetailRow label="Location" value={fd.location} />
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">Part &amp; Supplier</h2>
            </div>
            <div className="px-4">
              <DetailRow label="Part Number" value={fd.partNumber ? <span className="font-mono">{fd.partNumber}</span> : "\u2014"} />
              <DetailRow label="Part Name" value={fd.partName} />
              <DetailRow label="Supplier" value={fd.supplier?.name ?? fd.supplierNameSnapshot ?? "\u2014"} />
            </div>
          </div>

          {fd.attachments.length > 0 && (
            <div className="rounded-lg border bg-card">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold">Attachments ({fd.attachments.length})</h2>
                <Link href={`/quality/oem/field/${id}/media`} className="text-xs text-muted-foreground hover:text-foreground">
                  Manage Media &rarr;
                </Link>
              </div>
              <div className="px-4 py-3 space-y-2">
                {fd.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={`/api/field/attachments/${att.storageKey}`}
                    className="flex items-center gap-2 text-sm text-foreground hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {att.fileName}
                    <span className="text-xs text-muted-foreground">({(att.fileSize / 1024).toFixed(1)} KB)</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {fd.linkedDefectId && fd.linkedDefect && (
            <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/20">
              <div className="px-4 py-3 border-b border-emerald-500/20">
                <h2 className="text-sm font-semibold text-foreground">Linked to 8D Report</h2>
              </div>
              <div className="px-4 py-3">
                <Link href={`/quality/oem/defects/${fd.linkedDefect.id}`} className="text-sm text-foreground hover:underline">
                  View 8D Report &rarr; (Defect #{fd.linkedDefect.partNumber})
                </Link>
                {fd.convertedTo8DAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Converted on {formatDate(fd.convertedTo8DAt)}
                    {fd.convertedBy && ` by ${fd.convertedBy.name ?? fd.convertedBy.email}`}
                  </p>
                )}
                {fd.linkedDefect.eightDReport?.ai8dReviews?.[0] && (
                  <div className="mt-2 flex items-center gap-2">
                    {(() => {
                      const r = fd.linkedDefect.eightDReport.ai8dReviews[0]
                      const raw = r.resultJson as Record<string, unknown> | null
                      const overallScore = typeof raw?.overallScore === "number" ? raw.overallScore : null
                      const reviewStatus = typeof raw?.reviewStatus === "string" ? raw.reviewStatus : null
                      const statusLabel = r.status === "GENERATED" ? "Pending" : r.status === "REVIEWED" ? "Reviewed" : r.status === "REJECTED" ? "Rejected" : r.status
                      const reviewLabel = reviewStatus === "STRONG" ? "Strong" : reviewStatus === "NEEDS_IMPROVEMENT" ? "Needs Improvement" : reviewStatus === "INCOMPLETE" ? "Incomplete" : reviewStatus === "RISKY" ? "Risky" : null
                      return (
                        <>
                          <span className="text-xs text-muted-foreground">AI Review:</span>
                          <span className="text-xs font-medium text-foreground">{overallScore ?? "—"}/100</span>
                          {reviewLabel && (
                            <span className={`text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full ${
                              reviewStatus === "STRONG" ? "bg-emerald-500/10 text-emerald-500" :
                              reviewStatus === "NEEDS_IMPROVEMENT" ? "bg-amber-500/10 text-amber-500" :
                              reviewStatus === "INCOMPLETE" || reviewStatus === "RISKY" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                            }`}>
                              {reviewLabel}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">({statusLabel})</span>
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-6">
          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">Overview</h2>
            </div>
            <div className="px-4 divide-y divide-border">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Status</span>
                <FieldDefectStatusBadge status={fd.status} />
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Severity</span>
                <FieldDefectSeverityBadge severity={fd.severity} />
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Source</span>
                <FieldDefectSourceBadge source={fd.source} />
              </div>
              <div className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-muted-foreground">SLA Status</span>
                <SlaStatusBadge status={slaStatus} />
              </div>
              {fd.escalationLevel !== "NONE" && (
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-muted-foreground">Escalation</span>
                  <EscalationBadge level={fd.escalationLevel} />
                </div>
              )}
              {(fd.responseDueAt || fd.resolutionDueAt || activeDueDate) && (
                <div className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-muted-foreground">
                    {fd.responseDueAt ? "Response Due" : fd.resolutionDueAt ? "Resolution Due" : "Active Due"}
                  </span>
                  <span>{formatDueDate(fd.responseDueAt ?? fd.resolutionDueAt ?? activeDueDate!)}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(fd.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-muted-foreground">Created By</span>
                <span>{fd.createdBy?.name ?? fd.createdBy?.email ?? "\u2014"}</span>
              </div>
              {fd.updatedAt && fd.updatedBy && (
                <div className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{formatDate(fd.updatedAt)}</span>
                </div>
              )}
              {fd.escalationReason && (
                <div className="py-2.5">
                  <span className="text-xs text-muted-foreground">Escalation Reason</span>
                  <p className="mt-0.5 text-sm text-foreground">{fd.escalationReason}</p>
                </div>
              )}
              {fd.escalatedBy && (
                <div className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-muted-foreground">Escalated By</span>
                  <span>{fd.escalatedBy.name ?? fd.escalatedBy.email}</span>
                </div>
              )}
              {fd.escalatedAt && (
                <div className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-muted-foreground">Escalated At</span>
                  <span>{formatDate(fd.escalatedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {canChangeStatus && (
            <ChangeStatusForm fieldDefectId={id} currentStatus={fd.status} />
          )}

          {canAssign && (
            <AssignSupplierForm fieldDefectId={id} currentSupplierId={fd.supplierId} />
          )}

          {(canEdit || canConvert) && (
            <div className="rounded-lg border bg-card">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold">Actions</h2>
              </div>
              <div className="px-4 py-3 space-y-1.5">
                {canEdit && (
                  <Link
                    href={`/quality/oem/field/${id}/edit`}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <PencilIcon className="h-4 w-4" />
                    Edit Field Defect
                  </Link>
                )}
                <Link
                  href={`/quality/oem/field/${id}/media`}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <LinkIcon className="h-4 w-4" />
                  Manage Attachments
                </Link>
                {canConvert && (
                  <ConvertTo8DButton fieldDefectId={id} />
                )}
                {canEdit && !["CLOSED", "CANCELLED", "LINKED_TO_8D"].includes(fd.status) && (
                  <SlaUpdateForm
                    fieldDefectId={id}
                    currentResponseDue={fd.responseDueAt}
                    currentResolutionDue={fd.resolutionDueAt}
                  />
                )}
                {canEdit && fd.escalationLevel !== "LEVEL_3" && !["CLOSED", "CANCELLED", "DRAFT", "LINKED_TO_8D"].includes(fd.status) && (
                  <EscalateButton fieldDefectId={id} currentLevel={fd.escalationLevel} />
                )}
              </div>
            </div>
          )}

          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">Activity</h2>
            </div>
            <div className="px-4 py-3 max-h-64 overflow-y-auto">
              {fd.events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet</p>
              ) : (
                <div className="space-y-2">
                  {fd.events.map((event) => (
                    <div key={event.id} className="text-xs">
                      <span className="text-muted-foreground">
                        {event.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="ml-2 text-foreground">
                        {event.actor?.name ?? event.actor?.email ?? "System"} &mdash;{" "}
                        {event.type.replace(/_/g, " ").toLowerCase().replace(/^field defect /, "")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <AiInsightPanel
            fieldDefectId={id}
            suggestions={aiSuggestions.map((s) => ({
              id: s.id,
              suggestionType: s.suggestionType,
              status: s.status,
              resultJson: s.resultJson as Record<string, unknown>,
              confidence: s.confidence,
              createdAt: s.createdAt.toISOString(),
              createdBy: s.createdBy ? { name: s.createdBy.name, email: s.createdBy.email } : null,
              acceptedBy: s.acceptedBy ? { name: s.acceptedBy.name, email: s.acceptedBy.email } : null,
              rejectedBy: s.rejectedBy ? { name: s.rejectedBy.name, email: s.rejectedBy.email } : null,
              acceptedAt: s.acceptedAt?.toISOString() ?? null,
              rejectedAt: s.rejectedAt?.toISOString() ?? null,
            }))}
            aiEnabled={aiEnabled}
            plan={plan}
            canManage={canEdit}
          />

          <SimilarIssuesPanel
            fieldDefectId={id}
            similarIssues={similarIssues}
            canManage={canEdit}
            canUseSimilar={canUseSimilar}
          />

          {canUseLinkage ? (
            <RelatedQualityRecordsPanel
              groupedRecords={relatedRecords}
              sourceType="FIELD_DEFECT"
              sourceId={id}
              canLink={canEdit}
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
      </div>

      <CommentSection fieldDefectId={id} comments={fd.comments} />
    </div>
  )
}