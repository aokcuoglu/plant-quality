"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config"
import { getMessages } from "./messages"
import { createTranslator } from "./translate"
import type { MessageKey, Messages, TranslationValues } from "./types"

interface LocaleContextValue {
  locale: Locale
  t: (key: MessageKey, values?: TranslationValues) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale
  children: ReactNode
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const value = useMemo<LocaleContextValue>(() => {
    const messages: Messages = getMessages(locale)
    const t = createTranslator(messages, locale)
    return { locale, t }
  }, [locale])

  function setLocale(nextLocale: unknown) {
    if (!isLocale(nextLocale)) return
    setLocaleState(nextLocale)
  }

  return (
    <LocaleContext.Provider value={value}>
      <LocaleSwitcherContext.Provider value={{ locale, setLocale }}>
        {children}
      </LocaleSwitcherContext.Provider>
    </LocaleContext.Provider>
  )
}

const LocaleSwitcherContext = createContext<{
  locale: Locale
  setLocale: (locale: unknown) => void
} | null>(null)

export function useLocale(): Locale {
  const ctx = useContext(LocaleContext)
  return ctx?.locale ?? DEFAULT_LOCALE
}

export function useTranslations() {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error("[i18n] useTranslations must be used within a LocaleProvider")
  }
  return ctx.t
}

export function useLocaleSwitcher() {
  const ctx = useContext(LocaleSwitcherContext)
  if (!ctx) {
    throw new Error("[i18n] useLocaleSwitcher must be used within a LocaleProvider")
  }
  return ctx
}
