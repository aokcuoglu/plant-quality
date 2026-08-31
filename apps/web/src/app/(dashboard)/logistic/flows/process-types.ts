export const PROCESS_TYPES = [
  "OPERATION",
  "QUALITY_CONTROL",
  "WAITING",
  "STORAGE_YARD",
  "DISPATCH",
  "TRANSPORT",
  "DELIVERY",
  "OTHER",
] as const

export type ProcessType = (typeof PROCESS_TYPES)[number]

export function isProcessType(value: string): value is ProcessType {
  return (PROCESS_TYPES as readonly string[]).includes(value)
}
