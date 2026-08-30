import type { Role } from "@plantx/db/client"
import { isEditorRole } from "@/lib/roles"

/**
 * PlantLogistic role helpers.
 *
 * Company-level roles are ADMIN / EDITOR / VIEWER:
 * - ADMIN & EDITOR may perform every logistic write (order & plan-sheet creation,
 *   commercial review, production prep, PDI and dispatch/delivery). Department
 *   assignment controls which area a user operates in.
 * - VIEWER is read-only.
 * SUPER_ADMIN is granted every capability (platform override).
 */

export function isLogisticReadOnly(role: Role): boolean {
  return role === "VIEWER"
}

export function canSalesExport(role: Role): boolean {
  return isEditorRole(role)
}

export function canProduction(role: Role): boolean {
  return isEditorRole(role)
}

export function canPdi(role: Role): boolean {
  return isEditorRole(role)
}

export function canDelivery(role: Role): boolean {
  return isEditorRole(role)
}

/** True when the given role may perform the whole plan-sheet / order creation flow. */
export function canCreateVehicleRequests(role: Role): boolean {
  return canSalesExport(role)
}

/** True when the role may review/approve plan sheets and run production prep. */
export function canReviewPlanSheets(role: Role): boolean {
  return canProduction(role)
}
