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
import { useTranslations } from "@/i18n/context"
import type { MessageKey } from "@/i18n/types"

const modes = [
  { key: "light" as const, icon: Sun, labelKey: "shell.theme.light" as MessageKey },
  { key: "dark" as const, icon: Moon, labelKey: "shell.theme.dark" as MessageKey },
  { key: "system" as const, icon: Monitor, labelKey: "shell.theme.system" as MessageKey },
]

export function ThemeToggle({ collapsed, iconOnly }: { collapsed?: boolean; iconOnly?: boolean }) {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()
  const t = useTranslations()

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
          iconOnly
            ? "size-8 justify-center rounded-md"
            : collapsed
              ? "justify-center p-2"
              : "w-full gap-2 px-2 py-1.5"
        )}
      >
        <div className="size-4 rounded-full bg-muted" />
        {!collapsed && !iconOnly && <div className="h-3 w-16 rounded bg-muted" />}
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
          iconOnly
            ? "size-8 justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-accent"
            : collapsed
              ? "justify-center p-2"
              : "w-full gap-2 px-2 py-1.5 text-left text-xs text-muted-foreground"
        )}
        aria-label="Switch theme"
      >
        <CurrentIcon className="size-4 shrink-0" />
        {!collapsed && !iconOnly && <span className="truncate">{t(current.labelKey)}</span>}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={iconOnly ? "bottom" : collapsed ? "right" : "top"}
        align={iconOnly ? "end" : "center"}
        sideOffset={iconOnly ? 8 : collapsed ? 8 : 4}
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
                {t(m.labelKey)}
              </span>
              {active && <Check className="size-3.5" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
