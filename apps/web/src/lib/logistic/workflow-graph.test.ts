import test from "node:test"
import assert from "node:assert/strict"
import {
  validateWorkflowActionRoutes,
  validateWorkflowGraph,
} from "./workflow-graph"
import type { WorkflowDraftNodeInput } from "./workflow-contract"

const node = (
  id: string,
  kind: WorkflowDraftNodeInput["kind"],
  x: number,
  allowedActions: string[] = [],
): WorkflowDraftNodeInput => ({
  id,
  kind,
  name: id,
  position: { x, y: 0 },
  assignmentStrategy: kind === "START" || kind === "END" ? "NONE" : "ACTOR",
  taskScope: "INSTANCE",
  allowedActions,
})

test("accepts a versioned approval workflow with action routes", () => {
  const result = validateWorkflowGraph(
    [
      node("start", "START", 0),
      node("review", "APPROVAL", 100, ["APPROVE", "REJECT"]),
      node("end", "END", 200),
    ],
    [
      { source: "start", target: "review" },
      { source: "review", target: "end", actionKey: "APPROVE" },
      { source: "review", target: "end", actionKey: "REJECT" },
    ],
  )

  assert.equal(result.valid, true)
  assert.deepEqual(result.orderedIds, ["start", "review", "end"])
})

test("rejects a user-assigned task without a responsible user", () => {
  const review = node("review", "TASK", 100, ["SUBMIT"])
  review.assignmentStrategy = "USER"
  const result = validateWorkflowGraph(
    [node("start", "START", 0), review, node("end", "END", 200)],
    [
      { source: "start", target: "review" },
      { source: "review", target: "end", actionKey: "SUBMIT" },
    ],
  )

  assert.equal(result.valid, false)
  assert.ok(result.errors.includes("USER_REQUIRED:review"))
})

test("allows capability actions without edges and requires routes for transitions", () => {
  const sales = node("sales", "TASK", 100, [
    "PLAN_SHEET_EDIT",
    "PLAN_SHEET_SUBMIT",
  ])
  const nodes = [node("start", "START", 0), sales, node("end", "END", 200)]
  const missingRoute = validateWorkflowActionRoutes("PLAN_SHEET", nodes, [
    { source: "start", target: "sales" },
  ])
  assert.ok(
    missingRoute.includes("TRANSITION_REQUIRED:sales:PLAN_SHEET_SUBMIT"),
  )

  const validRoutes = validateWorkflowActionRoutes("PLAN_SHEET", nodes, [
    { source: "start", target: "sales" },
    { source: "sales", target: "end", actionKey: "PLAN_SHEET_SUBMIT" },
  ])
  assert.deepEqual(validRoutes, [])
})
