"use client"

import { Check, Languages } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocale, useLocaleSwitcher, useTranslations } from "@/i18n/context"
import { locales, LOCALE_NAMES, type Locale } from "@/i18n/config"
import { setLocaleCookie } from "@/i18n/set-locale"

export function LanguageSwitcher() {
  const locale = useLocale()
  const { setLocale } = useLocaleSwitcher()
  const router = useRouter()
  const t = useTranslations()

  function handleSelect(nextLocale: Locale) {
    setLocale(nextLocale)
    setLocaleCookie(nextLocale)
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-8 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:border-sidebar-ring data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground data-open:border-sidebar-ring"
        aria-label={t("shell.switchLanguage")}
      >
        <Languages className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-44 border-sidebar-border bg-sidebar p-2 text-sidebar-foreground"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 pb-1 pt-1 text-xs font-medium text-muted-foreground">
            {t("shell.switchLanguage")}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-sidebar-border" />
        {locales.map((l) => {
          const active = l === locale
          return (
            <DropdownMenuItem
              key={l}
              onClick={() => handleSelect(l)}
              className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
            >
              <span>{LOCALE_NAMES[l]}</span>
              {active && <Check className="size-3.5 shrink-0" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
