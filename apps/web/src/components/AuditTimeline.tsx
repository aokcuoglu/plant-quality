"use client"

import { Button } from "@/components/ui/button"

import { useState } from "react"
import { EVENT_META, type EventMeta } from "@/lib/event-labels"
import type { DefectEventType } from "@plantx/db/client"

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

function groupTimelineEvents(events: AuditTimelineEvent[]): AuditTimelineEvent[] {
  const COALESCE_MS = 5 * 60 * 1000 // 5 minutes
  const grouped: AuditTimelineEvent[] = []
  let i = 0

  while (i < events.length) {
    const current = events[i]
    if (current.type !== "EIGHT_D_STEP_SAVED") {
      grouped.push(current)
      i++
      continue
    }

    const actorId = current.actor?.email ?? current.actor?.name ?? ""
    const batch: AuditTimelineEvent[] = [current]
    let j = i + 1
    while (j < events.length) {
      const next = events[j]
      if (
        next.type === "EIGHT_D_STEP_SAVED" &&
        (next.actor?.email ?? next.actor?.name ?? "") === actorId &&
        new Date(next.createdAt).getTime() - new Date(current.createdAt).getTime() <= COALESCE_MS
      ) {
        batch.push(next)
        j++
      } else {
        break
      }
    }

    if (batch.length === 1) {
      grouped.push(current)
    } else {
      const last = batch[batch.length - 1]
      grouped.push({
        ...last,
        metadata: {
          ...(isRecord(last.metadata) ? last.metadata : {}),
          groupCount: batch.length,
        } as unknown,
      })
    }

    i = j
  }

  return grouped
}

export function AuditTimeline({ events, initialLimit = DEFAULT_LIMIT }: AuditTimelineProps) {
  const [showAll, setShowAll] = useState(false)
  const sorted = [...events].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const grouped = groupTimelineEvents(sorted)
  const visible = showAll ? grouped : grouped.slice(0, initialLimit)

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
          const isGroup = isRecord(event.metadata) && typeof event.metadata.groupCount === "number"
          const metaType = isGroup ? "EIGHT_D_STEP_SAVED" : event.type
          const meta = (EVENT_META[metaType] as EventMeta | undefined) ?? { label: event.type.replace(/_/g, " ").toLowerCase(), description: "", icon: () => null, iconColor: "text-muted-foreground" }
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
                  {isGroup ? `8D Report Updated` : meta.label}
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
      {grouped.length > initialLimit && (
        <Button
          type="button"
          onClick={() => setShowAll(!showAll)}
          variant="ghost" className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAll ? "Show less" : `Show all ${grouped.length} events`}
        </Button>
      )}
    </div>
  )
}
