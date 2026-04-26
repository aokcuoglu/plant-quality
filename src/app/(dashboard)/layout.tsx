"use client"

import {
  Building2Icon,
  ChevronRight,
} from "lucide-react"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { AppSwitcher } from "@/components/layout/AppSwitcher"
import { Sidebar } from "@/components/layout/Sidebar"
import { useSession } from "@/hooks/useSession"

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

  const navItems = isOem
    ? [
        { href: "/oem", label: "Dashboard", icon: "LayoutDashboardIcon" as const },
        { href: "/oem/defects", label: "Defects", icon: "BugIcon" as const },
        { href: "/oem/defects/new", label: "Report Defect", icon: "PlusCircleIcon" as const },
        { href: "/oem/field", label: "Field Quality", icon: "ClipboardListIcon" as const },
        { href: "/oem/ppap", label: "PPAP", icon: "FileTextIcon" as const },
        { href: "/oem/iqc", label: "IQC", icon: "ClipboardCheckIcon" as const },
        { href: "/oem/fmea", label: "FMEA", icon: "ShieldAlertIcon" as const },
      ]
    : [
        { href: "/supplier", label: "Dashboard", icon: "LayoutDashboardIcon" as const },
        { href: "/supplier/defects", label: "Defects", icon: "BugIcon" as const },
        { href: "/supplier/field", label: "Field Quality", icon: "ClipboardListIcon" as const },
        { href: "/supplier/ppap", label: "PPAP", icon: "FileTextIcon" as const },
        { href: "/supplier/iqc", label: "IQC", icon: "ClipboardCheckIcon" as const },
        { href: "/supplier/fmea", label: "FMEA", icon: "ShieldAlertIcon" as const },
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
