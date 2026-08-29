"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  LayoutDashboardIcon,
  Building2Icon,
  UsersIcon,
  CreditCardIcon,
  LogOutIcon,
  ShieldIcon,
  ChevronRight,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { useSession } from "@/hooks/useSession"
import { ThemeToggle } from "@/components/theme/ThemeToggle"

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/admin/suppliers", label: "Suppliers", icon: Building2Icon },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && (!session || session.user.role !== "SUPER_ADMIN")) {
      router.replace("/login")
    }
  }, [session, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
      </div>
    )
  }

  if (!session || session.user.role !== "SUPER_ADMIN") return null

  return (
    <div className="flex h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-primary-foreground">
            <ShieldIcon className="size-4" strokeWidth={2.5} />
          </div>
          <span className="whitespace-nowrap">
            <span className="font-bold text-sidebar-foreground">Plant</span>
            <span className="font-light text-sidebar-foreground/70">Admin</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {ADMIN_NAV.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-xs font-semibold text-blue-500">
              {session.user.email?.charAt(0).toUpperCase() ?? "S"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">Super Admin</p>
              <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
            </div>
          </div>
          <div className="mt-1 space-y-1">
            <ThemeToggle collapsed={false} />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
                <LogOutIcon className="size-3.5 shrink-0" />
                <span>Sign out</span>
              </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-sidebar px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden text-muted-foreground sm:inline">Platform Administration</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-blue-600/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-500">
              Super Admin
            </span>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto bg-background p-6 text-foreground">{children}</main>
      </div>
    </div>
  )
}
