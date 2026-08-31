import type { Role } from "@plantx/db/client"
import { isEditorRole } from "../roles"

export interface WorkflowActor {
  companyId: string
  userId: string
  role: Role
  organizationUnitId: string | null
}

export function isTaskAssignee(
  actor: WorkflowActor,
  task: {
    assignedUserId: string | null
    assignedOrganizationUnitId: string | null
  },
): boolean {
  if (!isEditorRole(actor.role)) return false
  if (task.assignedUserId) {
    return task.assignedUserId === actor.userId
      && (!task.assignedOrganizationUnitId
        || task.assignedOrganizationUnitId === actor.organizationUnitId)
  }
  if (task.assignedOrganizationUnitId) {
    return task.assignedOrganizationUnitId === actor.organizationUnitId
  }
  return false
}
