"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import {
  Building2Icon,
  ChevronRight,
  Factory,
  TruckIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { AppSwitcher } from "@/components/layout/AppSwitcher"
import { Sidebar } from "@/components/layout/Sidebar"
import { useSession } from "@/hooks/useSession"
import type { FeatureKey } from "@/lib/billing/features"

interface NavItem {
  href: string
  label: string
  icon: string
  gate?: FeatureKey
  section?: string
}

interface ModuleConfig {
  name: string
  suffix: string
  icon: LucideIcon
  navItems: NavItem[]
  defaultHref: string
}

const QUALITY_OEM_NAV: NavItem[] = [
  { href: "/quality/oem", label: "Dashboard", icon: "LayoutDashboardIcon" as const },
  { href: "/quality/oem/defects", label: "Defects", icon: "BugIcon" as const, gate: "DEFECTS" },
  { href: "/quality/oem/field", label: "Field Quality", icon: "ClipboardListIcon" as const, gate: "FIELD_QUALITY" },
  { href: "/quality/oem/quality-intelligence", label: "Intelligence", icon: "BarChart3Icon" as const, gate: "QUALITY_INTELLIGENCE" },
  { href: "/quality/oem/executive", label: "Executive Cockpit", icon: "GaugeIcon" as const, gate: "EXECUTIVE_COCKPIT" },
  { href: "/quality/oem/scorecard", label: "Scorecard", icon: "AwardIcon" as const, gate: "SUPPLIER_SCORECARD" },
  { href: "/quality/oem/supplier-development", label: "Supplier Development", icon: "TargetIcon" as const, gate: "SUPPLIER_DEVELOPMENT" },
  { href: "/quality/oem/ppap", label: "PPAP", icon: "FileTextIcon" as const, gate: "PPAP" },
  { href: "/quality/oem/iqc", label: "IQC", icon: "ClipboardCheckIcon" as const, gate: "IQC" },
  { href: "/quality/oem/fmea", label: "FMEA", icon: "ShieldAlertIcon" as const, gate: "FMEA" },
  { href: "/quality/oem/escalations", label: "Escalations", icon: "AlertTriangleIcon" as const, gate: "ESCALATION" },
  { href: "/quality/oem/war-room", label: "War Room", icon: "TrendingUpIcon" as const, gate: "WAR_ROOM" },
  { href: "/quality/oem/notifications", label: "Notifications", icon: "BellIcon" as const, gate: "NOTIFICATIONS" },
]

const QUALITY_SUPPLIER_NAV: NavItem[] = [
  { href: "/quality/supplier", label: "Dashboard", icon: "LayoutDashboardIcon" as const },
  { href: "/quality/supplier/defects", label: "Defects", icon: "BugIcon" as const },
  { href: "/quality/supplier/field", label: "Field Quality", icon: "ClipboardListIcon" as const },
  { href: "/quality/supplier/development", label: "Development Plans", icon: "TargetIcon" as const, gate: "SUPPLIER_DEVELOPMENT" },
  { href: "/quality/supplier/ppap", label: "PPAP", icon: "FileTextIcon" as const, gate: "PPAP" },
  { href: "/quality/supplier/iqc", label: "IQC", icon: "ClipboardCheckIcon" as const, gate: "IQC" },
  { href: "/quality/supplier/fmea", label: "FMEA", icon: "ShieldAlertIcon" as const, gate: "FMEA" },
  { href: "/quality/supplier/escalations", label: "Escalations", icon: "AlertTriangleIcon" as const },
  { href: "/quality/supplier/scorecard", label: "My Scorecard", icon: "AwardIcon" as const, gate: "SUPPLIER_SCORECARD" },
  { href: "/quality/supplier/notifications", label: "Notifications", icon: "BellIcon" as const },
]

const LOGISTIC_NAV: NavItem[] = [
  { href: "/logistic", label: "Overview", icon: "LayoutDashboardIcon" as const, gate: "PLANT_LOGISTIC" },
  { href: "/logistic/board", label: "Live Board", icon: "LayoutGridIcon" as const, gate: "PLANT_LOGISTIC" },
  { href: "/logistic/plan-sheets", label: "Şase Listeleri", icon: "FileTextIcon" as const, gate: "PLANT_LOGISTIC" },
  { href: "/logistic/dispatches", label: "Sevk Kuyruğu", icon: "ShipIcon" as const, gate: "PLANT_LOGISTIC" },
  { href: "/logistic/orders", label: "Vehicle Orders", icon: "TruckIcon" as const, gate: "PLANT_LOGISTIC" },
  { href: "/logistic/orders/new", label: "New Order", icon: "PlusCircleIcon" as const, gate: "PLANT_LOGISTIC" },
  { href: "/logistic/delay-intelligence", label: "Delay Intelligence", icon: "AlertTriangleIcon" as const, gate: "PLANT_LOGISTIC" },
]

const LOGISTIC_PORTAL_NAV: NavItem[] = [
  { href: "/logistic/portal", label: "Overview", icon: "LayoutDashboardIcon" as const },
  { href: "/logistic/portal/orders", label: "My Orders", icon: "PackageIcon" as const },
  { href: "/logistic/portal/orders/new", label: "New Order", icon: "PlusCircleIcon" as const },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (session?.user?.role === "SUPER_ADMIN") {
      router.replace("/admin")
    }
  }, [session, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
      </div>
    )
  }

  if (!session) return null

  const isOem = session.user.companyType === "OEM"
  const isOemAdmin = isOem && session.user.role === "ADMIN"
  const isPortalUser = session.user.companyType === "DEALER" || session.user.companyType === "DISTRIBUTOR"
  const isPortalRoute = pathname.startsWith("/logistic/portal")
  const isLogisticRoute = isOem && pathname.startsWith("/logistic") && !isPortalRoute

  let moduleConfig: ModuleConfig
  let plantXModule: "quality" | "logistic" | null

  if (isPortalRoute && isPortalUser) {
    moduleConfig = {
      name: "Logistic Portal",
      suffix: "Logistic",
      icon: TruckIcon,
      navItems: LOGISTIC_PORTAL_NAV,
      defaultHref: "/logistic/portal",
    }
    plantXModule = "logistic"
  } else if (isLogisticRoute) {
    moduleConfig = {
      name: "Logistic",
      suffix: "Logistic",
      icon: TruckIcon,
      navItems: LOGISTIC_NAV,
      defaultHref: "/logistic",
    }
    plantXModule = "logistic"
  } else {
    moduleConfig = {
      name: "Quality",
      suffix: "Quality",
      icon: Factory,
      navItems: isOem ? QUALITY_OEM_NAV : QUALITY_SUPPLIER_NAV,
      defaultHref: isOem ? "/quality/oem" : "/quality/supplier",
    }
    plantXModule = "quality"
  }

  const navItems = moduleConfig.navItems
  const planNavItem = isOemAdmin ? { href: isLogisticRoute ? "/logistic/settings/plan" : "/settings/plan", label: "Plan & Usage", icon: "CreditCardIcon" as const } : undefined
  const fieldConfigNavItem = isOemAdmin ? { href: "/settings/field-config", label: "Field Configuration", icon: "SettingsIcon" as const, gate: "CUSTOM_FIELDS" as FeatureKey } : undefined

  return (
    <div className="flex h-screen">
      <Sidebar
        navItems={navItems}
        planNavItem={planNavItem}
        fieldConfigNavItem={fieldConfigNavItem}
        moduleName={moduleConfig.suffix}
        moduleIcon={moduleConfig.icon}
        user={{
          email: session.user.email ?? "",
          companyName: session.user.companyName ?? "",
          companyType: session.user.companyType ?? "",
          plan: session.user.plan ?? "BASIC",
          role: session.user.role ?? "",
        }}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-sidebar px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden text-muted-foreground sm:inline">Plant{moduleConfig.name}</span>
            <ChevronRight className="hidden size-3 text-muted-foreground/50 sm:block" />
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Building2Icon className="size-3.5 text-muted-foreground" />
              {session.user.companyName}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <AppSwitcher currentModule={plantXModule} userPlan={session.user.plan} userCompanyType={session.user.companyType} userCompanyId={session.user.companyId} />
            <NotificationBell />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-background p-6 text-foreground">{children}</main>
      </div>
    </div>
  )
}