import type {
  LogisticWorkflowAssignmentStrategy,
  LogisticWorkflowNodeKind,
  LogisticWorkflowSubjectType,
  LogisticWorkflowTaskScope,
} from "@plantx/db/client"

export const WORKFLOW_ACTIONS = {
  PLAN_SHEET: [
    "PLAN_SHEET_EDIT",
    "PLAN_SHEET_SUBMIT",
    "PLAN_SHEET_CANCEL",
    "PLAN_SHEET_SET_FORECAST",
    "PLAN_SHEET_REVIEW_LINE",
    "PLAN_SHEET_APPROVE",
    "PLAN_SHEET_REJECT",
  ],
  ORDER: [],
  VEHICLE_UNIT: ["VEHICLE_ADVANCE"],
  YARD_RECORD: [],
  DISPATCH: [],
} as const satisfies Record<LogisticWorkflowSubjectType, readonly string[]>

export const WORKFLOW_TRANSITION_ACTIONS = {
  PLAN_SHEET: [
    "PLAN_SHEET_SUBMIT",
    "PLAN_SHEET_CANCEL",
    "PLAN_SHEET_APPROVE",
    "PLAN_SHEET_REJECT",
  ],
  ORDER: [],
  VEHICLE_UNIT: ["VEHICLE_ADVANCE"],
  YARD_RECORD: [],
  DISPATCH: [],
} as const satisfies Record<LogisticWorkflowSubjectType, readonly string[]>

export type WorkflowActionKey =
  (typeof WORKFLOW_ACTIONS)[keyof typeof WORKFLOW_ACTIONS][number]

export const WORKFLOW_NODE_KINDS = [
  "START",
  "TASK",
  "APPROVAL",
  "DECISION",
  "AUTOMATION",
  "WAIT",
  "END",
] as const satisfies readonly LogisticWorkflowNodeKind[]

export const WORKFLOW_ASSIGNMENT_STRATEGIES = [
  "NONE",
  "ACTOR",
  "USER",
  "ORGANIZATION_UNIT",
] as const satisfies readonly LogisticWorkflowAssignmentStrategy[]

export const WORKFLOW_TASK_SCOPES = [
  "INSTANCE",
] as const satisfies readonly LogisticWorkflowTaskScope[]

export interface WorkflowDraftNodeInput {
  id: string
  kind: LogisticWorkflowNodeKind
  name: string
  description?: string | null
  position: { x: number; y: number }
  assignmentStrategy: LogisticWorkflowAssignmentStrategy
  organizationUnitId?: string | null
  responsibleUserId?: string | null
  taskScope: LogisticWorkflowTaskScope
  allowedActions: string[]
  automationActionKey?: string | null
  targetDurationMinutes?: number | null
}

export interface WorkflowDraftEdgeInput {
  source: string
  target: string
  actionKey?: string | null
  label?: string | null
}
