import type { DevPlanEventDetail } from "@/lib/supplier-development"

export function DevPlanTimeline({ events }: { events: DevPlanEventDetail[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="size-2 rounded-full bg-emerald-500 mt-1.5" />
            <div className="w-px flex-1 bg-border" />
          </div>
          <div className="min-w-0 flex-1 pb-3">
            <p className="text-sm text-foreground">{event.message}</p>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              <span>{event.actorName ?? "System"}</span>
              <span>{new Date(event.createdAt).toLocaleDateString()} {new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}