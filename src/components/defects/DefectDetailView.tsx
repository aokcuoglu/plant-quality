/* eslint-disable @next/next/no-img-element */
import Link from "next/link"
import { ArrowLeftIcon, XIcon } from "lucide-react"
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
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/ui/status-badge"

type DefectStatus = "OPEN" | "IN_PROGRESS" | "WAITING_APPROVAL" | "RESOLVED" | "REJECTED"
type CompanyType = "OEM" | "SUPPLIER"

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
              className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
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
      : defect.status === "IN_PROGRESS"
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

          <div className="rounded-lg border bg-card p-4">
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Description</h2>
            <p className="text-sm leading-relaxed">{defect.description}</p>
          </div>

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
              className={cn(buttonVariants({ className: "w-full" }))}
            >
              {supplierActionLabel}
            </a>
          )}

          {companyType === "SUPPLIER" && defect.status === "WAITING_APPROVAL" && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3 text-center text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-400">
              Report submitted — awaiting customer approval
            </div>
          )}

          {/* OEM action buttons */}
          {companyType === "OEM" && (
            <div className="flex gap-2">
              <button
                disabled={defect.status !== "WAITING_APPROVAL"}
                className={cn(
                  buttonVariants({ variant: "outline", className: "flex-1" }),
                  defect.status !== "WAITING_APPROVAL" && "",
                )}
              >
                Review
              </button>
              <button
                disabled={defect.status === "RESOLVED"}
                className={cn(
                  buttonVariants({ variant: "outline", className: "flex-1" }),
                )}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export type { DefectDetail, DefectStatus, CompanyType }
