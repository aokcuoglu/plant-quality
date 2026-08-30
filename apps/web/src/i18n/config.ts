export const locales = ["tr", "en"] as const

export type Locale = (typeof locales)[number]

export const DEFAULT_LOCALE: Locale = "tr"

export const LOCALE_COOKIE = "plantx_locale"

export const LOCALE_NAMES: Record<Locale, string> = {
  tr: "Türkçe",
  en: "English",
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value)
}
