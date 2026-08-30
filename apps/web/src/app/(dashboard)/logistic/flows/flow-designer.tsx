"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import { Minus, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { useTranslations } from "@/i18n/context"
import {
  defaultHandleCounts,
  validateFlowGraph,
  type FlowNodeKind,
} from "@/lib/logistic/flow-graph"
import { ensureDraft, publishFlow, saveFlowDraft } from "../flow-actions"
import {
  ProcessPackageSidebar,
  type CatalogProcess,
} from "./process-package-sidebar"

interface DesignerNodeData extends Record<string, unknown> {
  kind: FlowNodeKind
  processId?: string
  name: string
  inputCount: number
  outputCount: number
}

type DesignerNode = Node<DesignerNodeData>

function handleTop(index: number, total: number) {
  if (total <= 1) return "50%"
  return `${((index + 1) / (total + 1)) * 100}%`
}

function ProcessNode({ data, selected }: NodeProps<DesignerNode>) {
  const inputs = Math.max(0, data.inputCount)
  const outputs = Math.max(0, data.outputCount)
  return (
    <div
      className={`relative min-w-44 rounded-lg border bg-card px-4 py-3 shadow-sm ${
        selected ? "border-emerald-500" : "border-border"
      }`}
    >
      {Array.from({ length: inputs }).map((_, index) => (
        <Handle
          key={`in-${index}`}
          id={`in-${index}`}
          type="target"
          position={Position.Left}
          className="!size-2.5 !border-2 !border-background !bg-emerald-500"
          style={{ top: handleTop(index, inputs) }}
        />
      ))}
      <p className="text-xs font-semibold text-foreground">{data.name}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{data.kind}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {inputs} in · {outputs} out
      </p>
      {Array.from({ length: outputs }).map((_, index) => (
        <Handle
          key={`out-${index}`}
          id={`out-${index}`}
          type="source"
          position={Position.Right}
          className="!size-2.5 !border-2 !border-background !bg-emerald-500"
          style={{ top: handleTop(index, outputs) }}
        />
      ))}
    </div>
  )
}

const nodeTypes = { process: ProcessNode }

function ensureTerminalNodes(nodes: DesignerNode[]): DesignerNode[] {
  const next = [...nodes]
  if (!next.some((node) => node.data.kind === "START")) {
    next.unshift({
      id: "start",
      type: "process",
      position: { x: 40, y: 180 },
      data: { kind: "START", name: "Start", inputCount: 0, outputCount: 1 },
    })
  }
  if (!next.some((node) => node.data.kind === "END")) {
    next.push({
      id: "end",
      type: "process",
      position: { x: 720, y: 180 },
      data: { kind: "END", name: "End", inputCount: 1, outputCount: 0 },
    })
  }
  return next
}

function toDraftNodes(nodes: DesignerNode[]) {
  return ensureTerminalNodes(nodes).map((node) => ({
    id: node.id,
    kind: node.data.kind,
    processId: node.data.processId,
    position: node.position,
    inputCount: node.data.inputCount,
    outputCount: node.data.outputCount,
  }))
}

function toDraftEdges(edges: Edge[]) {
  return edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? "out-0",
    targetHandle: edge.targetHandle ?? "in-0",
  }))
}

function FlowDesignerInner({
  groups,
  selectedGroupId,
  draft,
  processes,
  canManage,
}: {
  groups: { id: string; name: string; versions: { id: string; version: number; status: string }[] }[]
  selectedGroupId: string | null
  draft: {
    id: string
    nodes: {
      id: string
      kind: FlowNodeKind
      processId: string | null
      name: string
      position: { x: number; y: number }
      inputCount: number
      outputCount: number
    }[]
    edges: Edge[]
  } | null
  processes: CatalogProcess[]
  canManage: boolean
}) {
  const t = useTranslations()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const initialNodes = useMemo<DesignerNode[]>(() => {
    if (!draft) return []
    return ensureTerminalNodes(
      draft.nodes.map((node) => {
        const defaults = defaultHandleCounts(node.kind)
        return {
          id: node.id,
          type: "process" as const,
          position: node.position,
          data: {
            kind: node.kind,
            processId: node.processId ?? undefined,
            name: node.name,
            inputCount: node.inputCount ?? defaults.inputCount,
            outputCount: node.outputCount ?? defaults.outputCount,
          },
        }
      }),
    )
  }, [draft])
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(draft?.edges ?? [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [packageExpanded, setPackageExpanded] = useState(true)

  useEffect(() => {
    setNodes(initialNodes)
    setEdges(draft?.edges ?? [])
    setSelectedId(null)
  }, [draft?.id, initialNodes, draft?.edges, setNodes, setEdges])

  const validation = validateFlowGraph(
    nodes.map((node) => ({ id: node.id, kind: node.data.kind })),
    toDraftEdges(edges),
  )
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            sourceHandle: connection.sourceHandle ?? "out-0",
            targetHandle: connection.targetHandle ?? "in-0",
          },
          current,
        ),
      )
    },
    [setEdges],
  )
  const selectedNode = nodes.find((node) => node.id === selectedId)

  function addProcess(process: CatalogProcess) {
    const id = `process-${process.id}-${crypto.randomUUID()}`
    const defaults = defaultHandleCounts("PROCESS")
    setNodes((current) => [
      ...current,
      {
        id,
        type: "process",
        position: { x: 260 + current.length * 40, y: 120 + current.length * 30 },
        data: {
          kind: "PROCESS",
          processId: process.id,
          name: process.name,
          inputCount: defaults.inputCount,
          outputCount: defaults.outputCount,
        },
      },
    ])
  }

  function updateSelectedPorts(field: "inputCount" | "outputCount", delta: number) {
    if (!selectedNode || selectedNode.data.kind !== "PROCESS") return
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== selectedNode.id) return node
        const next = Math.max(1, Math.min(8, node.data[field] + delta))
        return { ...node, data: { ...node.data, [field]: next } }
      }),
    )
    if (delta < 0) {
      const nextCount = Math.max(1, selectedNode.data[field] + delta)
      const prefix = field === "inputCount" ? "in-" : "out-"
      setEdges((current) =>
        current.filter((edge) => {
          if (field === "inputCount" && edge.target === selectedNode.id) {
            const index = Number((edge.targetHandle ?? "in-0").replace("in-", ""))
            return Number.isFinite(index) ? index < nextCount : true
          }
          if (field === "outputCount" && edge.source === selectedNode.id) {
            const index = Number((edge.sourceHandle ?? "out-0").replace("out-", ""))
            return Number.isFinite(index) ? index < nextCount : true
          }
          return true
        }),
      )
    }
  }

  function removeSelected() {
    if (!selectedNode || selectedNode.data.kind !== "PROCESS") return
    setNodes((current) => current.filter((node) => node.id !== selectedNode.id))
    setEdges((current) =>
      current.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id),
    )
    setSelectedId(null)
  }

  function errorMessage(error?: string) {
    if (!error) return t("logistic.dynamicFlow.errors.generic")
    const code = error.split(":")[0] ?? error
    const known = [
      "FORBIDDEN",
      "REQUIRED",
      "DUPLICATE",
      "UNKNOWN",
      "INVALID_FLOW",
      "PROCESS_REQUIRED",
      "OVERRIDE_REASON_REQUIRED",
      "NEXT_STEP_ONLY",
      "STALE_REVISION",
      "generic",
    ] as const
    if ((known as readonly string[]).includes(code)) {
      return t(`logistic.dynamicFlow.errors.${code as (typeof known)[number]}`)
    }
    return error
  }

  function run(
    action: () => Promise<{ success: boolean; error?: string; data?: { id: string } }>,
    options?: {
      onSuccess?: (data?: { id: string }) => void
      successTitle?: string
    },
  ) {
    startTransition(async () => {
      const result = await action()
      if (!result.success) {
        toast({ title: errorMessage(result.error), type: "destructive" })
        return
      }
      if (options?.successTitle) toast({ title: options.successTitle })
      options?.onSuccess?.(result.data)
      router.refresh()
    })
  }

  return (
    <div className="-m-6 flex h-[calc(100%+3rem)] min-h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-background">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <div className="mr-2 hidden min-w-0 flex-1 flex-col sm:flex">
          <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
            {t("logistic.dynamicFlow.flowsTitle")}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {t("logistic.dynamicFlow.flowsDescription")}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <select
            value={selectedGroupId ?? ""}
            onChange={(event) => router.push(`/logistic/flows?group=${event.target.value}`)}
            className="h-9 min-w-48 rounded-md border border-border bg-background px-3 text-sm text-foreground"
          >
            <option value="">{t("logistic.dynamicFlow.selectGroup")}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          {selectedGroupId && canManage && !draft && (
            <Button
              disabled={isPending}
              onClick={() =>
                run(() => ensureDraft(selectedGroupId), {
                  successTitle: t("logistic.dynamicFlow.draftOpened"),
                  onSuccess: () => router.push(`/logistic/flows?group=${selectedGroupId}`),
                })
              }
            >
              {t("logistic.dynamicFlow.createDraft")}
            </Button>
          )}
          {draft && canManage && (
            <>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  run(() => saveFlowDraft(draft.id, toDraftNodes(nodes), toDraftEdges(edges)), {
                    successTitle: t("logistic.dynamicFlow.draftSaved"),
                  })
                }
              >
                {t("logistic.dynamicFlow.saveDraft")}
              </Button>
              <Button
                className="bg-emerald-500 text-primary-foreground hover:bg-emerald-500/90"
                disabled={isPending || !validation.valid}
                onClick={() =>
                  run(
                    async () => {
                      const saved = await saveFlowDraft(
                        draft.id,
                        toDraftNodes(nodes),
                        toDraftEdges(edges),
                      )
                      return saved.success ? publishFlow(draft.id) : saved
                    },
                    { successTitle: t("logistic.dynamicFlow.publishSuccess") },
                  )
                }
              >
                {t("logistic.dynamicFlow.publish")}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ProcessPackageSidebar
          processes={processes}
          canManage={canManage}
          canAddToFlow={Boolean(draft)}
          expanded={packageExpanded}
          onExpandedChange={setPackageExpanded}
          onAddToFlow={addProcess}
        />

        {draft ? (
          <div className="grid min-h-0 min-w-0 flex-1 overflow-hidden lg:grid-cols-[1fr_280px]">
            <div className="min-h-0 bg-muted/30">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={canManage ? onNodesChange : undefined}
                onEdgesChange={canManage ? onEdgesChange : undefined}
                onConnect={canManage ? onConnect : undefined}
                onNodeClick={(_, node) => setSelectedId(node.id)}
                onPaneClick={() => setSelectedId(null)}
                fitView
                proOptions={{ hideAttribution: true }}
                className="h-full w-full"
              >
                <Background />
                <Controls />
                <MiniMap />
              </ReactFlow>
            </div>

            <aside className="hidden overflow-y-auto border-l border-border bg-card p-4 lg:block">
              <h2 className="text-sm font-semibold text-foreground">
                {t("logistic.dynamicFlow.inspector")}
              </h2>
              {selectedNode ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-foreground">{selectedNode.data.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedNode.data.kind}</p>
                  {selectedNode.data.kind === "PROCESS" && canManage && (
                    <>
                      <div className="space-y-2 rounded-md border border-border p-3">
                        <p className="text-xs font-medium text-foreground">
                          {t("logistic.dynamicFlow.ports")}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">
                            {t("logistic.dynamicFlow.inputs")}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => updateSelectedPorts("inputCount", -1)}
                            >
                              <Minus className="size-3" />
                            </Button>
                            <span className="w-6 text-center text-xs text-foreground">
                              {selectedNode.data.inputCount}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => updateSelectedPorts("inputCount", 1)}
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">
                            {t("logistic.dynamicFlow.outputs")}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => updateSelectedPorts("outputCount", -1)}
                            >
                              <Minus className="size-3" />
                            </Button>
                            <span className="w-6 text-center text-xs text-foreground">
                              {selectedNode.data.outputCount}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => updateSelectedPorts("outputCount", 1)}
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {t("logistic.dynamicFlow.portsHint")}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={removeSelected}>
                        <Trash2 className="size-4" />
                        {t("logistic.dynamicFlow.removeFromFlow")}
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-xs text-muted-foreground">{t("common.none")}</p>
              )}
              <p
                className={`mt-8 rounded-md p-3 text-xs ${
                  validation.valid
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {validation.valid
                  ? t("logistic.dynamicFlow.flowValid")
                  : t("logistic.dynamicFlow.flowInvalid")}
              </p>
            </aside>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center justify-center p-16 text-center text-sm text-muted-foreground">
            {groups.length
              ? t("logistic.dynamicFlow.createDraft")
              : t("logistic.dynamicFlow.noGroups")}
          </div>
        )}
      </div>
    </div>
  )
}

export function FlowDesigner(props: {
  groups: { id: string; name: string; versions: { id: string; version: number; status: string }[] }[]
  selectedGroupId: string | null
  draft: {
    id: string
    nodes: {
      id: string
      kind: FlowNodeKind
      processId: string | null
      name: string
      position: { x: number; y: number }
      inputCount: number
      outputCount: number
    }[]
    edges: Edge[]
  } | null
  processes: CatalogProcess[]
  canManage: boolean
}) {
  return (
    <ReactFlowProvider>
      <FlowDesignerInner {...props} />
    </ReactFlowProvider>
  )
}
