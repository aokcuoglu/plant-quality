import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { PPAP_STATUS_LABELS, getPpapStatusColor, PPAP_REQUIREMENTS } from "@/lib/ppap"
import { PpapDetailActions } from "./PpapDetailActions"
import { PpapDocumentReview } from "./PpapDocumentReview"
import { PpapReviewCommentForm } from "./PpapReviewCommentForm"

export default async function OemPpapDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const ppap = await prisma.ppapSubmission.findUnique({
    where: { id },
    include: {
      supplier: { select: { name: true } },
      oemOwner: { select: { name: true, email: true } },
      supplierAssignee: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
      rejectedBy: { select: { name: true, email: true } },
      evidences: {
        where: { deletedAt: null },
        orderBy: [{ status: "asc" }, { requirement: "asc" }],
        include: { reviewedBy: { select: { name: true } } },
      },
      reviewComments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      events: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  })

  if (!ppap || ppap.oemId !== session.user.companyId) notFound()

  const canReview = ["SUBMITTED", "UNDER_REVIEW"].includes(ppap.status)
  const canCancel = ["DRAFT", "REQUESTED", "SUPPLIER_IN_PROGRESS"].includes(ppap.status)

  const requirements = (ppap.requirements ?? {}) as Record<string, boolean>
  const requiredKeys = Object.entries(requirements).filter(([, v]) => v).map(([k]) => k)

  const totalRequired = requiredKeys.length
  const approvedDocs = ppap.evidences.filter((e) => e.status === "APPROVED").length
  const missingDocs = ppap.evidences.filter((e) => e.status === "MISSING" || e.status === "REVISION_REQUIRED").length
  const uploadedDocs = ppap.evidences.filter((e) => e.status === "UPLOADED" || e.status === "UNDER_REVIEW").length

  const reasonMap: Record<string, string> = {
    NEW_PART: "New Part",
    ENGINEERING_CHANGE: "Engineering Change",
    SUPPLIER_CHANGE: "Supplier Change",
    PROCESS_CHANGE: "Process Change",
    TOOLING_CHANGE: "Tooling Change",
    ANNUAL_REVALIDATION: "Annual Revalidation",
    CORRECTIVE_ACTION_FOLLOW_UP: "Corrective Action Follow-up",
    OTHER: "Other",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/quality/oem/ppap" className="hover:text-foreground">PPAP</Link>
        <span>/</span>
        <span className="text-foreground">{ppap.requestNumber}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {ppap.partNumber} — {ppap.partName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {ppap.level.replace("LEVEL_", "Level ")} &middot; Rev {ppap.revision} &middot; {reasonMap[ppap.reasonForSubmission] ?? ppap.reasonForSubmission}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${getPpapStatusColor(ppap.status)}`}>
          {PPAP_STATUS_LABELS[ppap.status] ?? ppap.status}
        </span>
      </div>

      {canReview && (
        <PpapDetailActions
          ppapId={ppap.id}
          status={ppap.status}
          hasAllDocsApproved={missingDocs === 0 && uploadedDocs === 0}
        />
      )}
      {canCancel && (
        <PpapDetailActions
          ppapId={ppap.id}
          status={ppap.status}
          canCancel
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h2 className="text-sm font-medium text-foreground">Request Details</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Request #</dt>
              <dd className="text-foreground font-medium">{ppap.requestNumber}</dd>
              <dt className="text-muted-foreground">Part Number</dt>
              <dd className="text-foreground">{ppap.partNumber}</dd>
              <dt className="text-muted-foreground">Part Name</dt>
              <dd className="text-foreground">{ppap.partName}</dd>
              {ppap.projectName && <>
                <dt className="text-muted-foreground">Project</dt>
                <dd className="text-foreground">{ppap.projectName}</dd>
              </>}
              {ppap.vehicleModel && <>
                <dt className="text-muted-foreground">Vehicle Model</dt>
                <dd className="text-foreground">{ppap.vehicleModel}</dd>
              </>}
              {ppap.revisionLevel && <>
                <dt className="text-muted-foreground">Revision Level</dt>
                <dd className="text-foreground">{ppap.revisionLevel}</dd>
              </>}
              {ppap.drawingNumber && <>
                <dt className="text-muted-foreground">Drawing Number</dt>
                <dd className="text-foreground">{ppap.drawingNumber}</dd>
              </>}
              <dt className="text-muted-foreground">Supplier</dt>
              <dd className="text-foreground">{ppap.supplier.name}</dd>
              <dt className="text-muted-foreground">OEM Owner</dt>
              <dd className="text-foreground">{ppap.oemOwner?.name ?? "Unassigned"}</dd>
              <dt className="text-muted-foreground">Supplier Assignee</dt>
              <dd className="text-foreground">{ppap.supplierAssignee?.name ?? "Unassigned"}</dd>
              <dt className="text-muted-foreground">Level</dt>
              <dd className="text-foreground">{ppap.level.replace("LEVEL_", "Level ")}</dd>
              <dt className="text-muted-foreground">Reason</dt>
              <dd className="text-foreground">{reasonMap[ppap.reasonForSubmission] ?? ppap.reasonForSubmission}</dd>
              <dt className="text-muted-foreground">Due Date</dt>
              <dd className="text-foreground">{ppap.dueDate?.toLocaleDateString() ?? "—"}</dd>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="text-foreground">{ppap.createdAt.toLocaleDateString()}</dd>
              {ppap.submittedAt && <>
                <dt className="text-muted-foreground">Submitted</dt>
                <dd className="text-foreground">{ppap.submittedAt.toLocaleDateString()}</dd>
              </>}
              {ppap.reviewedAt && <>
                <dt className="text-muted-foreground">Reviewed</dt>
                <dd className="text-foreground">{ppap.reviewedAt.toLocaleDateString()} {ppap.reviewedBy && `by ${ppap.reviewedBy.name}`}</dd>
              </>}
              {ppap.approvedAt && <>
                <dt className="text-muted-foreground">Approved</dt>
                <dd className="text-foreground">{ppap.approvedAt.toLocaleDateString()} {ppap.approvedBy && `by ${ppap.approvedBy.name}`}</dd>
              </>}
              {ppap.rejectedAt && <>
                <dt className="text-muted-foreground">Rejected</dt>
                <dd className="text-foreground">{ppap.rejectedAt.toLocaleDateString()} {ppap.rejectedBy && `by ${ppap.rejectedBy.name}`}</dd>
              </>}
            </dl>
            {ppap.notes && (
              <div className="border-t border-border pt-3">
                <dt className="text-xs font-medium text-muted-foreground">Notes</dt>
                <dd className="mt-1 text-sm text-foreground whitespace-pre-wrap">{ppap.notes}</dd>
              </div>
            )}
            {ppap.rejectionReason && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-1">
                <h3 className="text-sm font-medium text-destructive">Rejection / Revision Reason</h3>
                <p className="text-sm text-muted-foreground">{ppap.rejectionReason}</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">Document Checklist</h2>
              <span className="text-xs text-muted-foreground">{approvedDocs}/{totalRequired} approved &middot; {missingDocs} missing &middot; {uploadedDocs} pending review</span>
            </div>
            <div className="space-y-2">
              {ppap.evidences.map((e) => (
                <PpapDocumentReview
                  key={e.id}
                  evidence={e}
                  canReview={canReview}
                  requirementLabel={PPAP_REQUIREMENTS.find((r) => r.key === e.requirement)?.label ?? e.requirement.replace(/_/g, " ")}
                />
              ))}
            </div>
          </div>

          {ppap.supplierNotes && (
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <h2 className="text-sm font-medium text-foreground">Supplier Notes</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ppap.supplierNotes}</p>
            </div>
          )}

          {ppap.reviewComments.length > 0 && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium text-foreground">Review Comments ({ppap.reviewComments.length})</h2>
              <div className="space-y-3">
                {ppap.reviewComments.map((c) => (
                  <div key={c.id} className="border-l-2 border-border pl-3">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-foreground">{c.author.name}</p>
                      <span className="text-xs text-muted-foreground">{c.createdAt.toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{c.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {canReview && (
            <PpapReviewCommentForm ppapId={ppap.id} requirements={PPAP_REQUIREMENTS.map((r) => ({ key: r.key, label: r.label }))} />
          )}

          {ppap.events.length > 0 && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium text-foreground">Activity</h2>
              <div className="space-y-2">
                {ppap.events.slice(0, 20).map((e) => (
                  <div key={e.id} className="flex items-start gap-2 text-xs">
                    <span className="shrink-0 text-muted-foreground">{e.createdAt.toLocaleDateString()}</span>
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