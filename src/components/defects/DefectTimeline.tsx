"use client"

import { useState } from "react"
import { EVENT_META, type EventMeta } from "@/lib/event-labels"
import type { DefectEventType } from "@/generated/prisma/client"

interface TimelineEvent {
  id: string
  type: DefectEventType
  actor: { name: string | null } | null
  metadata: unknown
  createdAt: Date
}

interface DefectTimelineProps {
  events: TimelineEvent[]
}

const INITIAL_LIMIT = 8

export function DefectTimeline({ events }: DefectTimelineProps) {
  const [showAll, setShowAll] = useState(false)
  const sorted = [...events].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const visible = showAll ? sorted : sorted.slice(0, INITIAL_LIMIT)

  if (events.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="divide-y rounded-lg border bg-card">
        {visible.map((event) => {
          const meta = EVENT_META[event.type] as EventMeta | undefined ?? { label: event.type, description: "", icon: () => null, iconColor: "text-slate-500" }
          const Icon = meta.icon
          const actorName = event.actor?.name ?? "System"
          const time = new Date(event.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })

          return (
            <div key={event.id} className="flex items-start gap-3 px-4 py-3">
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted ${meta.iconColor}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {meta.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {actorName} &middot; {time}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      {events.length > INITIAL_LIMIT && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {showAll ? "Show less" : `Show all ${events.length} events`}
        </button>
      )}
    </div>
  )
}