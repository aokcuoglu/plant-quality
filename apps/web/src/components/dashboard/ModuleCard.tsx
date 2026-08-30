import Link from "next/link"
import { ArrowRight, Lock, Sparkles } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getTranslations } from "@/i18n/server"

export type ModuleCardVariant = "live" | "locked" | "soon"

const VARIANT_META: Record<
  ModuleCardVariant,
  {
    badgeKey: "dashboard.company.moduleCard.subscribed" | "dashboard.company.moduleCard.locked" | "dashboard.company.moduleCard.soon"
    badgeClassName: string
    iconClassName: string
    ambientGlow: boolean
  }
> = {
  live: {
    badgeKey: "dashboard.company.moduleCard.subscribed",
    badgeClassName: "border-border bg-brand/10 text-brand",
    iconClassName: "bg-brand/10 text-brand",
    ambientGlow: true,
  },
  locked: {
    badgeKey: "dashboard.company.moduleCard.locked",
    badgeClassName: "border-border bg-muted text-muted-foreground",
    iconClassName: "bg-muted text-muted-foreground",
    ambientGlow: false,
  },
  soon: {
    badgeKey: "dashboard.company.moduleCard.soon",
    badgeClassName: "border-border bg-muted text-muted-foreground",
    iconClassName: "bg-muted text-muted-foreground",
    ambientGlow: false,
  },
}

export interface ModuleCardProps {
  name: string
  description: string
  icon: LucideIcon | React.ComponentType<{ className?: string }>
  /** Visual variation — the surrounding context decides the badge + footer. */
  variant?: ModuleCardVariant
  /** When set and `variant === "live"`, a primary CTA is rendered linking here. */
  href?: string
  /** Override the live CTA label (defaults to "Modülü Aç"). */
  ctaLabel?: string
  className?: string
  /** Extra content rendered between description and the footer (e.g. a KPI row). */
  children?: React.ReactNode
}

export async function ModuleCard({
  name,
  description,
  icon: Icon,
  variant = "live",
  href,
  ctaLabel,
  className,
  children,
}: ModuleCardProps) {
  const t = await getTranslations()
  const meta = VARIANT_META[variant]
  const handle = variant === "live" && !!href
  const FooterIcon = variant === "live" ? Sparkles : variant === "locked" ? Lock : null

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card/60 p-6 backdrop-blur-md transition-all",
        variant === "live"
          ? "border-border hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5"
          : "border-border hover:border-border",
        className
      )}
    >
      {meta.ambientGlow && (
        <div className="pointer-events-none absolute -top-24 -right-24 size-[320px] rounded-full bg-brand/10 blur-[80px]" />
      )}

      <div className="mb-4 flex items-start justify-between">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", meta.iconClassName)}>
          <Icon className="size-5" />
        </div>
        <Badge
          variant="outline"
          className={cn(
            "inline-flex items-center gap-1 border px-2 text-[10px] font-semibold uppercase tracking-wider",
            meta.badgeClassName
          )}
        >
          {FooterIcon && <FooterIcon className="size-2.5" />}
          {t(meta.badgeKey)}
        </Badge>
      </div>

      <h3 className="text-base font-semibold text-foreground">{name}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>

      {children}

      <div className="mt-auto pt-5">
        {handle ? (
          <Link href={href as string} className="block">
            <Button
              size="sm"
              className="w-full gap-1.5 bg-foreground font-semibold text-background shadow-md shadow-black/5 hover:bg-foreground/80"
            >
              {ctaLabel ?? t("dashboard.company.moduleCard.open")} <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        ) : variant === "locked" ? (
          <p className="text-[11px] text-muted-foreground">{t("dashboard.company.moduleCard.contactSales")}</p>
        ) : (
          <p className="text-[11px] text-muted-foreground">{t("dashboard.company.moduleCard.comingSoon")}</p>
        )}
      </div>
    </div>
  )
}
