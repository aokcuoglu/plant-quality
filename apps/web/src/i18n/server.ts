import { cookies } from "next/headers"
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config"
import { getMessages } from "./messages"
import { createTranslator } from "./translate"
import type { Translator } from "./types"

export { LOCALE_COOKIE, DEFAULT_LOCALE, locales, isLocale } from "./config"
export type { Locale } from "./config"

export function getMessagesByLocale(locale: Locale) {
  return getMessages(locale)
}

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(LOCALE_COOKIE)?.value
  return isLocale(raw) ? raw : DEFAULT_LOCALE
}

export async function getTranslations(): Promise<Translator> {
  const locale = await getLocale()
  return createTranslator(getMessages(locale), locale)
}
