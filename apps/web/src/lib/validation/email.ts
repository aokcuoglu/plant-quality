import { z } from "zod"

/** Characters allowed in an email local-part (left of @), excluding quoted strings. */
export const EMAIL_LOCAL_PART_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/

/** HTML pattern attribute aligned with EMAIL_LOCAL_PART_PATTERN (no leading/trailing dots via Zod refine). */
export const EMAIL_LOCAL_PART_HTML_PATTERN = "[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+"

export type EmailMessages = {
  invalid: string
  localPartInvalid: string
  /** Local-part may contain at most one `.` (e.g. first.last). */
  localPartTooManyDots?: string
  required?: string
}

const DEFAULT_EMAIL_MESSAGES: EmailMessages = {
  invalid: "Enter a valid email address",
  localPartInvalid: "Enter the part before @ (e.g. first.last)",
  localPartTooManyDots: "Use at most one dot (e.g. first.last)",
  required: "Required",
}

export function emailSchema(messages: Partial<EmailMessages> = {}) {
  const m = { ...DEFAULT_EMAIL_MESSAGES, ...messages }
  return z
    .string()
    .trim()
    .min(1, { error: m.required ?? m.invalid })
    .transform((v) => v.toLowerCase())
    .pipe(z.email({ error: m.invalid }))
}

export function emailLocalPartSchema(messages: Partial<EmailMessages> = {}) {
  const m = { ...DEFAULT_EMAIL_MESSAGES, ...messages }
  return z
    .string()
    .trim()
    .min(1, { error: m.required ?? m.localPartInvalid })
    .regex(EMAIL_LOCAL_PART_PATTERN, { error: m.localPartInvalid })
    .refine((v) => !v.startsWith(".") && !v.endsWith(".") && !v.includes(".."), {
      error: m.localPartInvalid,
    })
    .refine((v) => (v.match(/\./g) ?? []).length <= 1, {
      error: m.localPartTooManyDots ?? m.localPartInvalid,
    })
}

export function composeCompanyEmail(
  localPart: string,
  domain: string,
  messages: Partial<EmailMessages> = {},
): { success: true; email: string } | { success: false; error: string; fieldErrors: Record<string, string> } {
  const localResult = emailLocalPartSchema(messages).safeParse(localPart)
  if (!localResult.success) {
    const msg = localResult.error.issues[0]?.message ?? DEFAULT_EMAIL_MESSAGES.localPartInvalid
    return { success: false, error: msg, fieldErrors: { email: msg } }
  }

  const emailResult = emailSchema(messages).safeParse(`${localResult.data}@${domain}`)
  if (!emailResult.success) {
    const msg = emailResult.error.issues[0]?.message ?? DEFAULT_EMAIL_MESSAGES.invalid
    return { success: false, error: msg, fieldErrors: { email: msg } }
  }

  return { success: true, email: emailResult.data }
}

/** Live field check: empty input returns null (required only on submit). */
export function getEmailFieldError(
  value: string,
  emailDomain: string | null,
  messages: Partial<EmailMessages> = {},
): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (emailDomain) {
    const composed = composeCompanyEmail(trimmed, emailDomain, messages)
    return composed.success ? null : (composed.fieldErrors.email ?? composed.error)
  }

  const parsed = emailSchema(messages).safeParse(trimmed)
  if (parsed.success) return null
  return parsed.error.issues[0]?.message ?? messages.invalid ?? DEFAULT_EMAIL_MESSAGES.invalid
}

export function isEmailInAllowedDomains(email: string, domains: string[]): boolean {
  if (domains.length === 0) return true
  const emailDomain = email.split("@")[1]?.toLowerCase()
  if (!emailDomain) return false
  return domains.some((domain) => domain.toLowerCase() === emailDomain)
}
