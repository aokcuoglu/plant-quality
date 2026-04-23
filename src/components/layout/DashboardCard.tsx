import type { LucideIcon } from "lucide-react"

export function DashboardCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string
  value: number
  icon: LucideIcon
  subtitle?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground/70">{subtitle}</p>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
