"use client"

import { signOut } from "next-auth/react"
import { LogOutIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PlanBadge } from "@/components/billing/PlanBadge"
import { useTranslations } from "@/i18n/context"

interface UserMenuProps {
  user: {
    email?: string
    companyName?: string
    companyType?: string
    plan?: string
    role?: string
  }
}

export function UserMenu({ user }: UserMenuProps) {
  const initial = user.email?.charAt(0).toUpperCase() ?? "U"
  const t = useTranslations()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground ring-1 ring-sidebar-border transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        aria-label={t("shell.userMenu")}
      >
        {initial}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-56 border-sidebar-border bg-sidebar p-2 text-sidebar-foreground"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-2">
            <p className="truncate text-sm font-medium text-foreground">
              {user.companyName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <PlanBadge plan={user.plan} size="sm" className="mt-1" />
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-sidebar-border" />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOutIcon className="size-3.5 shrink-0" />
          {t("shell.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
