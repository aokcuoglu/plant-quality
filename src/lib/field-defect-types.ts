import type { EscalationLevel, FieldDefectSeverity, FieldDefectSource, FieldDefectStatus } from "@/generated/prisma/client"

export const FIELD_DEFECT_PAGE_SIZE = 20

export interface FieldDefectRow {
  id: string
  title: string
  status: FieldDefectStatus
  severity: FieldDefectSeverity
  source: FieldDefectSource
  supplierName: string | null
  vin: string | null
  vehicleModel: string | null
  partNumber: string | null
  reportDate: Date
  createdAt: Date
  linkedDefectId: string | null
  responseDueAt: Date | null
  resolutionDueAt: Date | null
  escalationLevel: EscalationLevel
  category: string | null
  subcategory: string | null
  probableArea: string | null
}