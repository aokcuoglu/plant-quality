"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { SearchIcon, RefreshCwIcon } from "lucide-react"
import { FieldDefectStatusBadge } from "./FieldDefectStatusBadge"
import { FieldDefectSeverityBadge } from "./FieldDefectSeverityBadge"
import type { FieldDefectStatus, FieldDefectSeverity } from "@/generated/prisma/client"

interface SimilarIssue {
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
}

interface SimilarIssuesPanelProps {
  fieldDefectId: string
  similarIssues: SimilarIssue[]
  canManage: boolean
}

export function SimilarIssuesPanel({
  fieldDefectId,
  similarIssues,
  canManage,
}: SimilarIssuesPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleFindSimilar() {
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/field/${fieldDefectId}/ai/similar`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to find similar issues")
      } else {
        window.location.reload()
      }
    })
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <SearchIcon className="h-4 w-4 text-emerald-500" />
          Similar Issues
        </h2>
        {canManage && (
          <button
            onClick={handleFindSimilar}
            disabled={isPending}
            aria-label="Search for similar issues"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 px-3 py-1.5 text-xs font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <RefreshCwIcon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <SearchIcon className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
        )}
      </div>

      <div className="px-4 py-3">
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive mb-3">
            {error}
          </div>
        )}

        {similarIssues.length === 0 ? (
          <div className="text-center py-4">
            <SearchIcon className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No similar issues found.</p>
            <p className="text-xs text-muted-foreground mt-1">Click &ldquo;Refresh&rdquo; to search for related defects.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {similarIssues.map((issue) => (
              <div key={issue.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/quality/oem/field/${issue.id}`}
                    className="text-sm font-medium text-foreground hover:underline line-clamp-1"
                  >
                    {issue.title}
                  </Link>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <FieldDefectStatusBadge status={issue.status as FieldDefectStatus} />
                    <FieldDefectSeverityBadge severity={issue.severity as FieldDefectSeverity} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                  {issue.category && <span className="font-medium text-foreground">{issue.category}</span>}
                  {issue.subcategory && <span>{issue.subcategory}</span>}
                  {issue.supplierName && <span>{issue.supplierName}</span>}
                  {issue.vehicleModel && <span>{issue.vehicleModel}</span>}
                  {issue.partNumber && <span className="font-mono">{issue.partNumber}</span>}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {issue.similarityReasons.map((reason, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}