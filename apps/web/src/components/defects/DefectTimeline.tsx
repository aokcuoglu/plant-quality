"use client"

import { AuditTimeline, type AuditTimelineEvent } from "@/components/AuditTimeline"
import type { DefectEventType } from "@plantx/db/client"

interface TimelineEvent {
  id: string
  type: DefectEventType
  actor: { name: string | null; email?: string | null } | null
  metadata: unknown
  createdAt: Date
}

interface DefectTimelineProps {
  events: TimelineEvent[]
  initialLimit?: number
}

export function DefectTimeline({ events, initialLimit }: DefectTimelineProps) {
  const mapped: AuditTimelineEvent[] = events.map((e) => ({
    id: e.id,
    type: e.type,
    actor: e.actor ? { name: e.actor.name, email: e.actor.email } : null,
    metadata: e.metadata,
    createdAt: e.createdAt,
  }))
  return <AuditTimeline events={mapped} initialLimit={initialLimit} />
}