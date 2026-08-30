import type { messages as enMessages } from "./messages/en"

export type Messages = typeof enMessages

type DeepKeys<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends object
      ? DeepKeys<T[K], `${P}${K}.`>
      : never
}[keyof T & string]

export type MessageKey = DeepKeys<Messages>

export type TranslationValues = Record<string, string | number>

export interface Translator {
  (key: MessageKey, values?: TranslationValues): string
}
