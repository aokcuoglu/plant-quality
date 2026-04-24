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
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  addReviewComment,
  approveReport,
  rejectReport,
} from "@/app/(dashboard)/oem/defects/actions/review"

type DefectStatus = "OPEN" | "IN_PROGRESS" | "WAITING_APPROVAL" | "RESOLVED" | "REJECTED"
type CompanyType = "OEM" | "SUPPLIER"

interface ReviewComment {
  id: string
  stepId: string
  comment: string
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

interface DefectDetail {
  id: string
  partNumber: string
  description: string
  status: DefectStatus
  imageUrls: string[]
  createdAt: Date
  supplierName: string
  oemName: string
  eightDSubmitted: boolean
  eightDReport: EightDReportInfo | null
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
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
                <div className="mb-1 text-xs font-medium text-foreground">
                  {c.author.name ?? "OEM"}
                </div>
                <p className="text-xs text-muted-foreground">{c.comment}</p>
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
      </CardHeader>
      <CardContent className="space-y-3">
        {report.reviewSections.map((section) => (
          <div key={section.stepId} className="rounded-lg border p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{section.label}</span>
              {section.comments.length > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-[10px] font-medium text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                  {section.comments.length}
                </span>
              )}
            </div>

            {section.content || (section.rows && section.rows.length > 0) ? (
              <SectionContent section={section} />
            ) : (
              <p className="text-xs italic text-muted-foreground">Not provided</p>
            )}

            {section.comments.length > 0 && (
              <div className="mt-2 space-y-1 border-t pt-2">
                {section.comments.map((c) => (
                  <div key={c.id} className="flex gap-2 rounded-md bg-muted/50 p-2 text-xs">
                    <span className="shrink-0 font-medium text-foreground">
                      {c.author.name ?? "OEM"}:
                    </span>
                    <span className="text-muted-foreground">{c.comment}</span>
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
        </CardHeader>
        <CardContent className="space-y-3">
          {report.reviewSections.map((section) => (
            <div
              key={section.stepId}
              className={cn(
                "rounded-lg border p-3",
                section.comments.length > 0 && "border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-950/10",
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

              {section.comments.length > 0 && defect.status !== "WAITING_APPROVAL" && (
                <div className="mt-2 space-y-1 border-t pt-2">
                  {section.comments.map((c) => (
                    <div key={c.id} className="flex gap-2 text-xs">
                      <span className="shrink-0 font-medium text-foreground">
                        {c.author.name ?? "OEM"}:
                      </span>
                      <span className="text-muted-foreground">{c.comment}</span>
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
            onClick={() =>
              startReject(async () => {
                await rejectReport(defect.id)
                router.refresh()
              })
            }
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
            onClick={() =>
              startApprove(async () => {
                await approveReport(defect.id)
                router.refresh()
              })
            }
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

export function DefectDetailView({
  defect,
  companyType,
}: {
  defect: DefectDetail
  companyType: CompanyType
}) {
  const backHref = companyType === "OEM" ? "/oem/defects" : "/supplier/defects"

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
            <OemReviewPanel defect={defect} />
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
            </CardContent>
          </Card>

          {/* Supplier action button */}
          {companyType === "SUPPLIER" && supplierActionLabel && (
            <a
              href={`/supplier/defects/${defect.id}/8d`}
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
