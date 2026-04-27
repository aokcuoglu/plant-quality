import Link from "next/link"
import type { LucideIcon } from "lucide-react"

export function DashboardCard({
  title,
  value,
  icon: Icon,
  subtitle,
  href,
}: {
  title: string
  value: number | string
  icon: LucideIcon
  subtitle?: string
  href?: string
}) {
  const card = (
    <div className="relative overflow-hidden rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block transition-colors hover:border-foreground/20">
        {card}
      </Link>
    )
  }

  return card
}