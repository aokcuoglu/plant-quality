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
import { UserMenu } from "@/components/layout/UserMenu"
import { Sidebar } from "@/components/layout/Sidebar"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher"
import { useSession } from "@/hooks/useSession"
import type { FeatureKey } from "@/lib/billing/features"
import { checkModuleAccess } from "@/lib/billing/features"
import { useTranslations } from "@/i18n/context"
import type { MessageKey } from "@/i18n/types"

function hasQualityAccess(
  role: string,
  modules: string[] | undefined,
  companyId: string,
  companyType: string,
  companyModules: string[] | undefined
): boolean {
  return checkModuleAccess("PLANT_QUALITY_MODULE", companyId, companyType, role, modules, companyModules)
}

interface NavItem {
  href: string
  labelKey: MessageKey
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
  { href: "/quality/oem", labelKey: "nav.dashboard", icon: "LayoutDashboardIcon" as const },
  { href: "/quality/oem/defects", labelKey: "nav.defects", icon: "BugIcon" as const, gate: "DEFECTS" },
  { href: "/quality/oem/field", labelKey: "nav.field", icon: "ClipboardListIcon" as const, gate: "FIELD_QUALITY" },
  { href: "/quality/oem/quality-intelligence", labelKey: "nav.intelligence", icon: "BarChart3Icon" as const, gate: "QUALITY_INTELLIGENCE" },
  { href: "/quality/oem/executive", labelKey: "nav.executive", icon: "GaugeIcon" as const, gate: "EXECUTIVE_COCKPIT" },
  { href: "/quality/oem/scorecard", labelKey: "nav.scorecard", icon: "AwardIcon" as const, gate: "SUPPLIER_SCORECARD" },
  { href: "/quality/oem/supplier-development", labelKey: "nav.supplierDevelopment", icon: "TargetIcon" as const, gate: "SUPPLIER_DEVELOPMENT" },
  { href: "/quality/oem/ppap", labelKey: "nav.ppap", icon: "FileTextIcon" as const, gate: "PPAP" },
  { href: "/quality/oem/iqc", labelKey: "nav.iqc", icon: "ClipboardCheckIcon" as const, gate: "IQC" },
  { href: "/quality/oem/fmea", labelKey: "nav.fmea", icon: "ShieldAlertIcon" as const, gate: "FMEA" },
  { href: "/quality/oem/escalations", labelKey: "nav.escalations", icon: "AlertTriangleIcon" as const, gate: "ESCALATION" },
  { href: "/quality/oem/war-room", labelKey: "nav.warRoom", icon: "TrendingUpIcon" as const, gate: "WAR_ROOM" },
  { href: "/quality/oem/notifications", labelKey: "nav.notifications", icon: "BellIcon" as const, gate: "NOTIFICATIONS" },
]

const QUALITY_SUPPLIER_NAV: NavItem[] = [
  { href: "/quality/supplier", labelKey: "nav.dashboard", icon: "LayoutDashboardIcon" as const },
  { href: "/quality/supplier/defects", labelKey: "nav.defects", icon: "BugIcon" as const },
  { href: "/quality/supplier/field", labelKey: "nav.field", icon: "ClipboardListIcon" as const },
  { href: "/quality/supplier/development", labelKey: "nav.development", icon: "TargetIcon" as const, gate: "SUPPLIER_DEVELOPMENT" },
  { href: "/quality/supplier/ppap", labelKey: "nav.ppap", icon: "FileTextIcon" as const, gate: "PPAP" },
  { href: "/quality/supplier/iqc", labelKey: "nav.iqc", icon: "ClipboardCheckIcon" as const, gate: "IQC" },
  { href: "/quality/supplier/fmea", labelKey: "nav.fmea", icon: "ShieldAlertIcon" as const, gate: "FMEA" },
  { href: "/quality/supplier/escalations", labelKey: "nav.escalations", icon: "AlertTriangleIcon" as const },
  { href: "/quality/supplier/scorecard", labelKey: "nav.myScorecard", icon: "AwardIcon" as const, gate: "SUPPLIER_SCORECARD" },
  { href: "/quality/supplier/notifications", labelKey: "nav.notifications", icon: "BellIcon" as const },
]

const LOGISTIC_NAV: NavItem[] = [
  { href: "/logistic", labelKey: "nav.overview", icon: "LayoutDashboardIcon" as const, gate: "PLANT_LOGISTIC" },
  { href: "/logistic/board", labelKey: "nav.liveBoard", icon: "LayoutGridIcon" as const, gate: "PLANT_LOGISTIC" },
  { href: "/logistic/vehicle-catalog", labelKey: "nav.vehicleCatalog", icon: "TruckIcon" as const, gate: "PLANT_LOGISTIC" },
  { href: "/logistic/flows", labelKey: "nav.flows", icon: "WorkflowIcon" as const, gate: "PLANT_LOGISTIC" },
  { href: "/logistic/plan-sheets", labelKey: "nav.chassisLists", icon: "FileTextIcon" as const, gate: "PLANT_LOGISTIC" },
  { href: "/logistic/dispatches", labelKey: "nav.dispatchQueue", icon: "ShipIcon" as const, gate: "PLANT_LOGISTIC" },
  { href: "/logistic/orders", labelKey: "nav.vehicleOrders", icon: "TruckIcon" as const, gate: "PLANT_LOGISTIC" },
  { href: "/logistic/delay-intelligence", labelKey: "nav.delayIntelligence", icon: "AlertTriangleIcon" as const, gate: "PLANT_LOGISTIC" },
]

const LOGISTIC_PORTAL_NAV: NavItem[] = [
  { href: "/logistic/portal", labelKey: "nav.overview", icon: "LayoutDashboardIcon" as const },
  { href: "/logistic/portal/orders", labelKey: "nav.myOrders", icon: "PackageIcon" as const },
  { href: "/logistic/portal/orders/new", labelKey: "nav.newOrder", icon: "PlusCircleIcon" as const },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations()

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
  const noQualityAccess = isOem && !hasQualityAccess(session.user.role, session.user.modules, session.user.companyId, session.user.companyType, session.user.companyModules)
  const isPortalUser = session.user.companyType === "DEALER" || session.user.companyType === "DISTRIBUTOR"
  const isPortalRoute = pathname.startsWith("/logistic/portal")
  const isLogisticRoute = isOem && (pathname.startsWith("/logistic") || noQualityAccess) && !isPortalRoute

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

  const resolveLabels = (items: NavItem[]) => items.map((item) => ({ ...item, label: t(item.labelKey) }))
  const sidebarNavItems = resolveLabels(navItems)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        navItems={sidebarNavItems}
        moduleName={moduleConfig.suffix}
        moduleIcon={moduleConfig.icon}
        user={{
          email: session.user.email ?? "",
          companyName: session.user.companyName ?? "",
          companyType: session.user.companyType ?? "",
          plan: session.user.plan ?? "BASIC",
          role: session.user.role ?? "",
          companyId: session.user.companyId ?? "",
          companyModules: session.user.companyModules ?? [],
        }}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-sidebar px-3 sm:px-6">
          <div className="min-w-0 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden text-muted-foreground sm:inline">Plant{moduleConfig.name}</span>
            <ChevronRight className="hidden size-3 text-muted-foreground/50 sm:block" />
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Building2Icon className="size-3.5 text-muted-foreground" />
              <span className="hidden truncate sm:inline">
                {session.user.companyName}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <AppSwitcher currentModule={plantXModule} userPlan={session.user.plan} userCompanyType={session.user.companyType} userCompanyId={session.user.companyId} userRole={session.user.role} userModules={session.user.modules} userCompanyModules={session.user.companyModules} />
            <NotificationBell />
            <ThemeToggle iconOnly />
            <LanguageSwitcher />
            <UserMenu
              user={{
                email: session.user.email ?? "",
                companyName: session.user.companyName ?? "",
                companyType: session.user.companyType ?? "",
                plan: session.user.plan ?? "BASIC",
                role: session.user.role ?? "",
              }}
            />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-background p-6 text-foreground">{children}</main>
      </div>
    </div>
  )
}
