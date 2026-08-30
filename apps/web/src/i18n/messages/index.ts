import type { Locale } from "../config"
import type { Messages } from "../types"
import { messages as enMessages } from "./en"
import { messages as trMessages } from "./tr"

const MESSAGE_BUNDLES: Record<Locale, Messages> = {
  en: enMessages,
  tr: trMessages,
}

export function getMessages(locale: Locale): Messages {
  return MESSAGE_BUNDLES[locale]
}
