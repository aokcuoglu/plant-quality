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
        <div className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
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
      ]
    : [
        { href: "/supplier", label: "Dashboard", icon: "LayoutDashboardIcon" as const },
        { href: "/supplier/defects", label: "Defects", icon: "BugIcon" as const },
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

      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white dark:bg-card px-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="hidden sm:inline text-slate-400">PlantX</span>
            <ChevronRight className="hidden sm:block size-3 text-slate-300" />
            <span className="flex items-center gap-1.5">
              <Building2Icon className="size-3.5" />
              {session.user.companyName}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <AppSwitcher />
            <NotificationBell />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
