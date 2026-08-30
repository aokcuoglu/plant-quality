export type FlowNodeKind = "START" | "PROCESS" | "END"

export interface FlowGraphNode {
  id: string
  kind: FlowNodeKind
}

export interface FlowGraphEdge {
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

export type FlowGraphError =
  | "START_COUNT"
  | "END_COUNT"
  | "UNKNOWN_NODE"
  | "DISCONNECTED"
  | "CYCLE"
  | "INVALID_ENDPOINT"
  | "START_OUTGOING"
  | "DUPLICATE_EDGE"
  | "SELF_EDGE"

export function buildAdjacency(nodes: FlowGraphNode[], edges: FlowGraphEdge[]) {
  const ids = new Set(nodes.map((node) => node.id))
  const outgoing = new Map<string, string[]>()
  const incoming = new Map<string, string[]>()
  for (const node of nodes) {
    outgoing.set(node.id, [])
    incoming.set(node.id, [])
  }
  const seen = new Set<string>()
  const errors = new Set<FlowGraphError>()
  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) {
      errors.add("UNKNOWN_NODE")
      continue
    }
    if (edge.source === edge.target) {
      errors.add("SELF_EDGE")
      continue
    }
    const key = `${edge.source}|${edge.sourceHandle ?? ""}->${edge.target}|${edge.targetHandle ?? ""}`
    if (seen.has(key)) {
      errors.add("DUPLICATE_EDGE")
      continue
    }
    seen.add(key)
    if (!outgoing.get(edge.source)?.includes(edge.target)) {
      outgoing.get(edge.source)?.push(edge.target)
    }
    if (!incoming.get(edge.target)?.includes(edge.source)) {
      incoming.get(edge.target)?.push(edge.source)
    }
  }
  return { ids, outgoing, incoming, errors }
}

function reachableFrom(root: string, adjacency: Map<string, string[]>) {
  const visited = new Set<string>()
  const stack = [root]
  while (stack.length) {
    const current = stack.pop()!
    if (visited.has(current)) continue
    visited.add(current)
    for (const next of adjacency.get(current) ?? []) stack.push(next)
  }
  return visited
}

function reachableTo(root: string, incoming: Map<string, string[]>) {
  const visited = new Set<string>()
  const stack = [root]
  while (stack.length) {
    const current = stack.pop()!
    if (visited.has(current)) continue
    visited.add(current)
    for (const prev of incoming.get(current) ?? []) stack.push(prev)
  }
  return visited
}

function topologicalOrder(
  nodes: FlowGraphNode[],
  outgoing: Map<string, string[]>,
  incoming: Map<string, string[]>,
) {
  const indegree = new Map(nodes.map((node) => [node.id, incoming.get(node.id)?.length ?? 0]))
  const queue: string[] = nodes
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .map((node) => node.id)
    .sort()
  const orderedIds: string[] = []
  while (queue.length) {
    const current = queue.shift()!
    orderedIds.push(current)
    for (const next of [...(outgoing.get(current) ?? [])].sort()) {
      const nextDegree = (indegree.get(next) ?? 0) - 1
      indegree.set(next, nextDegree)
      if (nextDegree === 0) queue.push(next)
    }
    queue.sort()
  }
  return orderedIds
}

/** Validates a directed acyclic flow graph. Branches and merges are allowed. */
export function validateFlowGraph(nodes: FlowGraphNode[], edges: FlowGraphEdge[]) {
  const errors = new Set<FlowGraphError>()
  const starts = nodes.filter((node) => node.kind === "START")
  const ends = nodes.filter((node) => node.kind === "END")
  if (starts.length !== 1) errors.add("START_COUNT")
  if (ends.length !== 1) errors.add("END_COUNT")

  const { outgoing, incoming, errors: edgeErrors } = buildAdjacency(nodes, edges)
  for (const error of edgeErrors) errors.add(error)

  const start = starts[0]
  const end = ends[0]
  if (start && (incoming.get(start.id)?.length ?? 0) > 0) errors.add("INVALID_ENDPOINT")
  if (end && (outgoing.get(end.id)?.length ?? 0) > 0) errors.add("INVALID_ENDPOINT")
  // Single entry into the operational graph keeps vehicle start deterministic.
  if (start && (outgoing.get(start.id)?.length ?? 0) !== 1) errors.add("START_OUTGOING")
  if (end && (incoming.get(end.id)?.length ?? 0) < 1 && nodes.length > 1) errors.add("DISCONNECTED")

  let orderedIds: string[] = []
  if (start) {
    orderedIds = topologicalOrder(nodes, outgoing, incoming)
    if (orderedIds.length !== nodes.length) errors.add("CYCLE")

    const forward = reachableFrom(start.id, outgoing)
    if (forward.size !== nodes.length) errors.add("DISCONNECTED")

    if (end) {
      const backward = reachableTo(end.id, incoming)
      if (backward.size !== nodes.length) errors.add("DISCONNECTED")
    }
  }

  return { valid: errors.size === 0, errors: [...errors], orderedIds, outgoing, incoming }
}

/** @deprecated Use validateFlowGraph — kept for existing imports. */
export function validateLinearFlow(nodes: FlowGraphNode[], edges: FlowGraphEdge[]) {
  return validateFlowGraph(nodes, edges)
}

export function successorsOf(nodeId: string, edges: FlowGraphEdge[]) {
  return [...new Set(edges.filter((edge) => edge.source === nodeId).map((edge) => edge.target))]
}

export function defaultHandleCounts(kind: FlowNodeKind) {
  if (kind === "START") return { inputCount: 0, outputCount: 1 }
  if (kind === "END") return { inputCount: 1, outputCount: 0 }
  return { inputCount: 1, outputCount: 1 }
}

/** Stable sequence: START first, END last, remaining nodes follow topo order (then leftovers). */
export function buildSequenceMap(nodes: FlowGraphNode[], orderedIds: string[]) {
  const sequence = new Map<string, number>()
  let next = 0
  const start = nodes.find((node) => node.kind === "START")
  const end = nodes.find((node) => node.kind === "END")
  if (start) sequence.set(start.id, next++)
  for (const id of orderedIds) {
    if (sequence.has(id)) continue
    if (end && id === end.id) continue
    sequence.set(id, next++)
  }
  for (const node of nodes) {
    if (sequence.has(node.id)) continue
    if (end && node.id === end.id) continue
    sequence.set(node.id, next++)
  }
  if (end) sequence.set(end.id, next++)
  return sequence
}
