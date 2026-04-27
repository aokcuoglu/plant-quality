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

interface ContainmentAction {
  id: string
  description: string
  responsibleUserId: string
  responsibleName: string
  effectiveness: number
  targetDate: string
  actualDate: string
}

interface D5Action {
  id: string
  action: string
  verificationMethod: string
  effectiveness: number
}

interface D6Action {
  id: string
  actionId: string
  actionDescription: string
  targetDate: string
  actualDate: string
  validatedByUserId: string
  validatedByName: string
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function hasArrayItems(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0
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
  const checks = {
    problemDescriptionComplete: hasText(report.d2_problem),
    containmentDefined: hasArrayItems(report.containmentActions) && (report.containmentActions as ContainmentAction[]).some((a) => hasText(a.description)),
    rootCauseDefined: hasText(report.d4_rootCause),
    correctiveActionDefined: hasArrayItems(report.d5Actions) && (report.d5Actions as D5Action[]).some((a) => hasText(a.action) && hasText(a.verificationMethod)),
    preventiveActionDefined: hasText(report.d7Preventive),
    verificationDefined: hasArrayItems(report.d6Actions) && (report.d6Actions as D6Action[]).some((a) => hasText(a.actionId) && hasText(a.validatedByUserId)),
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