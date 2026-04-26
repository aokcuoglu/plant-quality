import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
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
import { DetailRow } from "@/components/DetailRow"
import { formatDueDate } from "@/lib/sla"
import { getFieldDefectSlaStatus, getFieldDefectActiveDueDate } from "@/lib/sla-field-defect"
import { isAiEnabled } from "@/lib/ai/provider"
import { findSimilarIssues } from "@/lib/ai/similar-issues"

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
      linkedDefect: { select: { id: true, partNumber: true, description: true, status: true } },
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
  const isPro = session.user.plan === "PRO"

  const aiSuggestions = aiEnabled && isPro
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
    : await findSimilarIssues(session.user.companyId, id, {
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

  const slaStatus = getFieldDefectSlaStatus(fd)
  const activeDueDate = getFieldDefectActiveDueDate(fd)

  function formatDate(d: Date | null) {
    if (!d) return "—"
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/quality/oem/field" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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
              <DetailRow label="Report Date" value={formatDate(fd.reportDate)} />
              <DetailRow label="Location" value={fd.location} />
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">Part & Supplier</h2>
            </div>
            <div className="px-4">
              <DetailRow label="Part Number" value={fd.partNumber ? <span className="font-mono">{fd.partNumber}</span> : "—"} />
              <DetailRow label="Part Name" value={fd.partName} />
              <DetailRow label="Supplier" value={fd.supplier?.name ?? fd.supplierNameSnapshot ?? "—"} />
            </div>
          </div>

          {fd.attachments.length > 0 && (
            <div className="rounded-lg border bg-card">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold">Attachments ({fd.attachments.length})</h2>
                <Link href={`/quality/oem/field/${id}/media`} className="text-xs text-emerald-500 hover:text-emerald-600">
                  Manage Media →
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
            <div className="rounded-lg border bg-emerald-500/10">
              <div className="px-4 py-3 border-b border-emerald-500/20">
                <h2 className="text-sm font-semibold text-emerald-400">Linked to 8D Report</h2>
              </div>
              <div className="px-4 py-3">
                <Link href={`/quality/oem/defects/${fd.linkedDefect.id}`} className="text-sm text-emerald-400 hover:underline">
                  View 8D Report → (Defect #{fd.linkedDefect.partNumber})
                </Link>
                {fd.convertedTo8DAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Converted on {formatDate(fd.convertedTo8DAt)}
                    {fd.convertedBy && ` by ${fd.convertedBy.name ?? fd.convertedBy.email}`}
                  </p>
                )}
              </div>
            </div>
          )}

          <CommentSection fieldDefectId={id} comments={fd.comments} />
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
                <span className="text-muted-foreground">Created By</span>
                <span>{fd.createdBy?.name ?? fd.createdBy?.email ?? "—"}</span>
              </div>
              {fd.updatedAt && fd.updatedBy && (
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{formatDate(fd.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">SLA & Escalation</h2>
            </div>
            <div className="px-4 space-y-3">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">SLA Status</span>
                <SlaStatusBadge status={slaStatus} />
              </div>
              {fd.escalationLevel !== "NONE" && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-muted-foreground">Escalation</span>
                  <EscalationBadge level={fd.escalationLevel} />
                </div>
              )}
              {fd.responseDueAt && (
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted-foreground">Response Due</span>
                  <span>{formatDueDate(fd.responseDueAt)}</span>
                </div>
              )}
              {fd.resolutionDueAt && (
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted-foreground">Resolution Due</span>
                  <span>{formatDueDate(fd.resolutionDueAt)}</span>
                </div>
              )}
              {activeDueDate && !fd.responseDueAt && !fd.resolutionDueAt && (
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted-foreground">Active Due</span>
                  <span>{formatDueDate(activeDueDate)}</span>
                </div>
              )}
              {fd.escalationReason && (
                <div className="py-1">
                  <span className="text-xs text-muted-foreground">Escalation Reason</span>
                  <p className="mt-0.5 text-sm text-foreground">{fd.escalationReason}</p>
                </div>
              )}
              {fd.escalatedBy && (
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted-foreground">Escalated By</span>
                  <span>{fd.escalatedBy.name ?? fd.escalatedBy.email}</span>
                </div>
              )}
              {fd.escalatedAt && (
                <div className="flex items-center justify-between py-1 text-sm">
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
              <div className="px-4 py-3 space-y-2">
                {canEdit && (
                  <Link
                    href={`/quality/oem/field/${id}/edit`}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <PencilIcon className="h-4 w-4" />
                    Edit Field Defect
                  </Link>
                )}
                <Link
                  href={`/quality/oem/field/${id}/media`}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted transition-colors"
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
                        {event.actor?.name ?? event.actor?.email ?? "System"} —{" "}
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
            isPro={isPro}
            canManage={canEdit}
          />

          <SimilarIssuesPanel
            fieldDefectId={id}
            similarIssues={similarIssues}
            canManage={canEdit}
          />
        </div>
      </div>
    </div>
  )
}