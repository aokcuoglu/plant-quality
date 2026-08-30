import type { Locale } from "./config"
import type { MessageKey, Messages, TranslationValues, Translator } from "./types"

function lookup(messages: Messages, key: MessageKey): string {
  const segments = key.split(".")
  let current: unknown = messages
  for (const segment of segments) {
    if (typeof current !== "object" || current === null) break
    current = (current as Record<string, unknown>)[segment]
  }
  if (typeof current !== "string") {
    throw new Error(`[i18n] Missing translation for key "${key}"`)
  }
  return current
}

function interpolate(template: string, values?: TranslationValues): string {
  if (!values) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name]
    return value === undefined ? match : String(value)
  })
}

export function createTranslator(messages: Messages, _locale: Locale): Translator {
  return (key, values) => interpolate(lookup(messages, key), values)
}
