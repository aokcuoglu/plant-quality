"use client"

import {
  Building2Icon,
  ChevronRight,
} from "lucide-react"
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
  adminOnly?: boolean
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
      </div>
    )
  }

  if (!session) return null

  const isOem = session.user.companyType === "OEM"

  const navItems: NavItem[] = isOem
    ? [
        { href: "/quality/oem", label: "Dashboard", icon: "LayoutDashboardIcon" as const },
        { href: "/quality/oem/defects", label: "Defects", icon: "BugIcon" as const, gate: "DEFECTS" },
        { href: "/quality/oem/field", label: "Field Quality", icon: "ClipboardListIcon" as const, gate: "FIELD_QUALITY" },
        { href: "/quality/oem/quality-intelligence", label: "Intelligence", icon: "BarChart3Icon" as const, gate: "QUALITY_INTELLIGENCE" },
        { href: "/quality/oem/ppap", label: "PPAP", icon: "FileTextIcon" as const, gate: "PPAP" },
        { href: "/quality/oem/iqc", label: "IQC", icon: "ClipboardCheckIcon" as const, gate: "IQC" },
        { href: "/quality/oem/fmea", label: "FMEA", icon: "ShieldAlertIcon" as const, gate: "FMEA" },
        { href: "/quality/oem/escalations", label: "Escalations", icon: "AlertTriangleIcon" as const, gate: "ESCALATION" },
        { href: "/quality/oem/war-room", label: "War Room", icon: "TrendingUpIcon" as const, gate: "WAR_ROOM" },
        { href: "/quality/oem/notifications", label: "Notifications", icon: "BellIcon" as const, gate: "NOTIFICATIONS" },
        { href: "/oem/settings/plan", label: "Plan & Usage", icon: "CreditCardIcon" as const, adminOnly: true },
      ]
    : [
        { href: "/quality/supplier", label: "Dashboard", icon: "LayoutDashboardIcon" as const },
        { href: "/quality/supplier/defects", label: "Defects", icon: "BugIcon" as const },
        { href: "/quality/supplier/field", label: "Field Quality", icon: "ClipboardListIcon" as const },
        { href: "/quality/supplier/ppap", label: "PPAP", icon: "FileTextIcon" as const },
        { href: "/quality/supplier/iqc", label: "IQC", icon: "ClipboardCheckIcon" as const },
        { href: "/quality/supplier/fmea", label: "FMEA", icon: "ShieldAlertIcon" as const },
        { href: "/quality/supplier/escalations", label: "Escalations", icon: "AlertTriangleIcon" as const },
        { href: "/quality/supplier/notifications", label: "Notifications", icon: "BellIcon" as const },
      ]

  return (
    <div className="flex h-screen">
      <Sidebar
        navItems={navItems}
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
            <span className="hidden text-muted-foreground sm:inline">PlantQuality</span>
            <ChevronRight className="hidden size-3 text-muted-foreground/50 sm:block" />
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Building2Icon className="size-3.5 text-muted-foreground" />
              {session.user.companyName}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <AppSwitcher />
            <NotificationBell />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-background p-6 text-foreground">{children}</main>
      </div>
    </div>
  )
}
