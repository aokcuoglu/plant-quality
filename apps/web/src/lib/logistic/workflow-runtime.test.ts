import test from "node:test"
import assert from "node:assert/strict"
import { isTaskAssignee, type WorkflowActor } from "./workflow-assignment"

const editor: WorkflowActor = {
  companyId: "company-a",
  userId: "user-a",
  role: "EDITOR",
  organizationUnitId: "unit-a",
}

test("a specific-user assignment is narrower than its organization unit", () => {
  assert.equal(
    isTaskAssignee(editor, {
      assignedUserId: "user-a",
      assignedOrganizationUnitId: "unit-a",
    }),
    true,
  )
  assert.equal(
    isTaskAssignee(
      { ...editor, userId: "user-b" },
      {
        assignedUserId: "user-a",
        assignedOrganizationUnitId: "unit-a",
      },
    ),
    false,
  )
})

test("a specific user must still belong to the stored organization unit", () => {
  assert.equal(
    isTaskAssignee(
      { ...editor, organizationUnitId: "unit-b" },
      {
        assignedUserId: "user-a",
        assignedOrganizationUnitId: "unit-a",
      },
    ),
    false,
  )
})

test("any editor in a unit can act on a unit-only assignment", () => {
  const task = {
    assignedUserId: null,
    assignedOrganizationUnitId: "unit-a",
  }
  assert.equal(isTaskAssignee(editor, task), true)
  assert.equal(isTaskAssignee({ ...editor, userId: "user-b" }, task), true)
  assert.equal(isTaskAssignee({ ...editor, role: "VIEWER" }, task), false)
  assert.equal(
    isTaskAssignee({ ...editor, organizationUnitId: "unit-b" }, task),
    false,
  )
})
