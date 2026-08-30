"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { ChevronRight, Factory } from "lucide-react"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { AppSwitcher } from "@/components/layout/AppSwitcher"
import { UserMenu } from "@/components/layout/UserMenu"
import { Sidebar } from "@/components/layout/Sidebar"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher"
import { useSession } from "@/hooks/useSession"
import { useTranslations } from "@/i18n/context"
import type { MessageKey } from "@/i18n/types"

interface NavItem {
  href: string
  labelKey: MessageKey
  icon: string
}

const BASE_NAV: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.overview", icon: "LayoutDashboardIcon" },
  { href: "/dashboard/modules", labelKey: "nav.modules", icon: "PackageIcon" },
]

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard/users", labelKey: "nav.users", icon: "UsersIcon" },
  { href: "/dashboard/billing", labelKey: "nav.planAndPurchase", icon: "CreditCardIcon" },
]

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations()

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login?redirect=" + encodeURIComponent(pathname))
    }
  }, [loading, session, router, pathname])

  useEffect(() => {
    if (session?.user?.role === "SUPER_ADMIN") {
      router.replace("/admin")
    } else if (session && (session.user.companyType !== "OEM" || session.user.role !== "ADMIN")) {
      router.replace(session.user.companyType === "SUPPLIER" ? "/quality/supplier" : "/quality/oem")
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

  const isOemAdmin = session.user.companyType === "OEM" && session.user.role === "ADMIN"
  if (!isOemAdmin) return null
  const navItems = (isOemAdmin ? [...BASE_NAV, ...ADMIN_NAV] : BASE_NAV).map((item) => ({
    ...item,
    label: t(item.labelKey),
  }))

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        navItems={navItems}
        moduleName="X"
        moduleIcon={Factory}
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
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-sidebar px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden text-muted-foreground sm:inline">PlantX</span>
            <ChevronRight className="hidden size-3 text-muted-foreground/50 sm:block" />
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Factory className="size-3.5 text-muted-foreground" />
              {session.user.companyName}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <AppSwitcher
              currentModule={null}
              userPlan={session.user.plan}
              userCompanyType={session.user.companyType}
              userCompanyId={session.user.companyId}
              userRole={session.user.role}
              userModules={session.user.modules}
              userCompanyModules={session.user.companyModules}
            />
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
