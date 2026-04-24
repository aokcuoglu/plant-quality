"use client"

import { useEffect, useState } from "react"
import {
  LayoutDashboardIcon,
  BugIcon,
  PlusCircleIcon,
  LogOutIcon,
  Factory,
  ChevronLeft,
  ChevronRight,
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

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboardIcon,
  BugIcon,
  PlusCircleIcon,
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

export function Sidebar({ navItems, user }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sidebar-collapsed")
      return stored === "true"
    }
    return false
  })

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(isCollapsed))
  }, [isCollapsed])

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "relative flex flex-col border-r bg-card transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className={cn("flex shrink-0 items-center border-b overflow-hidden", isCollapsed ? "h-12" : "h-14")}>
          <div
            className={cn(
              "flex items-center transition-all duration-300",
              isCollapsed ? "justify-center w-full" : "gap-2.5 px-5"
            )}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <Factory className="size-4 text-emerald-500" />
            </div>
            <span
              className={cn(
                "whitespace-nowrap overflow-hidden transition-all duration-300",
                isCollapsed
                  ? "hidden"
                  : "max-w-40 opacity-100"
              )}
            >
              <span className="font-bold text-slate-900 dark:text-slate-100">
                Plant
              </span>
              <span className="font-light ml-0.5 text-slate-500 dark:text-slate-400">
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

        <div className={cn("border-t overflow-hidden", isCollapsed ? "p-2" : "p-3")}>
          <div
            className={cn(
              "flex items-center rounded-lg transition-all duration-300",
              isCollapsed ? "justify-center p-2" : "gap-3 px-2 py-2.5"
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-semibold text-emerald-600">
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
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {user.companyName}
              </p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
              <span
                className={cn(
                  "mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase",
                  user.plan === "PRO"
                    ? "bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-600"
                )}
              >
                {user.plan}
              </span>
            </div>
          </div>
          <div className={cn("mt-1", isCollapsed && "hidden")}>
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOutIcon className="h-3.5 w-3.5 shrink-0" />
              <span>
                Sign out
              </span>
            </button>
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="absolute -right-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="size-3 text-slate-500" />
          ) : (
            <ChevronLeft className="size-3 text-slate-500" />
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
    <a
      href={item.href}
      className={cn(
        "group flex items-center rounded-lg text-sm font-medium border-l-0 transition-all hover:text-slate-900 hover:bg-slate-50",
        isCollapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2 border-l-4 border-transparent hover:border-emerald-500/30"
      )}
      data-active={undefined}
    >
      <Icon className="size-4 shrink-0 text-slate-500 group-hover:text-slate-700" />
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
