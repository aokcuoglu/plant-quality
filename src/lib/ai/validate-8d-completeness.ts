export interface EightDCompletenessResult {
  problemDescriptionComplete: boolean
  containmentDefined: boolean
  rootCauseDefined: boolean
  correctiveActionDefined: boolean
  preventiveActionDefined: boolean
  verificationDefined: boolean
  missingItems: string[]
  completenessPercent: number
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function hasTextProperty(obj: unknown, key: string): boolean {
  if (typeof obj !== "object" || obj === null) return false
  return hasText((obj as Record<string, unknown>)[key])
}

export function validateEightDCompleteness(report: {
  team: unknown
  d2_problem: string | null
  containmentActions: unknown
  d4_rootCause: string | null
  d5Actions: unknown
  d6Actions: unknown
  d7Preventive: string | null
  d7Impacts: unknown
  d8_recognition: string | null
}): EightDCompletenessResult {
  const safeContainmentActions = Array.isArray(report.containmentActions) ? report.containmentActions : []
  const safeD5Actions = Array.isArray(report.d5Actions) ? report.d5Actions : []
  const safeD6Actions = Array.isArray(report.d6Actions) ? report.d6Actions : []

  const checks = {
    problemDescriptionComplete: hasText(report.d2_problem),
    containmentDefined: safeContainmentActions.length > 0 && safeContainmentActions.some((a) => hasTextProperty(a, "description")),
    rootCauseDefined: hasText(report.d4_rootCause),
    correctiveActionDefined: safeD5Actions.length > 0 && safeD5Actions.some((a) => hasTextProperty(a, "action") && hasTextProperty(a, "verificationMethod")),
    preventiveActionDefined: hasText(report.d7Preventive),
    verificationDefined: safeD6Actions.length > 0 && safeD6Actions.some((a) => hasTextProperty(a, "actionId") && hasTextProperty(a, "validatedByUserId")),
  }

  const missingItems: string[] = []
  if (!checks.problemDescriptionComplete) missingItems.push("D2 Problem Description")
  if (!checks.containmentDefined) missingItems.push("D3 Containment Actions")
  if (!checks.rootCauseDefined) missingItems.push("D4 Root Cause Analysis")
  if (!checks.correctiveActionDefined) missingItems.push("D5 Corrective Actions")
  if (!checks.verificationDefined) missingItems.push("D6 Validation & Implementation")
  if (!checks.preventiveActionDefined) missingItems.push("D7 Preventive Actions")

  const total = 6
  const completed = Object.values(checks).filter(Boolean).length
  const completenessPercent = Math.round((completed / total) * 100)

  return {
    ...checks,
    missingItems,
    completenessPercent,
  }
}