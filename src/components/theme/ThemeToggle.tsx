"use client"

import { useTheme } from "next-themes"
import {
  Sun,
  Moon,
  Monitor,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMounted } from "@/hooks/use-mounted"

const modes = [
  { key: "light" as const, icon: Sun, label: "Light" },
  { key: "dark" as const, icon: Moon, label: "Dark" },
  { key: "system" as const, icon: Monitor, label: "System" },
]

export function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()

  const isActive = (key: string) => {
    if (theme === key) return true
    if (key === "system" && !theme) return true
    return false
  }

  if (!mounted) {
    return (
      <div
        className={cn(
          "flex items-center",
          collapsed ? "justify-center p-2" : "w-full gap-2 px-2 py-1.5"
        )}
      >
        <div className="size-4 rounded-full bg-muted" />
        {!collapsed && <div className="h-3 w-16 rounded bg-muted" />}
      </div>
    )
  }

  const current = modes.find((m) => m.key === theme) ?? modes[2]
  const CurrentIcon = current.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center rounded-lg outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          collapsed
            ? "justify-center p-2"
            : "w-full gap-2 px-2 py-1.5 text-left text-xs text-muted-foreground"
        )}
        aria-label="Switch theme"
      >
        <CurrentIcon className="size-4 shrink-0" />
        {!collapsed && <span className="truncate">{current.label}</span>}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={collapsed ? "right" : "top"}
        align="center"
        sideOffset={collapsed ? 8 : 4}
        className="min-w-[8rem] border-sidebar-border bg-sidebar text-sidebar-foreground"
      >
        {modes.map((m) => {
          const Icon = m.icon
          const active = isActive(m.key)
          return (
            <DropdownMenuItem
              key={m.key}
              onClick={() => setTheme(m.key)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <span className="flex items-center gap-2">
                <Icon className="size-3.5" />
                {m.label}
              </span>
              {active && <Check className="size-3.5" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
