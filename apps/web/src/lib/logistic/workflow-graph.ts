import type {
  WorkflowDraftEdgeInput,
  WorkflowDraftNodeInput,
} from "./workflow-contract"
import {
  WORKFLOW_ACTIONS,
  WORKFLOW_TRANSITION_ACTIONS,
} from "./workflow-contract"
import type { LogisticWorkflowSubjectType } from "@plantx/db/client"

export interface WorkflowGraphValidation {
  valid: boolean
  errors: string[]
  orderedIds: string[]
}

export function validateWorkflowGraph(
  nodes: WorkflowDraftNodeInput[],
  edges: WorkflowDraftEdgeInput[],
): WorkflowGraphValidation {
  const errors: string[] = []
  const ids = new Set(nodes.map((node) => node.id))
  const starts = nodes.filter((node) => node.kind === "START")
  const ends = nodes.filter((node) => node.kind === "END")

  if (starts.length !== 1) errors.push("START_REQUIRED")
  if (ends.length !== 1) errors.push("END_REQUIRED")
  if (ids.size !== nodes.length) errors.push("DUPLICATE_NODE")

  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) errors.push("UNKNOWN_NODE")
    if (edge.source === edge.target) errors.push("SELF_EDGE")
  }

  const outgoing = new Map<string, WorkflowDraftEdgeInput[]>()
  const incoming = new Map<string, WorkflowDraftEdgeInput[]>()
  for (const edge of edges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge])
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge])
  }

  if (starts[0] && (outgoing.get(starts[0].id)?.length ?? 0) !== 1) {
    errors.push("START_SINGLE_EXIT")
  }
  if (starts[0] && (outgoing.get(starts[0].id) ?? []).some((edge) => edge.actionKey)) {
    errors.push("START_AUTOMATIC")
  }
  if (starts[0] && (incoming.get(starts[0].id)?.length ?? 0) !== 0) {
    errors.push("START_NO_ENTRY")
  }
  if (ends[0] && (outgoing.get(ends[0].id)?.length ?? 0) !== 0) {
    errors.push("END_NO_EXIT")
  }

  for (const node of nodes) {
    if (!node.name.trim()) errors.push(`NAME_REQUIRED:${node.id}`)
    if (node.kind !== "START" && (incoming.get(node.id)?.length ?? 0) === 0) {
      errors.push(`NO_ENTRY:${node.id}`)
    }
    if (node.kind !== "END" && (outgoing.get(node.id)?.length ?? 0) === 0) {
      errors.push(`NO_EXIT:${node.id}`)
    }
    if (node.assignmentStrategy === "USER" && !node.responsibleUserId) {
      errors.push(`USER_REQUIRED:${node.id}`)
    }
    if (
      node.assignmentStrategy === "ORGANIZATION_UNIT" &&
      !node.organizationUnitId
    ) {
      errors.push(`UNIT_REQUIRED:${node.id}`)
    }
    if (
      node.kind !== "START" &&
      node.kind !== "END" &&
      node.assignmentStrategy === "NONE"
    ) {
      errors.push(`ASSIGNMENT_REQUIRED:${node.id}`)
    }
    if (node.kind === "AUTOMATION") errors.push(`AUTOMATION_UNSUPPORTED:${node.id}`)
    if (node.taskScope !== "INSTANCE") errors.push(`TASK_SCOPE_UNSUPPORTED:${node.id}`)
    const routeActions = new Set<string>()
    for (const edge of outgoing.get(node.id) ?? []) {
      if (node.kind !== "START" && !edge.actionKey) {
        errors.push(`ACTION_REQUIRED:${node.id}`)
      }
      if (!edge.actionKey) continue
      if (routeActions.has(edge.actionKey)) errors.push(`DUPLICATE_ACTION:${node.id}`)
      routeActions.add(edge.actionKey)
      if (!node.allowedActions.includes(edge.actionKey)) {
        errors.push(`ACTION_NOT_ALLOWED:${node.id}`)
      }
    }
  }

  const startId = starts[0]?.id
  const reachable = new Set<string>()
  const queue = startId ? [startId] : []
  while (queue.length) {
    const current = queue.shift()
    if (!current || reachable.has(current)) continue
    reachable.add(current)
    for (const edge of outgoing.get(current) ?? []) queue.push(edge.target)
  }
  if (reachable.size !== nodes.length) errors.push("UNREACHABLE_NODE")

  const endId = ends[0]?.id
  const canReachEnd = new Set<string>()
  const reverseQueue = endId ? [endId] : []
  while (reverseQueue.length) {
    const current = reverseQueue.shift()
    if (!current || canReachEnd.has(current)) continue
    canReachEnd.add(current)
    for (const edge of incoming.get(current) ?? []) reverseQueue.push(edge.source)
  }
  if (canReachEnd.size !== nodes.length) errors.push("NO_PATH_TO_END")

  const orderedIds = [...nodes]
    .sort((left, right) => left.position.x - right.position.x || left.position.y - right.position.y)
    .map((node) => node.id)

  return { valid: errors.length === 0, errors: [...new Set(errors)], orderedIds }
}

export function validateWorkflowActionRoutes(
  subjectType: LogisticWorkflowSubjectType,
  nodes: WorkflowDraftNodeInput[],
  edges: WorkflowDraftEdgeInput[],
): string[] {
  const errors: string[] = []
  const allowedRegistry = new Set<string>(WORKFLOW_ACTIONS[subjectType])
  const transitionRegistry = new Set<string>(WORKFLOW_TRANSITION_ACTIONS[subjectType])
  const outgoing = new Map<string, WorkflowDraftEdgeInput[]>()
  for (const edge of edges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge])
    if (edge.actionKey && !transitionRegistry.has(edge.actionKey)) {
      errors.push(`NON_TRANSITION_ACTION:${edge.actionKey}`)
    }
  }
  for (const node of nodes) {
    for (const action of node.allowedActions) {
      if (!allowedRegistry.has(action)) errors.push(`UNKNOWN_ACTION:${action}`)
      if (
        transitionRegistry.has(action) &&
        !(outgoing.get(node.id) ?? []).some((edge) => edge.actionKey === action)
      ) {
        errors.push(`TRANSITION_REQUIRED:${node.id}:${action}`)
      }
    }
  }
  return [...new Set(errors)]
}
