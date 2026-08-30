import type { ZodError } from "zod"

export type ActionSuccess<T = void> = { success: true; data?: T }
export type ActionFailure = {
  success: false
  error: string
  fieldErrors?: Record<string, string>
}
export type ActionResult<T = void> = ActionSuccess<T> | ActionFailure

export function zodToActionError(error: ZodError, fallback = "Validation failed"): ActionFailure {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form")
    if (!fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return {
    success: false,
    error: error.issues[0]?.message ?? fallback,
    fieldErrors,
  }
}

export function isActionFailure(result: ActionResult<unknown>): result is ActionFailure {
  return result.success === false
}
