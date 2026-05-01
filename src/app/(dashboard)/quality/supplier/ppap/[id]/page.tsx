import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { PPAP_STATUS_LABELS, getPpapStatusColor, PPAP_REQUIREMENTS, isPpapOverdue } from "@/lib/ppap"
import { requireFeature } from "@/lib/billing"
import { SupplierPpapActions } from "./SupplierPpapActions"
import { SupplierDocumentUpload } from "./SupplierDocumentUpload"

export default async function SupplierPpapDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "SUPPLIER") redirect("/quality/oem")
  const ppapGate = requireFeature(session, "PPAP")
  if (!ppapGate.allowed) redirect("/quality/supplier")

  const ppap = await prisma.ppapSubmission.findFirst({
    where: { id, supplierId: session.user.companyId },
    include: {
      oem: { select: { name: true } },
      oemOwner: { select: { name: true, email: true } },
      supplierAssignee: { select: { name: true, email: true } },
      evidences: { where: { deletedAt: null }, orderBy: [{ status: "asc" }, { requirement: "asc" }] },
      reviewComments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      events: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  })

  if (!ppap) notFound()

  const canUpload = ["REQUESTED", "SUPPLIER_IN_PROGRESS", "REVISION_REQUIRED"].includes(ppap.status)
  const canSubmit = ["REQUESTED", "SUPPLIER_IN_PROGRESS", "REVISION_REQUIRED"].includes(ppap.status)
  const allUploaded = ppap.evidences.length > 0 && ppap.evidences.every((e) => e.status !== "MISSING")

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
        <Link href="/quality/supplier/ppap" className="hover:text-foreground">PPAP</Link>
        <span>/</span>
        <span className="text-foreground">{ppap.requestNumber}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {ppap.partNumber} — {ppap.partName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Rev {ppap.revision} &middot; {ppap.level.replace("LEVEL_", "Level ")} &middot; {ppap.oem.name} &middot; {reasonMap[ppap.reasonForSubmission] ?? ppap.reasonForSubmission}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${getPpapStatusColor(ppap.status)}`}>
          {PPAP_STATUS_LABELS[ppap.status] ?? ppap.status}
        </span>
      </div>

      {canSubmit && (
        <SupplierPpapActions
          ppapId={ppap.id}
          allUploaded={allUploaded}
          totalDocs={ppap.evidences.length}
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
              <dt className="text-muted-foreground">OEM</dt>
              <dd className="text-foreground">{ppap.oem.name}</dd>
              <dt className="text-muted-foreground">OEM Reviewer</dt>
              <dd className="text-foreground">{ppap.oemOwner?.name ?? "Unassigned"}</dd>
              <dt className="text-muted-foreground">Level</dt>
              <dd className="text-foreground">{ppap.level.replace("LEVEL_", "Level ")}</dd>
              <dt className="text-muted-foreground">Reason</dt>
              <dd className="text-foreground">{reasonMap[ppap.reasonForSubmission] ?? ppap.reasonForSubmission}</dd>
              <dt className="text-muted-foreground">Due Date</dt>
              <dd className="text-foreground">
                {ppap.dueDate
                  ? isPpapOverdue(ppap.dueDate, ppap.status)
                    ? <span className="text-red-400 font-medium">{ppap.dueDate.toLocaleDateString()} (Overdue)</span>
                    : ppap.dueDate.toLocaleDateString()
                  : "—"}
              </dd>
            </dl>
            {ppap.notes && (
              <div className="border-t border-border pt-3">
                <dt className="text-xs font-medium text-muted-foreground">OEM Notes</dt>
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
              <span className="text-xs text-muted-foreground">
                {ppap.evidences.filter((e) => e.status !== "MISSING").length}/{ppap.evidences.length} uploaded
              </span>
            </div>
            <div className="space-y-2">
              {ppap.evidences.map((e) => (
                <SupplierDocumentUpload
                  key={e.id}
                  evidence={{
                    id: e.id,
                    requirement: e.requirement,
                    status: e.status,
                    fileName: e.fileName,
                    sizeBytes: e.sizeBytes,
                    supplierComment: e.supplierComment,
                    oemComment: e.oemComment,
                  }}
                  ppapId={ppap.id}
                  canUpload={canUpload}
                  requirementLabel={PPAP_REQUIREMENTS.find((r) => r.key === e.requirement)?.label ?? e.requirement.replace(/_/g, " ")}
                />
              ))}
            </div>
          </div>

          {ppap.reviewComments.length > 0 && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-medium text-foreground">OEM Review Comments ({ppap.reviewComments.length})</h2>
              <div className="space-y-3">
                {ppap.reviewComments.filter((c) => c.author).map((c) => (
                    <div key={c.id} className="border-l-2 border-border pl-3">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-foreground">{c.author?.name ?? "Unknown"}</p>
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