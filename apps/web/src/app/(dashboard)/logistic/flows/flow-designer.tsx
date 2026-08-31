"use client"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
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
import { History, Minus, Plus, RotateCcw, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import { useTranslations } from "@/i18n/context"
import {
  defaultHandleCounts,
  validateFlowGraph,
  type FlowNodeKind,
} from "@/lib/logistic/flow-graph"
import {
  deleteFlowDraft,
  ensureDraft,
  publishFlow,
  restoreFlowVersion,
  saveFlowDraft,
} from "../flow-actions"
import {
  ProcessPackageSidebar,
  type CatalogProcess,
} from "./process-package-sidebar"
import { FlowDesignerToolbar } from "./flow-designer-toolbar"
import { isProcessType, type ProcessType } from "./process-types"

interface DesignerNodeData extends Record<string, unknown> {
  kind: FlowNodeKind
  processId?: string
  processType?: ProcessType
  name: string
  inputCount: number
  outputCount: number
}

type DesignerNode = Node<DesignerNodeData>

type FlowVersionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED"

interface FlowVersionOption {
  id: string
  version: number
  status: FlowVersionStatus
}

interface FlowGraphData {
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
}

interface FlowDraftData extends FlowGraphData {
  id: string
  version: number
}

function handleTop(index: number, total: number) {
  if (total <= 1) return "50%"
  return `${((index + 1) / (total + 1)) * 100}%`
}

function ProcessNode({ data, selected }: NodeProps<DesignerNode>) {
  const t = useTranslations()
  const inputs = Math.max(0, data.inputCount)
  const outputs = Math.max(0, data.outputCount)
  const displayName =
    data.kind === "START"
      ? t("logistic.dynamicFlow.nodeKinds.START")
      : data.kind === "END"
        ? t("logistic.dynamicFlow.nodeKinds.END")
        : data.name
  const kindLabel = data.kind === "PROCESS" && data.processType
    ? isProcessType(data.processType)
      ? t(`logistic.dynamicFlow.types.${data.processType}`)
      : data.processType
    : t(`logistic.dynamicFlow.nodeKinds.${data.kind}`)
  return (
    <div
      className={`relative min-w-44 rounded-xl border bg-card px-4 py-3 shadow-sm transition-shadow ${
        selected
          ? "border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
          : "border-border"
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
      <p className="text-xs font-semibold text-foreground">{displayName}</p>
      <p className="mt-1 inline-flex rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
        {kindLabel}
      </p>
      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>
          {inputs} {t("logistic.dynamicFlow.inputs")}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {outputs} {t("logistic.dynamicFlow.outputs")}
        </span>
      </div>
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

function createFlowSnapshot(
  nodes: ReturnType<typeof toDraftNodes>,
  edges: ReturnType<typeof toDraftEdges>,
) {
  const canonicalNodes = nodes
    .map((node) => ({
      id: node.id,
      kind: node.kind,
      processId: node.processId ?? null,
      position: { x: node.position.x, y: node.position.y },
      inputCount: node.inputCount,
      outputCount: node.outputCount,
    }))
    .sort((left, right) => left.id.localeCompare(right.id))
  const canonicalEdges = edges
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? "out-0",
      targetHandle: edge.targetHandle ?? "in-0",
    }))
    .sort((left, right) =>
      `${left.source}:${left.sourceHandle}:${left.target}:${left.targetHandle}`.localeCompare(
        `${right.source}:${right.sourceHandle}:${right.target}:${right.targetHandle}`,
      ),
    )
  return JSON.stringify({ nodes: canonicalNodes, edges: canonicalEdges })
}

function graphDataSnapshot(graph: FlowGraphData) {
  return createFlowSnapshot(
    graph.nodes.map((node) => ({
      id: node.id,
      kind: node.kind,
      processId: node.processId ?? undefined,
      position: node.position,
      inputCount: node.inputCount,
      outputCount: node.outputCount,
    })),
    toDraftEdges(graph.edges),
  )
}

const EMPTY_FLOW_SNAPSHOT = createFlowSnapshot(
  [
    {
      id: "start",
      kind: "START",
      processId: undefined,
      position: { x: 80, y: 180 },
      inputCount: 0,
      outputCount: 1,
    },
    {
      id: "end",
      kind: "END",
      processId: undefined,
      position: { x: 680, y: 180 },
      inputCount: 1,
      outputCount: 0,
    },
  ],
  [],
)

function FlowDesignerInner({
  groups,
  selectedGroupId,
  draft,
  published,
  processes,
  canManage,
}: {
  groups: { id: string; name: string; versions: FlowVersionOption[] }[]
  selectedGroupId: string | null
  draft: FlowDraftData | null
  published: FlowGraphData | null
  processes: CatalogProcess[]
  canManage: boolean
}) {
  const t = useTranslations()
  const { resolvedTheme } = useTheme()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const processById = useMemo(
    () => new Map(processes.map((process) => [process.id, process])),
    [processes],
  )
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
            processType: node.processId ? processById.get(node.processId)?.type : undefined,
            name: node.name,
            inputCount: node.inputCount ?? defaults.inputCount,
            outputCount: node.outputCount ?? defaults.outputCount,
          },
        }
      }),
    )
  }, [draft, processById])
  const initialDraftSnapshot = useMemo(
    () => (draft ? graphDataSnapshot(draft) : ""),
    [draft],
  )
  const publishedSnapshot = useMemo(
    () => (published ? graphDataSnapshot(published) : EMPTY_FLOW_SNAPSHOT),
    [published],
  )
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(draft?.edges ?? [])
  const [savedSnapshot, setSavedSnapshot] = useState(initialDraftSnapshot)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [restoreVersion, setRestoreVersion] = useState<FlowVersionOption | null>(null)
  const [deleteDraftOpen, setDeleteDraftOpen] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect -- the editor must reset atomically when a different saved draft is loaded */
  useEffect(() => {
    setNodes(initialNodes)
    setEdges(draft?.edges ?? [])
    setSavedSnapshot(initialDraftSnapshot)
    setSelectedId(null)
  }, [draft?.id, initialNodes, draft?.edges, initialDraftSnapshot, setNodes, setEdges])
  /* eslint-enable react-hooks/set-state-in-effect */

  const currentSnapshot = useMemo(
    () => createFlowSnapshot(toDraftNodes(nodes), toDraftEdges(edges)),
    [nodes, edges],
  )
  const hasUnsavedChanges = Boolean(draft && currentSnapshot !== savedSnapshot)
  const hasUnpublishedChanges = Boolean(draft && currentSnapshot !== publishedSnapshot)
  const selectedGroup = groups.find((group) => group.id === selectedGroupId)

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
  const selectedNodeName = selectedNode
    ? selectedNode.data.kind === "START"
      ? t("logistic.dynamicFlow.nodeKinds.START")
      : selectedNode.data.kind === "END"
        ? t("logistic.dynamicFlow.nodeKinds.END")
        : selectedNode.data.name
    : null

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
          processType: process.type,
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
      "DRAFT_IN_USE",
      "DRAFT_NOT_FOUND",
      "VERSION_NOT_FOUND",
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
      <FlowDesignerToolbar
        title={t("logistic.dynamicFlow.flowsTitle")}
        description={t("logistic.dynamicFlow.flowsDescription")}
        activeType="vehicle"
      >
          <NativeSelect
            value={selectedGroupId ?? ""}
            onChange={(event) =>
              router.push(`/logistic/flows?type=vehicle&group=${event.target.value}`)
            }
            size="sm"
            className="w-full min-w-0 sm:w-48"
          >
            <NativeSelectOption value="">{t("logistic.dynamicFlow.selectGroup")}</NativeSelectOption>
            {groups.map((group) => (
              <NativeSelectOption key={group.id} value={group.id}>
                {group.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {selectedGroup && selectedGroup.versions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                <History />
                {t("logistic.dynamicFlow.versionHistory")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    {t("logistic.dynamicFlow.versionHistory")}
                  </DropdownMenuLabel>
                  {selectedGroup.versions.map((version) => {
                    const statusLabel =
                      version.status === "DRAFT"
                        ? t("logistic.dynamicFlow.draft")
                        : version.status === "PUBLISHED"
                          ? t("logistic.dynamicFlow.published")
                          : t("logistic.dynamicFlow.archived")
                    return (
                      <DropdownMenuItem
                        key={version.id}
                        disabled={!canManage || version.status === "DRAFT"}
                        onClick={() => setRestoreVersion(version)}
                      >
                        {version.status === "DRAFT" ? <History /> : <RotateCcw />}
                        v{version.version}
                        <DropdownMenuShortcut>{statusLabel}</DropdownMenuShortcut>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuGroup>
                {canManage && draft && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteDraftOpen(true)}
                    >
                      <Trash2 />
                      {t("logistic.dynamicFlow.deleteDraft")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {selectedGroupId && canManage && !draft && (
            <Button
              size="sm"
              className="bg-emerald-500 text-primary-foreground hover:bg-emerald-500/90"
              disabled={isPending}
              onClick={() =>
                run(() => ensureDraft(selectedGroupId), {
                  successTitle: t("logistic.dynamicFlow.flowLoaded"),
                  onSuccess: () => router.push(`/logistic/flows?type=vehicle&group=${selectedGroupId}`),
                })
              }
            >
              {t("logistic.dynamicFlow.loadFlow")}
            </Button>
          )}
          {draft && canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending || !hasUnsavedChanges}
                onClick={() =>
                  run(() => saveFlowDraft(draft.id, toDraftNodes(nodes), toDraftEdges(edges)), {
                    successTitle: t("logistic.dynamicFlow.draftSaved"),
                    onSuccess: () => setSavedSnapshot(currentSnapshot),
                  })
                }
              >
                {t("logistic.dynamicFlow.saveDraft")}
              </Button>
              <Button
                size="sm"
                className="bg-emerald-500 text-primary-foreground hover:bg-emerald-500/90"
                disabled={isPending || !validation.valid || !hasUnpublishedChanges}
                onClick={() =>
                  run(
                    async () => {
                      if (hasUnsavedChanges) {
                        const saved = await saveFlowDraft(
                          draft.id,
                          toDraftNodes(nodes),
                          toDraftEdges(edges),
                        )
                        if (!saved.success) return saved
                      }
                      return publishFlow(draft.id)
                    },
                    { successTitle: t("logistic.dynamicFlow.publishSuccess") },
                  )
                }
              >
                {t("logistic.dynamicFlow.publish")}
              </Button>
            </>
          )}
      </FlowDesignerToolbar>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ProcessPackageSidebar
          processes={processes}
          canManage={canManage}
          canAddToFlow={Boolean(draft)}
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
                colorMode={resolvedTheme === "dark" ? "dark" : "light"}
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
                  <p className="text-sm font-medium text-foreground">{selectedNodeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(`logistic.dynamicFlow.nodeKinds.${selectedNode.data.kind}`)}
                  </p>
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
              ? t("logistic.dynamicFlow.loadFlowHint")
              : t("logistic.dynamicFlow.noGroups")}
          </div>
        )}
      </div>

      <AlertDialog
        open={restoreVersion !== null}
        onOpenChange={(open) => !open && setRestoreVersion(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("logistic.dynamicFlow.restoreVersionTitle", {
                version: restoreVersion?.version ?? 0,
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {draft
                ? t("logistic.dynamicFlow.restoreVersionWithDraftDescription")
                : t("logistic.dynamicFlow.restoreVersionDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setRestoreVersion(null)}>
              {t("common.cancel")}
            </Button>
            <AlertDialogAction
              className="bg-emerald-500 text-primary-foreground hover:bg-emerald-500/90"
              disabled={isPending || !restoreVersion}
              onClick={() => {
                if (!restoreVersion) return
                run(() => restoreFlowVersion(restoreVersion.id), {
                  successTitle: t("logistic.dynamicFlow.restoreSuccess", {
                    version: restoreVersion.version,
                  }),
                })
              }}
            >
              <RotateCcw />
              {t("logistic.dynamicFlow.restoreVersion")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDraftOpen} onOpenChange={setDeleteDraftOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("logistic.dynamicFlow.deleteDraftTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("logistic.dynamicFlow.deleteDraftDescription", {
                group: selectedGroup?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteDraftOpen(false)}>
              {t("common.cancel")}
            </Button>
            <AlertDialogAction
              className="bg-destructive text-primary-foreground hover:bg-destructive/90"
              disabled={isPending || !draft}
              onClick={() => {
                if (!draft || !selectedGroupId) return
                run(() => deleteFlowDraft(draft.id), {
                  successTitle: t("logistic.dynamicFlow.deleteDraftSuccess"),
                  onSuccess: () =>
                    router.push(`/logistic/flows?type=vehicle&group=${selectedGroupId}`),
                })
              }}
            >
              <Trash2 />
              {t("logistic.dynamicFlow.deleteDraft")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function FlowDesigner(props: {
  groups: { id: string; name: string; versions: FlowVersionOption[] }[]
  selectedGroupId: string | null
  draft: FlowDraftData | null
  published: FlowGraphData | null
  processes: CatalogProcess[]
  canManage: boolean
}) {
  return (
    <ReactFlowProvider>
      <FlowDesignerInner {...props} />
    </ReactFlowProvider>
  )
}
