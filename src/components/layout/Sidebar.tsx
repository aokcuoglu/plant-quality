"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import {
  LayoutDashboardIcon,
  BugIcon,
  PlusCircleIcon,
  LogOutIcon,
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
  type LucideIcon,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ThemeToggle } from "@/components/theme/ThemeToggle"

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
}

interface SidebarLinkItem {
  href: string
  label: string
  icon: string
}

interface SidebarProps {
  navItems: SidebarLinkItem[]
  user: {
    email: string
    companyName: string
    companyType: string
    plan: string
  }
}

const noop = () => () => {}

export function Sidebar({ navItems, user }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const isClient = useSyncExternalStore(noop, () => true, () => false)

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
              <Factory className="size-4" strokeWidth={2.5} />
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
                Quality
              </span>
            </span>
          </div>
        </div>

        <nav className={cn("flex-1 space-y-1 overflow-hidden", isCollapsed ? "p-2" : "p-3")}>
          {navItems.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              isCollapsed={isCollapsed}
            />
          ))}
        </nav>

        <div className={cn("overflow-hidden border-t border-sidebar-border bg-sidebar", isCollapsed ? "p-2" : "p-3")}>
          <div
            className={cn(
              "flex items-center rounded-lg transition-all duration-300",
              isCollapsed ? "justify-center p-2" : "gap-3 px-2 py-2.5"
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
              {user.email?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div
              className={cn(
                "min-w-0 flex-1 whitespace-nowrap overflow-hidden transition-all duration-300",
                isCollapsed
                  ? "hidden"
                  : "max-w-40 opacity-100"
              )}
            >
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user.companyName}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              <span
                className={cn(
                  "mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase",
                  user.plan === "PRO"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-muted text-muted-foreground border border-border"
                )}
              >
                {user.plan}
              </span>
            </div>
          </div>

          <div className={cn(isCollapsed ? "mt-2 flex flex-col items-center gap-2" : "mt-1 space-y-1")}>
            <ThemeToggle collapsed={isCollapsed} />

            <SignOutButton collapsed={isCollapsed} />
          </div>
        </div>

        <button
          onClick={handleToggle}
          className="absolute -right-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-sidebar-border bg-sidebar shadow-md shadow-black/20 transition-all duration-200 hover:bg-sidebar-accent hover:border-sidebar-ring"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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

function SignOutButton({ collapsed }: { collapsed?: boolean }) {
  return (
    <button
      onClick={() => signOut()}
      className={cn(
        "flex items-center gap-2 rounded-md text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
        collapsed ? "justify-center p-2" : "w-full px-2 py-1.5"
      )}
    >
      <LogOutIcon className="size-3.5 shrink-0" />
      {!collapsed && <span>Sign out</span>}
    </button>
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
      <a
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
    </a>
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