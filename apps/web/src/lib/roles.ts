import type { Role } from "@plantx/db/client"

/**
 * Company-level role model (ADMIN / EDITOR / VIEWER).
 *
 * - ADMIN: company owner — every capability + administration.
 * - EDITOR: can create/edit/approve content across every module.
 * - VIEWER: read-only.
 *
 * SUPER_ADMIN is a platform role granted every capability (override).
 */
export function isEditorRole(role: Role | string | null | undefined): boolean {
  return role === "ADMIN" || role === "EDITOR" || role === "SUPER_ADMIN"
}

/** True only for company/platform administration roles. */
export function isAdminRole(role: Role | string | null | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}
