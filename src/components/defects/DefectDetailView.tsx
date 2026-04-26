/* eslint-disable @next/next/no-img-element */
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  ArrowLeftIcon,
  XIcon,
  MessageSquareIcon,
  MessageSquareTextIcon,
  CheckIcon,
  XCircleIcon,
  SendHorizonalIcon,
  Loader2Icon,
  DownloadIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
} from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DefectEventType } from "@/generated/prisma/client"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/ui/status-badge"
import { DefectTimeline } from "./DefectTimeline"
import { ExportEightDButton } from "./ExportEightDButton"
import { toast } from "@/components/ui/use-toast"
import { formatDueDate, getActionOwnerLabel, getActiveDueDate, isDefectOverdue } from "@/lib/sla"
import { updateDefectOwnershipAndSla } from "@/app/(dashboard)/defects/ownership-actions"
import { formatEvidenceSectionLabel } from "@/lib/evidence"
import {
  addReviewComment,
  approveReport,
  rejectReport,
  reopenReviewComment,
  resolveReviewComment,
} from "@/app/(dashboard)/quality/oem/defects/actions/review"

type DefectStatus = "OPEN" | "IN_PROGRESS" | "WAITING_APPROVAL" | "RESOLVED" | "REJECTED"
type CompanyType = "OEM" | "SUPPLIER"
type ActionOwner = "OEM" | "SUPPLIER" | "NONE"
type EvidenceSection = "D3" | "D5" | "D6" | "D7"

interface UserOption {
  id: string
  name: string | null
  email: string
}

interface ReviewComment {
  id: string
  stepId: string
  comment: string
  status: "OPEN" | "RESOLVED"
  supplierResponse: string | null
  resolvedAt: Date | null
  author: { name: string | null }
  createdAt: Date
}

export interface ReviewSectionRow {
  cells: string[]
}

export interface ReviewSection {
  stepId: string
  label: string
  headers?: string[]
  rows?: ReviewSectionRow[]
  content?: string | null
  comments: ReviewComment[]
}

interface EightDReportInfo {
  id: string
  submittedAt: Date | null
  reviewSections: ReviewSection[]
}

interface DefectEvidenceFile {
  id: string
  section: EvidenceSection
  fileName: string
  mimeType: string
  sizeBytes: number
  uploaderName: string
  createdAt: Date
  downloadUrl: string
  canRemove: boolean
}

interface DefectDetail {
  id: string
  partNumber: string
  description: string
  status: DefectStatus
  imageUrls: string[]
  createdAt: Date
  supplierName: string
  oemName: string
  oemOwnerId: string | null
  oemOwnerName: string | null
  supplierAssigneeId: string | null
  supplierAssigneeName: string | null
  supplierResponseDueAt: Date | null
  eightDSubmissionDueAt: Date | null
  oemReviewDueAt: Date | null
  revisionDueAt: Date | null
  currentActionOwner: ActionOwner
  oemUsers: UserOption[]
  supplierUsers: UserOption[]
  canEditSla: boolean
  canEditSupplierAssignee: boolean
  canSelfAssign: boolean
  canUploadEvidence: boolean
  evidenceReady: boolean
  evidences: DefectEvidenceFile[]
  eightDSubmitted: boolean
  eightDReport: EightDReportInfo | null
  events: {
    id: string
    type: DefectEventType
    actor: { name: string | null } | null
    metadata: unknown
    createdAt: Date
  }[]
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

function ImageThumbnail({ src }: { src: string }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button type="button" className="overflow-hidden rounded-lg border ring-offset-background transition-all hover:ring-2 hover:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        }
      >
        <img src={src} alt="" className="h-32 w-full object-cover" />
      </DialogTrigger>
      <DialogContent className="max-w-3xl sm:max-w-[90vw]" showCloseButton={false}>
        <div className="flex items-center justify-center p-2">
          <img src={src} alt="Defect image" className="max-h-[80vh] rounded-lg object-contain" />
        </div>
        <DialogClose
          render={
            <button
              type="button"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <XIcon className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          }
        />
      </DialogContent>
    </Dialog>
  )
}

function CommentModal({
  section,
  onAddComment,
  defectId,
}: {
  section: ReviewSection
  onAddComment: (defectId: string, stepId: string, comment: string) => Promise<void>
  defectId: string
}) {
  const [text, setText] = useState("")
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const hasComments = section.comments.length > 0

  const handleSubmit = () => {
    if (!text.trim()) return
    startTransition(async () => {
      await onAddComment(defectId, section.stepId, text.trim())
      setText("")
    })
  }

  const handleResolve = (commentId: string) => {
    startTransition(async () => {
      await resolveReviewComment(commentId)
    })
  }

  const handleReopen = (commentId: string) => {
    startTransition(async () => {
      await reopenReviewComment(commentId)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
              hasComments
                ? "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                : "text-muted-foreground hover:bg-muted",
            )}
          />
        }
      >
        {hasComments ? (
          <MessageSquareTextIcon className="h-3.5 w-3.5" />
        ) : (
          <MessageSquareIcon className="h-3.5 w-3.5" />
        )}
        {hasComments && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[10px] font-medium text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
            {section.comments.length}
          </span>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Comments — {section.label}</DialogTitle>
          <DialogDescription>
            Add or review feedback for this section
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-60 space-y-3 overflow-y-auto">
          {section.comments.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No comments yet. Add feedback for the supplier below.
            </p>
          ) : (
            section.comments.map((c) => (
              <div key={c.id} className="rounded-lg border bg-card p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="text-xs font-medium text-foreground">
                    {c.author.name ?? "OEM"}
                  </div>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    c.status === "OPEN"
                      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                      : "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
                  )}>
                    {c.status === "OPEN" ? "Open" : "Resolved"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{c.comment}</p>
                {c.supplierResponse && (
                  <div className="mt-2 rounded-md bg-muted/60 p-2 text-xs">
                    <span className="font-medium text-foreground">Supplier response: </span>
                    <span className="text-muted-foreground">{c.supplierResponse}</span>
                  </div>
                )}
                <div className="mt-2 flex justify-end">
                  {c.status === "OPEN" ? (
                    <button
                      type="button"
                      onClick={() => handleResolve(c.id)}
                      disabled={pending}
                      className="text-xs font-medium text-green-700 hover:underline disabled:opacity-50"
                    >
                      Mark resolved
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleReopen(c.id)}
                      disabled={pending}
                      className="text-xs font-medium text-amber-700 hover:underline disabled:opacity-50"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex w-full gap-2 pt-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment..."
            className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim() || pending}
            className="flex items-center justify-center rounded-md bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {pending ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizonalIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SectionContent({ section }: { section: ReviewSection }) {
  if (section.rows && section.headers) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              {section.headers.map((h, i) => (
                <th key={i} className="px-3 py-1.5 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row, ri) => (
              <tr key={ri} className="border-b last:border-0">
                {row.cells.map((cell, ci) => (
                  <td key={ci} className="px-3 py-1.5">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (section.content) {
    return <p className="whitespace-pre-wrap text-sm">{section.content}</p>
  }

  return <p className="text-xs italic text-muted-foreground">Not provided</p>
}

function evidenceSectionForStep(stepId: string): EvidenceSection | null {
  if (stepId === "d3_containment") return "D3"
  if (stepId === "d5_actions") return "D5"
  if (stepId === "d6_actions") return "D6"
  if (stepId === "d7_preventive") return "D7"
  return null
}

function ReadOnlyEvidenceList({
  defect,
  section,
}: {
  defect: DefectDetail
  section: EvidenceSection
}) {
  const files = defect.evidences.filter((item) => item.section === section)

  return (
    <div className="mt-3 border-t pt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{formatEvidenceSectionLabel(section)}</p>
        <Badge variant={files.length > 0 ? "outline" : "secondary"} className="text-[10px]">
          {files.length > 0 ? `${files.length} files` : "Missing"}
        </Badge>
      </div>

      {files.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">No evidence files uploaded.</p>
      ) : (
        <div className="space-y-1.5">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5">
              <div className="min-w-0">
                <a
                  href={file.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={file.fileName}
                  className="block truncate text-xs font-medium hover:underline"
                >
                  {file.fileName}
                </a>
                <p className="text-[11px] text-muted-foreground">
                  {formatFileSize(file.sizeBytes)} · {file.uploaderName}
                </p>
              </div>
              <a
                href={file.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border hover:bg-muted"
                aria-label="Download evidence"
              >
                <DownloadIcon className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SupplierReportView({ defect }: { defect: DefectDetail }) {
  const report = defect.eightDReport
  if (!report) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          8D Report
          {report.submittedAt && (
            <Badge variant="outline" className="text-xs">
              Submitted {formatDate(new Date(report.submittedAt))}
            </Badge>
          )}
        </CardTitle>
        <CardAction>
          <ExportEightDButton
            defectId={defect.id}
            partNumber={defect.partNumber}
            eightDData={report.reviewSections}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {report.reviewSections.map((section) => (
          <div key={section.stepId} className="rounded-lg border p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{section.label}</span>
              {section.comments.length > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-[10px] font-medium text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                {section.comments.filter((c) => c.status === "OPEN").length || section.comments.length}
                </span>
              )}
            </div>

            {section.content || (section.rows && section.rows.length > 0) ? (
              <SectionContent section={section} />
            ) : (
              <p className="text-xs italic text-muted-foreground">Not provided</p>
            )}

            {evidenceSectionForStep(section.stepId) && (
              <ReadOnlyEvidenceList defect={defect} section={evidenceSectionForStep(section.stepId)!} />
            )}

            {section.comments.length > 0 && (
              <div className="mt-2 space-y-1 border-t pt-2">
                {section.comments.map((c) => (
                  <div key={c.id} className="rounded-md bg-muted/50 p-2 text-xs">
                    <div className="flex gap-2">
                      <span className="shrink-0 font-medium text-foreground">
                        {c.author.name ?? "OEM"}:
                      </span>
                      <span className="text-muted-foreground">{c.comment}</span>
                    </div>
                    {c.supplierResponse && (
                      <div className="mt-1 text-muted-foreground">
                        <span className="font-medium text-foreground">Response:</span> {c.supplierResponse}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function OemReviewPanel({
  defect,
}: {
  defect: DefectDetail
}) {
  const router = useRouter()
  const [approving, startApprove] = useTransition()
  const [rejecting, startReject] = useTransition()
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false)
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false)
  const report = defect.eightDReport

  const handleAddComment = async (defectId: string, stepId: string, comment: string) => {
    await addReviewComment(defectId, stepId, comment)
  }

  if (!report) return null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            8D Report Review
            {defect.status !== "WAITING_APPROVAL" && (
              <Badge variant="secondary" className="text-xs">
                {defect.status === "RESOLVED" ? "Approved" : defect.status === "REJECTED" ? "Rejected" : "Draft"}
              </Badge>
            )}
          </CardTitle>
          <CardAction>
            <ExportEightDButton
              defectId={defect.id}
              partNumber={defect.partNumber}
              eightDData={report.reviewSections}
            />
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3">
          {report.reviewSections.map((section) => (
            <div
              key={section.stepId}
              className={cn(
                "rounded-lg border p-3",
                section.comments.some((c) => c.status === "OPEN") && "border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-950/10",
                !section.content && !section.rows?.length && "opacity-50",
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{section.label}</span>
                {defect.status === "WAITING_APPROVAL" && (
                  <CommentModal section={section} onAddComment={handleAddComment} defectId={defect.id} />
                )}
              </div>

              {section.content || (section.rows && section.rows.length > 0) ? (
                <SectionContent section={section} />
              ) : (
                <p className="text-xs italic text-muted-foreground">Not provided</p>
              )}

              {evidenceSectionForStep(section.stepId) && (
                <ReadOnlyEvidenceList defect={defect} section={evidenceSectionForStep(section.stepId)!} />
              )}

              {section.comments.length > 0 && defect.status !== "WAITING_APPROVAL" && (
                <div className="mt-2 space-y-1 border-t pt-2">
                  {section.comments.map((c) => (
                    <div key={c.id} className="text-xs">
                      <div className="flex gap-2">
                        <span className="shrink-0 font-medium text-foreground">
                          {c.author.name ?? "OEM"}:
                        </span>
                        <span className="text-muted-foreground">{c.comment}</span>
                      </div>
                      {c.supplierResponse && (
                        <div className="mt-1 pl-2 text-muted-foreground">
                          <span className="font-medium text-foreground">Supplier response:</span> {c.supplierResponse}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {report.submittedAt && (
            <p className="text-xs text-muted-foreground">
              Submitted on {formatDate(new Date(report.submittedAt))}
            </p>
          )}
        </CardContent>
      </Card>

      {defect.status === "WAITING_APPROVAL" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmRejectOpen(true)}
            disabled={rejecting}
            className={cn(
              buttonVariants({ variant: "destructive", className: "flex-1" }),
            )}
          >
            {rejecting ? (
              <Loader2Icon className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <XCircleIcon className="mr-1 h-4 w-4" />
            )}
            Request Revision
          </button>
          <button
            type="button"
            onClick={() => setConfirmApproveOpen(true)}
            disabled={approving}
            className={cn(
              buttonVariants({ className: "flex-1" }),
            )}
          >
            {approving ? (
              <Loader2Icon className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <CheckIcon className="mr-1 h-4 w-4" />
            )}
            Approve
          </button>
        </div>
      )}

      <Dialog open={confirmRejectOpen} onOpenChange={setConfirmRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
            <DialogDescription>
              Are you sure you want to request a revision? The supplier will be notified to update the report.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              disabled={rejecting}
              onClick={() => {
                startReject(async () => {
                  try {
                    const result = await rejectReport(defect.id)
                    if (!result.success) {
                      toast({ title: "Revision request blocked", description: result.error, type: "destructive" })
                      return
                    }
                    setConfirmRejectOpen(false)
                    router.refresh()
                  } catch {
                    toast({ title: "Revision request failed", description: "Please try again.", type: "destructive" })
                  }
                })
              }}
            >
              {rejecting && <Loader2Icon className="mr-1 h-4 w-4 animate-spin" />}
              Request Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmApproveOpen} onOpenChange={setConfirmApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Report</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this 8D report? This will mark the defect as resolved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              disabled={approving}
              onClick={() => {
                startApprove(async () => {
                  try {
                    const result = await approveReport(defect.id)
                    if (!result.success) {
                      toast({ title: "Approval blocked", description: result.error, type: "destructive" })
                      return
                    }
                    setConfirmApproveOpen(false)
                    router.refresh()
                  } catch {
                    toast({ title: "Approval failed", description: "Please try again.", type: "destructive" })
                  }
                })
              }}
            >
              {approving && <Loader2Icon className="mr-1 h-4 w-4 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {defect.status === "RESOLVED" && (
        <div className="rounded-lg border border-green-200 bg-green-50/50 px-4 py-3 text-center text-sm text-green-700 dark:border-green-900 dark:bg-green-950/20 dark:text-green-400">
          Report approved and closed.
        </div>
      )}

      {defect.status === "REJECTED" && (
        <div className="rounded-lg border border-red-200 bg-red-50/50 px-4 py-3 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
          Revision requested — supplier has been notified to update the report.
        </div>
      )}
    </div>
  )
}

function toDateInputValue(date: Date | null) {
  if (!date) return ""
  return new Date(date).toISOString().slice(0, 10)
}

function OwnershipSlaPanel({
  defect,
  companyType,
}: {
  defect: DefectDetail
  companyType: CompanyType
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [oemOwnerId, setOemOwnerId] = useState(defect.oemOwnerId ?? "")
  const [supplierAssigneeId, setSupplierAssigneeId] = useState(defect.supplierAssigneeId ?? "")
  const [supplierResponseDueAt, setSupplierResponseDueAt] = useState(toDateInputValue(defect.supplierResponseDueAt))
  const [eightDSubmissionDueAt, setEightDSubmissionDueAt] = useState(toDateInputValue(defect.eightDSubmissionDueAt))
  const [oemReviewDueAt, setOemReviewDueAt] = useState(toDateInputValue(defect.oemReviewDueAt))
  const [revisionDueAt, setRevisionDueAt] = useState(toDateInputValue(defect.revisionDueAt))
  const canEdit = defect.canEditSla || defect.canEditSupplierAssignee || defect.canSelfAssign

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateDefectOwnershipAndSla(defect.id, formData)
      if (!result.success) {
        toast({ title: "Update failed", description: result.error, type: "destructive" })
        return
      }
      toast({ title: "Ownership updated", description: "SLA and assignment details were saved.", type: "info" })
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ownership & SLA</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-3">
          {companyType === "OEM" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">OEM Owner</label>
              <select
                name="oemOwnerId"
                value={oemOwnerId}
                onChange={(e) => setOemOwnerId(e.target.value)}
                disabled={!defect.canEditSla}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
              >
                <option value="">Unassigned</option>
                {defect.oemUsers.map((user) => (
                  <option key={user.id} value={user.id}>{user.name ?? user.email}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Supplier Assignee</label>
            <select
              name="supplierAssigneeId"
              value={supplierAssigneeId}
              onChange={(e) => setSupplierAssigneeId(e.target.value)}
              disabled={!(defect.canEditSla || defect.canEditSupplierAssignee)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
            >
              <option value="">Unassigned</option>
              {defect.supplierUsers.map((user) => (
                <option key={user.id} value={user.id}>{user.name ?? user.email}</option>
              ))}
            </select>
          </div>

          {defect.canSelfAssign && !defect.supplierAssigneeId && (
            <input type="hidden" name="supplierAssigneeId" value="" />
          )}

          {companyType === "OEM" && (
            <div className="grid gap-2">
              {[
                { name: "supplierResponseDueAt", label: "Supplier Response Due", value: supplierResponseDueAt, onChange: setSupplierResponseDueAt },
                { name: "eightDSubmissionDueAt", label: "8D Submission Due", value: eightDSubmissionDueAt, onChange: setEightDSubmissionDueAt },
                { name: "oemReviewDueAt", label: "OEM Review Due", value: oemReviewDueAt, onChange: setOemReviewDueAt },
                { name: "revisionDueAt", label: "Revision Due", value: revisionDueAt, onChange: setRevisionDueAt },
              ].map((field) => (
                <div key={field.name} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                  <input
                    type="date"
                    name={field.name}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    disabled={!defect.canEditSla}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
                  />
                </div>
              ))}
            </div>
          )}

          {canEdit && (
            <button
              type="submit"
              disabled={pending}
              className={cn(buttonVariants({ size: "sm", className: "w-full" }))}
            >
              {pending ? <Loader2Icon className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              {defect.canSelfAssign && !defect.supplierAssigneeId && companyType === "SUPPLIER" ? "Assign to Me" : "Save Ownership & SLA"}
            </button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

export function DefectDetailView({
  defect,
  companyType,
}: {
  defect: DefectDetail
  companyType: CompanyType
}) {
  const backHref = companyType === "OEM" ? "/quality/oem/defects" : "/quality/supplier/defects"
  const activeDueDate = getActiveDueDate(defect)
  const overdue = isDefectOverdue(defect)

  const supplierActionLabel =
    defect.status === "OPEN"
      ? "Start 8D Report"
      : defect.status === "IN_PROGRESS" || defect.status === "REJECTED"
        ? "Continue 8D Report"
        : null

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to {companyType === "OEM" ? "Defects" : "Reports"}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Left column */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{defect.partNumber}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Reported on {formatDate(defect.createdAt)}
            </p>
          </div>

          {companyType === "OEM" && defect.status === "WAITING_APPROVAL" && defect.eightDReport ? (
            <>
              <OemReviewPanel defect={defect} />
            </>
          ) : (
            <>
              <div className="rounded-lg border bg-card p-4">
                <h2 className="mb-2 text-sm font-medium text-muted-foreground">Description</h2>
                <p className="text-sm leading-relaxed">{defect.description}</p>
              </div>

              {companyType === "SUPPLIER" && defect.eightDReport && (
                <SupplierReportView defect={defect} />
              )}

              {companyType === "OEM" && defect.eightDReport && defect.status !== "WAITING_APPROVAL" && (
                <OemReviewPanel defect={defect} />
              )}

              {defect.imageUrls.length > 0 && (
                <div>
                  <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                    Attached Images ({defect.imageUrls.length})
                  </h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {defect.imageUrls.map((url, i) => (
                      <ImageThumbnail key={`${url}-${i}`} src={url} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Process Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge status={defect.status} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Opened</span>
                <span className="text-sm font-medium">{formatDate(defect.createdAt)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Action Required By</span>
                <Badge variant={defect.currentActionOwner === "NONE" ? "secondary" : "outline"}>
                  {getActionOwnerLabel(defect)}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Due Date</span>
                <span className={cn(
                  "text-sm font-medium",
                  overdue && "rounded-full bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300",
                )}>
                  {overdue ? `Overdue · ${formatDueDate(activeDueDate)}` : formatDueDate(activeDueDate)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">OEM Owner</span>
                <span className="text-sm font-medium">{defect.oemOwnerName ?? "Unassigned"}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Supplier Assignee</span>
                <span className="text-sm font-medium">{defect.supplierAssigneeName ?? "Unassigned"}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {companyType === "OEM" ? "Supplier" : "Customer"}
                </span>
                <span className="text-sm font-medium">
                  {companyType === "OEM" ? defect.supplierName : defect.oemName}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">8D Report</span>
                <Badge variant={defect.eightDSubmitted ? "default" : "secondary"}>
                  {defect.eightDSubmitted ? "Submitted" : "Not Started"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Evidence</span>
                <Badge variant={defect.evidenceReady ? "default" : "secondary"}>
                  {defect.evidenceReady ? "Ready" : "Missing Required"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <OwnershipSlaPanel
            key={[
              defect.oemOwnerId,
              defect.supplierAssigneeId,
              defect.supplierResponseDueAt?.toISOString(),
              defect.eightDSubmissionDueAt?.toISOString(),
              defect.oemReviewDueAt?.toISOString(),
              defect.revisionDueAt?.toISOString(),
            ].join(":")}
            defect={defect}
            companyType={companyType}
          />

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <DefectTimeline events={defect.events} />
            </CardContent>
          </Card>

          {/* Supplier action button */}
          {companyType === "SUPPLIER" && supplierActionLabel && (
            <a
              href={`/quality/supplier/defects/${defect.id}/8d`}
              className={cn(
                buttonVariants({
                  variant: defect.status === "OPEN" ? "default" : "outline",
                  className: "w-full",
                }),
              )}
            >
              {supplierActionLabel}
            </a>
          )}

          {companyType === "SUPPLIER" && defect.status === "WAITING_APPROVAL" && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3 text-center text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-400">
              Report submitted — awaiting customer approval
            </div>
          )}

          {companyType === "SUPPLIER" && defect.status === "REJECTED" && (
            <div className="rounded-lg border border-rose-200 bg-rose-50/50 px-4 py-3 text-center text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-400">
              <p className="font-medium">Revision Requested</p>
              <p className="mt-1 text-xs">The customer has requested changes to the 8D report.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export type { DefectDetail, DefectStatus, CompanyType }
