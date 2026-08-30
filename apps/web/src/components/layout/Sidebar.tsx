"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import {
  LayoutDashboardIcon,
  BugIcon,
  PlusCircleIcon,
  Factory,
  ChevronLeft,
  ChevronRight,
  FileTextIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  ShieldAlertIcon,
  BellIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  BarChart3Icon,
  CreditCardIcon,
  GaugeIcon,
  AwardIcon,
  TargetIcon,
  TruckIcon,
  LockIcon,
  PackageCheckIcon,
  PackageIcon,
  ClipboardList,
  SettingsIcon,
  LayoutGridIcon,
  ShipIcon,
  UsersIcon,
  ListChecksIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { PlanKey } from "@/lib/billing/plans"
import { checkFeatureAccess, type FeatureKey } from "@/lib/billing/features"
import { useTranslations } from "@/i18n/context"

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboardIcon,
  BugIcon,
  PlusCircleIcon,
  FileTextIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  ShieldAlertIcon,
  BellIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  BarChart3Icon,
  CreditCardIcon,
  GaugeIcon,
  AwardIcon,
  TargetIcon,
  TruckIcon,
  PackageCheckIcon,
  PackageIcon,
  ClipboardList,
  SettingsIcon,
  LayoutGridIcon,
  ShipIcon,
  UsersIcon,
  ListChecksIcon,
  WorkflowIcon,
}

interface SidebarLinkItem {
  href: string
  label: string
  icon: string
  gate?: FeatureKey
}

interface SidebarProps {
  navItems: SidebarLinkItem[]
  planNavItem?: SidebarLinkItem
  fieldConfigNavItem?: SidebarLinkItem
  usersNavItem?: SidebarLinkItem
  moduleName?: string
  moduleIcon?: LucideIcon
  user: {
    email: string
    companyName: string
    companyType: string
    plan: string
    role: string
    companyId?: string
    companyModules?: string[]
  }
}

const noop = () => () => {}

export function Sidebar({ navItems, planNavItem, fieldConfigNavItem, usersNavItem, moduleName = "Quality", moduleIcon: ModuleIcon = Factory, user }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const isClient = useSyncExternalStore(noop, () => true, () => false)
  const t = useTranslations()

  const normalizedPlan = (user.plan ?? "FREE") as PlanKey

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed")
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsCollapsed(stored === "true")
  }, [])

  const handleToggle = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem("sidebar-collapsed", String(next))
      return next
    })
  }

  const isSupplier = user.companyType === "SUPPLIER"

  const allNavItems: SidebarLinkItem[] = [
    ...navItems,
    ...(usersNavItem ? [usersNavItem] : []),
    ...(fieldConfigNavItem ? [fieldConfigNavItem] : []),
    ...(planNavItem ? [planNavItem] : []),
  ]

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "relative flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar",
          isClient && "transition-[width] duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border overflow-hidden bg-sidebar">
          <div
            className={cn(
              "flex h-full items-center transition-all duration-300",
              isCollapsed ? "justify-center w-full" : "gap-2.5 px-5"
            )}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
              <ModuleIcon className="size-4" strokeWidth={2.5} />
            </div>
            <span
              className={cn(
                "whitespace-nowrap overflow-hidden transition-all duration-300",
                isCollapsed
                  ? "hidden"
                  : "max-w-40 opacity-100"
              )}
            >
              <span className="font-bold text-sidebar-foreground">
                Plant
              </span>
              <span className="font-light ml-0.5 text-sidebar-foreground/70">
                {moduleName}
              </span>
            </span>
          </div>
        </div>

        <nav className={cn("flex-1 space-y-1 overflow-hidden", isCollapsed ? "p-2" : "p-3")}>
          {allNavItems.map((item) => {
            const gated = item.gate
            const access = gated ? checkFeatureAccess(normalizedPlan, user.companyType, gated, user.companyId, user.companyModules) : { allowed: true, reason: null }

            if (!access.allowed) {
              if (isSupplier && gated === "SUPPLIER_PORTAL") {
                return null
              }
              if (isSupplier) return null

              return (
                <LockedSidebarLink
                  key={item.href}
                  item={item}
                  isCollapsed={isCollapsed}
                  reason={access.reason}
                />
              )
            }

            return (
              <SidebarLink
                key={item.href}
                item={item}
                isCollapsed={isCollapsed}
              />
            )
          })}
        </nav>

        <button
          onClick={handleToggle}
          className="absolute -right-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-sidebar-border bg-sidebar shadow-md shadow-black/20 transition-all duration-200 hover:bg-sidebar-accent hover:border-sidebar-ring"
          aria-label={isCollapsed ? t("shell.expandSidebar") : t("shell.collapseSidebar")}
        >
          {isCollapsed ? (
            <ChevronRight className="size-3 text-muted-foreground" />
          ) : (
            <ChevronLeft className="size-3 text-muted-foreground" />
          )}
        </button>
      </aside>
    </TooltipProvider>
  )
}

function SidebarLink({
  item,
  isCollapsed,
}: {
  item: SidebarLinkItem
  isCollapsed: boolean
}) {
  const Icon = ICON_MAP[item.icon]

  const link = (
      <Link
      href={item.href}
      className={cn(
        "group flex items-center rounded-lg text-sm font-medium border-l-0 transition-all hover:text-sidebar-accent-foreground hover:bg-sidebar-accent",
        isCollapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2"
      )}
      data-active={undefined}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
      <span
        className={cn(
          "whitespace-nowrap overflow-hidden transition-all duration-300",
          isCollapsed
            ? "hidden"
            : "max-w-32 opacity-100"
        )}
      >
        {item.label}
      </span>
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger className="w-full flex justify-center">
          {link}
        </TooltipTrigger>
        <TooltipContent side="right">
          {item.label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return link
}

function LockedSidebarLink({
  item,
  isCollapsed,
  reason,
}: {
  item: SidebarLinkItem
  isCollapsed: boolean
  reason: string | null
}) {
  const Icon = ICON_MAP[item.icon]
  const t = useTranslations()

  const link = (
    <div
      className={cn(
        "group flex items-center rounded-lg text-sm font-medium border-l-0 transition-all opacity-50 cursor-not-allowed",
        isCollapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2"
      )}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span
        className={cn(
          "whitespace-nowrap overflow-hidden transition-all duration-300",
          isCollapsed
            ? "hidden"
            : "max-w-32 opacity-100"
        )}
      >
        {item.label}
      </span>
      <LockIcon className="size-3 shrink-0 text-muted-foreground ml-auto" />
    </div>
  )

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger className="w-full flex justify-center cursor-not-allowed">
          {link}
        </TooltipTrigger>
        <TooltipContent side="right">
          {item.label} — {reason ?? t("shell.requiresUpgrade")}
        </TooltipContent>
      </Tooltip>
    )
  }

  return link
}
