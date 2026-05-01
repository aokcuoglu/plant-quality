"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateUpgradeRequestStatus } from "@/app/(dashboard)/_actions/upgrade-requests"
import type { UpgradeRequestStatus } from "@/generated/prisma/client"

interface UpgradeRequestRow {
  id: string
  currentPlan: string
  requestedPlan: string
  sourceFeature: string | null
  message: string | null
  status: UpgradeRequestStatus
  adminNote: string | null
  createdAt: string
  requestedBy: { name: string | null; email: string } | null
  resolvedBy: { name: string | null; email: string } | null
  resolvedAt: string | null
}

const STATUS_STYLES: Record<UpgradeRequestStatus, string> = {
  OPEN: "bg-blue-500/10 text-blue-500",
  CONTACTED: "bg-amber-500/10 text-amber-500",
  APPROVED: "bg-emerald-500/10 text-emerald-500",
  REJECTED: "bg-destructive/10 text-destructive",
  CLOSED: "bg-muted text-muted-foreground",
}

const STATUS_LABELS: Record<UpgradeRequestStatus, string> = {
  OPEN: "Open",
  CONTACTED: "Contacted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CLOSED: "Closed",
}

const PLAN_LABELS: Record<string, string> = {
  FREE: "Free",
  BASIC: "Free",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
}

export function UpgradeRequestList({ requests }: { requests: UpgradeRequestRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function handleStatusChange(requestId: string, newStatus: UpgradeRequestStatus) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await updateUpgradeRequestStatus(requestId, newStatus)
        if (result.success) {
          router.refresh()
        } else {
          setError(result.error ?? "Failed to update request status")
        }
      } catch {
        setError("An unexpected error occurred. Please try again.")
      }
    })
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No upgrade requests yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {requests.map((req) => {
        const isExpanded = expandedId === req.id
        const nextActions: UpgradeRequestStatus[] =
          req.status === "OPEN"
            ? ["CONTACTED", "APPROVED", "REJECTED", "CLOSED"]
            : req.status === "CONTACTED"
              ? ["APPROVED", "REJECTED", "CLOSED"]
              : req.status === "APPROVED" || req.status === "REJECTED"
                ? ["CLOSED"]
                : []

        return (
          <div key={req.id} className="rounded-lg border bg-card">
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : req.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {PLAN_LABELS[req.currentPlan] ?? req.currentPlan}
                </span>
                <span className="text-xs text-muted-foreground">&rarr;</span>
                <span className="text-sm font-medium text-emerald-500">
                  {PLAN_LABELS[req.requestedPlan] ?? req.requestedPlan}
                </span>
                {req.sourceFeature && (
                  <span className="text-xs text-muted-foreground">
                    ({req.sourceFeature.replace(/_/g, " ")})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full ${STATUS_STYLES[req.status]}`}>
                  {STATUS_LABELS[req.status]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(req.createdAt).toLocaleDateString()}
                </span>
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-border px-4 py-3 space-y-2">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Requested by: </span>
                    <span className="text-foreground">{req.requestedBy?.name ?? req.requestedBy?.email ?? "\u2014"}</span>
                  </div>
                  {req.resolvedBy && (
                    <div>
                      <span className="text-muted-foreground">Resolved by: </span>
                      <span className="text-foreground">{req.resolvedBy.name ?? req.resolvedBy.email}</span>
                    </div>
                  )}
                  {req.resolvedAt && (
                    <div>
                      <span className="text-muted-foreground">Resolved at: </span>
                      <span className="text-foreground">{new Date(req.resolvedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                {req.message && (
                  <div>
                    <span className="text-xs text-muted-foreground">Message:</span>
                    <p className="text-sm text-foreground">{req.message}</p>
                  </div>
                )}
                {req.adminNote && (
                  <div>
                    <span className="text-xs text-muted-foreground">Admin note:</span>
                    <p className="text-sm text-foreground">{req.adminNote}</p>
                  </div>
                )}
                {nextActions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {nextActions.map((action) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => handleStatusChange(req.id, action)}
                        disabled={isPending}
                        className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        Mark {STATUS_LABELS[action]}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground pt-1">
                  Billing integration is not enabled. Approval does not automatically change the plan.
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}