"use client"

import { useState } from "react"
import { EVENT_META, type EventMeta } from "@/lib/event-labels"
import type { DefectEventType } from "@/generated/prisma/client"

export interface AuditTimelineEvent {
  id: string
  type: DefectEventType
  actor: { name: string | null; email?: string | null } | null
  metadata: unknown
  createdAt: Date | string
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v)
}

interface AuditTimelineProps {
  events: AuditTimelineEvent[]
  initialLimit?: number
}

const DEFAULT_LIMIT = 8

function formatEventDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function formatMetadataSummary(metadata: unknown): string | null {
  if (!isRecord(metadata)) return null
  const m = metadata
  const parts: string[] = []

  if (m.previousStatus && m.nextStatus) {
    const fmt = (s: unknown) => String(s).replace(/_/g, " ").toLowerCase()
    parts.push(`${fmt(m.previousStatus)} → ${fmt(m.nextStatus)}`)
  }
  if (m.revisionNo !== undefined && m.revisionNo !== null) parts.push(`Rev ${m.revisionNo}`)
  if (m.stepId) parts.push(`Step ${m.stepId}`)
  if (m.section) parts.push(String(m.section))
  if (m.fileName) parts.push(String(m.fileName))
  if (m.commentId) parts.push("comment")
  if (m.source) parts.push(`Source: ${m.source}`)
  if (m.previousLevel && m.newLevel) {
    const fmt = (s: unknown) => String(s).replace(/_/g, " ").toLowerCase()
    parts.push(`${fmt(m.previousLevel)} → ${fmt(m.newLevel)}`)
  }
  if (m.reason) parts.push(String(m.reason))
  if (m.partNumber) parts.push(`Part: ${m.partNumber}`)
  if (m.imageCount) parts.push(`${m.imageCount} image${Number(m.imageCount) > 1 ? "s" : ""}`)
  if (m.openCommentCount) parts.push(`${m.openCommentCount} open comment${Number(m.openCommentCount) > 1 ? "s" : ""}`)

  return parts.length > 0 ? parts.join(" · ") : null
}

export function AuditTimeline({ events, initialLimit = DEFAULT_LIMIT }: AuditTimelineProps) {
  const [showAll, setShowAll] = useState(false)
  const sorted = [...events].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const visible = showAll ? sorted : sorted.slice(0, initialLimit)

  if (events.length === 0) {
    return (
      <div className="rounded-lg border bg-card px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">No activity recorded</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="divide-y rounded-lg border bg-card">
        {visible.map((event) => {
          const meta = (EVENT_META[event.type] as EventMeta | undefined) ?? { label: event.type.replace(/_/g, " ").toLowerCase(), description: "", icon: () => null, iconColor: "text-muted-foreground" }
          const Icon = meta.icon
          const actorName = event.actor?.name || event.actor?.email || "System"
          const time = formatEventDate(event.createdAt)
          const detail = formatMetadataSummary(event.metadata)

          return (
            <div key={event.id} className="flex items-start gap-3 px-4 py-3">
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted ${meta.iconColor}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {meta.label}
                </p>
                {detail && (
                  <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {actorName} &middot; {time}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      {events.length > initialLimit && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAll ? "Show less" : `Show all ${events.length} events`}
        </button>
      )}
    </div>
  )
}