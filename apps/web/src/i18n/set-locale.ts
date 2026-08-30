import { LOCALE_COOKIE, isLocale, type Locale } from "./config"

export function setLocaleCookie(locale: unknown) {
  if (!isLocale(locale)) return
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`
  document.documentElement.lang = locale
}

export function readLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`))
  const value = match?.[1]
  return isLocale(value) ? value : null
}
