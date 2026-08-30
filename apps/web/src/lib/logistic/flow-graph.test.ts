import assert from "node:assert/strict"
import test from "node:test"
import {
  buildSequenceMap,
  validateFlowGraph,
  type FlowGraphEdge,
  type FlowGraphNode,
} from "./flow-graph"

const linearNodes: FlowGraphNode[] = [
  { id: "start", kind: "START" },
  { id: "wash", kind: "PROCESS" },
  { id: "pdi", kind: "PROCESS" },
  { id: "end", kind: "END" },
]

test("accepts one connected linear flow", () => {
  const result = validateFlowGraph(linearNodes, [
    { source: "start", target: "wash" },
    { source: "wash", target: "pdi" },
    { source: "pdi", target: "end" },
  ])
  assert.equal(result.valid, true)
  assert.equal(result.orderedIds[0], "start")
  assert.equal(result.orderedIds.at(-1), "end")
  assert.equal(result.orderedIds.length, 4)
})

test("accepts branches and merges", () => {
  const nodes: FlowGraphNode[] = [
    { id: "start", kind: "START" },
    { id: "a", kind: "PROCESS" },
    { id: "b", kind: "PROCESS" },
    { id: "c", kind: "PROCESS" },
    { id: "end", kind: "END" },
  ]
  const edges: FlowGraphEdge[] = [
    { source: "start", target: "a", sourceHandle: "out-0", targetHandle: "in-0" },
    { source: "a", target: "b", sourceHandle: "out-0", targetHandle: "in-0" },
    { source: "a", target: "c", sourceHandle: "out-1", targetHandle: "in-0" },
    { source: "b", target: "end", sourceHandle: "out-0", targetHandle: "in-0" },
    { source: "c", target: "end", sourceHandle: "out-0", targetHandle: "in-1" },
  ]
  const result = validateFlowGraph(nodes, edges)
  assert.equal(result.valid, true)
  assert.ok(result.outgoing.get("a")?.includes("b"))
  assert.ok(result.outgoing.get("a")?.includes("c"))
})

test("rejects disconnected nodes", () => {
  const result = validateFlowGraph(linearNodes, [
    { source: "start", target: "wash" },
    { source: "wash", target: "end" },
  ])
  assert.equal(result.valid, false)
  assert.ok(result.errors.includes("DISCONNECTED"))
})

test("rejects cycles", () => {
  const edges: FlowGraphEdge[] = [
    { source: "start", target: "wash" },
    { source: "wash", target: "pdi" },
    { source: "pdi", target: "wash" },
    { source: "pdi", target: "end" },
  ]
  const result = validateFlowGraph(linearNodes, edges)
  assert.equal(result.valid, false)
  assert.ok(result.errors.includes("CYCLE"))
})

test("rejects missing end and multi start outs", () => {
  const result = validateFlowGraph(linearNodes.filter((node) => node.kind !== "END"), [
    { source: "start", target: "wash" },
    { source: "start", target: "pdi" },
  ])
  assert.equal(result.valid, false)
  assert.ok(result.errors.includes("END_COUNT"))
  assert.ok(result.errors.includes("START_OUTGOING"))
})

test("buildSequenceMap keeps START first and END last even if topo puts end early", () => {
  const nodes: FlowGraphNode[] = [
    { id: "start", kind: "START" },
    { id: "wash", kind: "PROCESS" },
    { id: "end", kind: "END" },
  ]
  // Simulate alphabetical topo seed order where "end" would sort before "start"
  const sequence = buildSequenceMap(nodes, ["end", "start", "wash"])
  assert.equal(sequence.get("start"), 0)
  assert.equal(sequence.get("wash"), 1)
  assert.equal(sequence.get("end"), 2)
})
