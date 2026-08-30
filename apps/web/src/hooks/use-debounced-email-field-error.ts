"use client"

import { useEffect, useMemo, type Dispatch, type SetStateAction } from "react"
import { getEmailFieldError, type EmailMessages } from "@/lib/validation"

const DEFAULT_DEBOUNCE_MS = 300

/**
 * Debounced live validation for domain-fixed or full email inputs.
 * Empty value clears the email field error (required is enforced on submit).
 */
export function useDebouncedEmailFieldError({
  value,
  emailDomain,
  messages,
  enabled = true,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  setFieldErrors,
}: {
  value: string
  emailDomain: string | null
  messages: Partial<EmailMessages>
  enabled?: boolean
  debounceMs?: number
  setFieldErrors: Dispatch<SetStateAction<Record<string, string>>>
}) {
  // Stabilize message object identity when callers pass inline literals.
  const messageKey = useMemo(
    () =>
      JSON.stringify({
        invalid: messages.invalid,
        localPartInvalid: messages.localPartInvalid,
        localPartTooManyDots: messages.localPartTooManyDots,
        required: messages.required,
      }),
    [
      messages.invalid,
      messages.localPartInvalid,
      messages.localPartTooManyDots,
      messages.required,
    ],
  )

  useEffect(() => {
    if (!enabled) return

    const timer = window.setTimeout(() => {
      const error = getEmailFieldError(value, emailDomain, messages)
      setFieldErrors((prev) => {
        if (!error) {
          if (!prev.email) return prev
          const next = { ...prev }
          delete next.email
          return next
        }
        if (prev.email === error) return prev
        return { ...prev, email: error }
      })
    }, debounceMs)

    return () => window.clearTimeout(timer)
    // messages content tracked via messageKey
    // eslint-disable-next-line react-hooks/exhaustive-deps -- messageKey proxies messages
  }, [value, emailDomain, enabled, debounceMs, messageKey, setFieldErrors])
}
