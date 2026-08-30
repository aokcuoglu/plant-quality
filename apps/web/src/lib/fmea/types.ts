export interface FmeaRow {
  id: string
  processStep?: string
  functionName?: string
  failureMode: string
  failureEffect: string
  severity: number
  failureCause?: string
  occurrence: number
  preventionControl?: string
  detectionControl?: string
  detection: number
  rpn: number
  recommendedAction?: string
  actionOwner?: string
  targetDate?: string
  actionStatus: FmeaActionStatusValue
  revisedSeverity?: number
  revisedOccurrence?: number
  revisedDetection?: number
  revisedRpn?: number
  supplierComment?: string
  oemComment?: string
  currentControl?: string
  potentialFailureMode?: string
  potentialEffect?: string
  potentialCause?: string
  actionTaken?: string
}

export type FmeaActionStatusValue = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"

export function calcRpn(severity: number, occurrence: number, detection: number): number {
  return severity * occurrence * detection
}

export function calcRevisedRpn(revisedSeverity?: number, revisedOccurrence?: number, revisedDetection?: number): number | undefined {
  if (revisedSeverity != null && revisedOccurrence != null && revisedDetection != null) {
    return revisedSeverity * revisedOccurrence * revisedDetection
  }
  return undefined
}

export function validateSod(value: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    return { valid: false, error: "Value must be an integer between 1 and 10" }
  }
  return { valid: true }
}

export function getMaxRpn(rows: FmeaRow[]): number {
  if (rows.length === 0) return 0
  return Math.max(...rows.map(r => r.rpn ?? 0))
}

export function getOpenActionCount(rows: FmeaRow[]): number {
  return rows.filter(r => r.recommendedAction && r.actionStatus !== "COMPLETED" && r.actionStatus !== "CANCELLED").length
}

export function getCompletedActionCount(rows: FmeaRow[]): number {
  return rows.filter(r => r.actionStatus === "COMPLETED").length
}

let rowCounter = 0
export function genRowId(): string {
  return `row_${++rowCounter}_${Date.now()}`
}

export function createEmptyRow(fmeaType: "DESIGN" | "PROCESS"): FmeaRow {
  return {
    id: genRowId(),
    processStep: fmeaType === "PROCESS" ? "" : undefined,
    failureMode: "",
    failureEffect: "",
    severity: 5,
    failureCause: "",
    occurrence: 3,
    preventionControl: "",
    detectionControl: "",
    detection: 5,
    rpn: 75,
    recommendedAction: "",
    actionOwner: "",
    actionStatus: "OPEN",
    targetDate: "",
  }
}