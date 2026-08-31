"use client"

import { useMemo, useState, type ComponentType } from "react"
import {
  Activity,
  ChevronDown,
  CircleCheck,
  CircleX,
  History,
  type LucideProps,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useLocale, useTranslations } from "@/i18n/context"
import { cn } from "@/lib/utils"

const INITIAL_EVENT_LIMIT = 6
const APP_TIME_ZONE = "Europe/Istanbul"

type GroupBy = "vehicle" | "date" | "none"
type SortOrder = "newest" | "oldest"
type EventVariant = "success" | "destructive" | "neutral"

interface TimelineEvent {
  id: string
  eventType: string
  actorName: string | null
  message: string | null
  createdAt: string
}

interface TimelineLine {
  sequence: number
  chassisNumber: string | null
  vin: string | null
  vehicleModel: string
}

interface EnrichedTimelineEvent extends TimelineEvent {
  line: TimelineLine | null
}

interface TimelineGroup {
  key: string
  line: TimelineLine | null
  date: Date | null
  events: EnrichedTimelineEvent[]
}

interface PlanSheetTimelineProps {
  events: TimelineEvent[]
  lines: TimelineLine[]
}

const EVENT_VARIANT: Record<string, EventVariant> = {
  ORDER_CREATED: "success",
  ORDER_APPROVED: "success",
  MILESTONE_COMPLETED: "success",
  ORDER_REJECTED: "destructive",
  ORDER_CANCELLED: "destructive",
  MILESTONE_BLOCKED: "destructive",
}

const VARIANT_META: Record<
  EventVariant,
  { icon: ComponentType<LucideProps>; className: string }
> = {
  success: {
    icon: CircleCheck,
    className: "bg-emerald-500/10 text-emerald-500",
  },
  destructive: {
    icon: CircleX,
    className: "bg-destructive/10 text-destructive",
  },
  neutral: {
    icon: Activity,
    className: "bg-muted text-muted-foreground",
  },
}

function getLineSequence(message: string | null): number | null {
  if (!message) return null
  const match = message.match(/(?:ara[cç]\s+)?sat(?:ı|i)r(?:ı|i)?\s+(\d+)|(?:vehicle\s+)?row\s+(\d+)/i)
  const sequence = Number(match?.[1] ?? match?.[2])
  return Number.isInteger(sequence) ? sequence : null
}

function removeLinePrefix(message: string | null): string | null {
  if (!message) return null
  const cleaned = message
    .replace(/^\s*(?:ara[cç]\s+)?sat(?:ı|i)r(?:ı|i)?\s+\d+\s*(?:[—–-]|→)?\s*/i, "")
    .replace(/^\s*(?:vehicle\s+)?row\s+\d+\s*(?:[—–-]|→)?\s*/i, "")
    .trim()
  return cleaned || message
}

function capitalize(value: string, locale: string): string {
  return `${value.charAt(0).toLocaleUpperCase(locale)}${value.slice(1)}`
}

function groupsWithinLimit(groups: TimelineGroup[]): TimelineGroup[] {
  let eventCount = 0
  let groupCount = 0

  for (const group of groups) {
    if (groupCount > 0 && eventCount + group.events.length > INITIAL_EVENT_LIMIT) break
    eventCount += group.events.length
    groupCount += 1
  }

  return groups.slice(0, groupCount)
}

export function PlanSheetTimeline({ events, lines }: PlanSheetTimelineProps) {
  const t = useTranslations()
  const locale = useLocale()
  const localeTag = locale === "tr" ? "tr-TR" : "en-US"
  const [groupBy, setGroupBy] = useState<GroupBy>("vehicle")
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest")
  const [showAll, setShowAll] = useState(false)

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(localeTag, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: APP_TIME_ZONE,
    }),
    [localeTag],
  )
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(localeTag, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: APP_TIME_ZONE,
    }),
    [localeTag],
  )

  const sortedEvents = useMemo(() => {
    const lineBySequence = new Map(lines.map((line) => [line.sequence, line]))
    const enriched = events.map<EnrichedTimelineEvent>((event) => {
      const sequence = getLineSequence(event.message)
      return { ...event, line: sequence === null ? null : lineBySequence.get(sequence) ?? null }
    })

    return enriched.sort((left, right) => {
      const difference = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      return sortOrder === "newest" ? difference : -difference
    })
  }, [events, lines, sortOrder])

  const groups = useMemo<TimelineGroup[]>(() => {
    if (groupBy === "none") return []

    const grouped = new Map<string, TimelineGroup>()
    for (const event of sortedEvents) {
      const eventDate = new Date(event.createdAt)
      const dateKey = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: APP_TIME_ZONE,
      }).format(eventDate)
      const key = groupBy === "vehicle"
        ? event.line ? `vehicle:${event.line.sequence}` : "plan-sheet"
        : `date:${dateKey}`

      const current = grouped.get(key)
      if (current) {
        current.events.push(event)
      } else {
        grouped.set(key, {
          key,
          line: groupBy === "vehicle" ? event.line : null,
          date: groupBy === "date" ? eventDate : null,
          events: [event],
        })
      }
    }

    return [...grouped.values()]
  }, [groupBy, sortedEvents])

  const visibleEvents = showAll ? sortedEvents : sortedEvents.slice(0, INITIAL_EVENT_LIMIT)
  const visibleGroups = showAll ? groups : groupsWithinLimit(groups)
  const visibleEventCount = groupBy === "none"
    ? visibleEvents.length
    : visibleGroups.reduce((total, group) => total + group.events.length, 0)
  const hasMore = visibleEventCount < sortedEvents.length

  function groupLabel(group: TimelineGroup): string {
    if (groupBy === "date" && group.date) return dateFormatter.format(group.date)
    if (!group.line) return t("logistic.dynamicFlow.planSheetTimeline.planSheetActivity")
    if (group.line.chassisNumber) {
      return t("logistic.dynamicFlow.planSheetTimeline.chassisReference", { value: group.line.chassisNumber })
    }
    if (group.line.vin) {
      return t("logistic.dynamicFlow.planSheetTimeline.vinReference", { value: group.line.vin })
    }
    return t("logistic.dynamicFlow.planSheetTimeline.vehicleReference", {
      model: group.line.vehicleModel,
      sequence: group.line.sequence,
    })
  }

  function renderEvent(event: EnrichedTimelineEvent) {
    const variant = EVENT_VARIANT[event.eventType] ?? "neutral"
    const { icon: Icon, className } = VARIANT_META[variant]
    const message = removeLinePrefix(event.message)
    const actorName = event.actorName ?? t("logistic.dynamicFlow.planSheetTimeline.system")

    return (
      <div key={event.id} className="flex items-start gap-3 px-4 py-3">
        <div className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", className)}>
          <Icon className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground">
            {message
              ? capitalize(message, localeTag)
              : t("logistic.dynamicFlow.planSheetTimeline.activityRecorded")}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{actorName}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={event.createdAt}>{timeFormatter.format(new Date(event.createdAt))}</time>
            {groupBy !== "vehicle" && event.line && (
              <Badge variant="outline" className="font-normal text-muted-foreground">
                {event.line.chassisNumber
                  ? t("logistic.dynamicFlow.planSheetTimeline.chassisReference", { value: event.line.chassisNumber })
                  : event.line.vin
                    ? t("logistic.dynamicFlow.planSheetTimeline.vinReference", { value: event.line.vin })
                    : t("logistic.dynamicFlow.planSheetTimeline.vehicleReference", {
                        model: event.line.vehicleModel,
                        sequence: event.line.sequence,
                      })}
              </Badge>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <History className="size-4 shrink-0 text-emerald-500" />
          <h2 className="text-sm font-medium text-foreground">
            {t("logistic.dynamicFlow.planSheetTimeline.title")}
          </h2>
          <Badge variant="secondary">
            {t("logistic.dynamicFlow.planSheetTimeline.eventCount", { count: events.length })}
          </Badge>
        </div>

        {events.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect
              size="sm"
              value={groupBy}
              aria-label={t("logistic.dynamicFlow.planSheetTimeline.groupBy")}
              onChange={(event) => {
                setGroupBy(event.target.value as GroupBy)
                setShowAll(false)
              }}
            >
              <NativeSelectOption value="vehicle">
                {t("logistic.dynamicFlow.planSheetTimeline.groupByVehicle")}
              </NativeSelectOption>
              <NativeSelectOption value="date">
                {t("logistic.dynamicFlow.planSheetTimeline.groupByDate")}
              </NativeSelectOption>
              <NativeSelectOption value="none">
                {t("logistic.dynamicFlow.planSheetTimeline.groupByNone")}
              </NativeSelectOption>
            </NativeSelect>
            <NativeSelect
              size="sm"
              value={sortOrder}
              aria-label={t("logistic.dynamicFlow.planSheetTimeline.sortOrder")}
              onChange={(event) => {
                setSortOrder(event.target.value as SortOrder)
                setShowAll(false)
              }}
            >
              <NativeSelectOption value="newest">
                {t("logistic.dynamicFlow.planSheetTimeline.newestFirst")}
              </NativeSelectOption>
              <NativeSelectOption value="oldest">
                {t("logistic.dynamicFlow.planSheetTimeline.oldestFirst")}
              </NativeSelectOption>
            </NativeSelect>
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <History className="mx-auto mb-2 size-5 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {t("logistic.dynamicFlow.planSheetTimeline.empty")}
          </p>
        </div>
      ) : groupBy === "none" ? (
        <div className="divide-y divide-border">{visibleEvents.map(renderEvent)}</div>
      ) : (
        <div className="divide-y divide-border">
          {visibleGroups.map((group, index) => {
            const latestEvent = group.events[0]
            const actorName = latestEvent.actorName ?? t("logistic.dynamicFlow.planSheetTimeline.system")

            return (
              <details
                key={`${groupBy}:${group.key}`}
                className="group"
                open={groupBy === "vehicle" && index === 0}
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <History className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{groupLabel(group)}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {actorName} · {timeFormatter.format(new Date(latestEvent.createdAt))}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {t("logistic.dynamicFlow.planSheetTimeline.groupEventCount", { count: group.events.length })}
                  </Badge>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="divide-y divide-border border-t border-border bg-background/40">
                  {group.events.map(renderEvent)}
                </div>
              </details>
            )
          })}
        </div>
      )}

      {(hasMore || showAll) && (
        <div className="border-t border-border px-4 py-2.5 text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAll((current) => !current)}
            className="text-muted-foreground"
          >
            {showAll
              ? t("logistic.dynamicFlow.planSheetTimeline.showLess")
              : t("logistic.dynamicFlow.planSheetTimeline.showAll", { count: sortedEvents.length })}
            <ChevronDown className={cn("size-3.5 transition-transform", showAll && "rotate-180")} />
          </Button>
        </div>
      )}
    </section>
  )
}
