"use client"

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
import {
  Bot,
  CheckCircle2,
  CircleHelp,
  Clock3,
  FileText,
  GitBranch,
  History,
  Plus,
  Route,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react"
import type {
  LogisticWorkflowAssignmentStrategy,
  LogisticWorkflowNodeKind,
  LogisticWorkflowSubjectType,
  LogisticWorkflowTaskScope,
} from "@plantx/db/client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { useTranslations } from "@/i18n/context"
import { cn } from "@/lib/utils"
import {
  WORKFLOW_ACTIONS,
  WORKFLOW_ASSIGNMENT_STRATEGIES,
  WORKFLOW_TASK_SCOPES,
  type WorkflowActionKey,
  type WorkflowDraftEdgeInput,
  type WorkflowDraftNodeInput,
} from "@/lib/logistic/workflow-contract"
import {
  validateWorkflowActionRoutes,
  validateWorkflowGraph,
} from "@/lib/logistic/workflow-graph"
import {
  createWorkflowDefinition,
  deleteWorkflowDraft,
  ensureWorkflowDraft,
  publishWorkflow,
  restoreWorkflowVersion,
  saveWorkflowDraft,
  setDefaultWorkflowDefinition,
} from "../workflow-actions"
import { FlowDesignerToolbar } from "./flow-designer-toolbar"
import {
  WorkflowInspectorField,
  WorkflowInspectorSection,
} from "./workflow-inspector-section"

interface WorkflowNodeData extends Record<string, unknown> {
  kind: LogisticWorkflowNodeKind
  name: string
  description: string
  assignmentStrategy: LogisticWorkflowAssignmentStrategy
  organizationUnitId: string
  responsibleUserId: string
  taskScope: LogisticWorkflowTaskScope
  allowedActions: string[]
  automationActionKey: string
  targetDurationMinutes: number | null
}

interface WorkflowEdgeData extends Record<string, unknown> {
  actionKey: string
  label: string
}

type DesignerNode = Node<WorkflowNodeData>
type DesignerEdge = Edge<WorkflowEdgeData>

export interface BusinessWorkflowDefinition {
  id: string
  code: string
  name: string
  description: string | null
  subjectType: LogisticWorkflowSubjectType
  isDefault: boolean
  versions: { id: string; version: number; status: WorkflowVersionStatus }[]
}

export interface BusinessWorkflowGraph {
  nodes: WorkflowDraftNodeInput[]
  edges: WorkflowDraftEdgeInput[]
}

export interface BusinessWorkflowDraft extends BusinessWorkflowGraph {
  id: string
  version: number
}

type WorkflowVersionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED"

const ADDABLE_KINDS = ["TASK", "APPROVAL", "DECISION", "WAIT"] as const
const SUBJECT_TYPES = ["PLAN_SHEET", "ORDER", "VEHICLE_UNIT", "YARD_RECORD", "DISPATCH"] as const

const ACTION_MESSAGE_KEYS = {
  PLAN_SHEET_EDIT: "logistic.workflow.actions.PLAN_SHEET_EDIT",
  PLAN_SHEET_SUBMIT: "logistic.workflow.actions.PLAN_SHEET_SUBMIT",
  PLAN_SHEET_CANCEL: "logistic.workflow.actions.PLAN_SHEET_CANCEL",
  PLAN_SHEET_SET_FORECAST: "logistic.workflow.actions.PLAN_SHEET_SET_FORECAST",
  PLAN_SHEET_REVIEW_LINE: "logistic.workflow.actions.PLAN_SHEET_REVIEW_LINE",
  PLAN_SHEET_APPROVE: "logistic.workflow.actions.PLAN_SHEET_APPROVE",
  PLAN_SHEET_REJECT: "logistic.workflow.actions.PLAN_SHEET_REJECT",
  VEHICLE_ADVANCE: "logistic.workflow.actions.VEHICLE_ADVANCE",
} as const satisfies Record<WorkflowActionKey, string>

function isWorkflowActionKey(action: string): action is WorkflowActionKey {
  return action in ACTION_MESSAGE_KEYS
}

const NODE_ICONS = {
  START: Route,
  TASK: UserRoundCheck,
  APPROVAL: CheckCircle2,
  DECISION: GitBranch,
  AUTOMATION: Bot,
  WAIT: Clock3,
  END: Route,
} satisfies Record<LogisticWorkflowNodeKind, typeof Route>

function WorkflowNodeCard({ data, selected }: NodeProps<DesignerNode>) {
  const t = useTranslations()
  const Icon = NODE_ICONS[data.kind]
  const isTerminal = data.kind === "START" || data.kind === "END"
  return (
    <div
      className={`relative min-w-48 rounded-xl border bg-card px-4 py-3 shadow-sm ${
        selected ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-border"
      }`}
    >
      {data.kind !== "START" && (
        <Handle type="target" position={Position.Left} className="!size-2.5 !border-background !bg-emerald-500" />
      )}
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-emerald-500" />
        <p className="text-xs font-semibold text-foreground">{data.name}</p>
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {t(`logistic.workflow.nodeKinds.${data.kind}`)}
      </p>
      {!isTerminal && (
        <p className="mt-2 max-w-44 truncate text-[10px] text-muted-foreground">
          {t(`logistic.workflow.assignmentStrategies.${data.assignmentStrategy}`)}
        </p>
      )}
      {data.kind !== "END" && (
        <Handle type="source" position={Position.Right} className="!size-2.5 !border-background !bg-emerald-500" />
      )}
    </div>
  )
}

const nodeTypes = { workflow: WorkflowNodeCard }

function toDesignerNode(node: WorkflowDraftNodeInput): DesignerNode {
  return {
    id: node.id,
    type: "workflow",
    position: node.position,
    data: {
      kind: node.kind,
      name: node.name,
      description: node.description ?? "",
      assignmentStrategy: node.assignmentStrategy,
      organizationUnitId: node.organizationUnitId ?? "",
      responsibleUserId: node.responsibleUserId ?? "",
      taskScope: node.taskScope,
      allowedActions: node.allowedActions,
      automationActionKey: node.automationActionKey ?? "",
      targetDurationMinutes: node.targetDurationMinutes ?? null,
    },
  }
}

function toDraftNode(node: DesignerNode): WorkflowDraftNodeInput {
  return {
    id: node.id,
    kind: node.data.kind,
    name: node.data.name,
    description: node.data.description || null,
    position: node.position,
    assignmentStrategy: node.data.assignmentStrategy,
    organizationUnitId: node.data.organizationUnitId || null,
    responsibleUserId: node.data.responsibleUserId || null,
    taskScope: node.data.taskScope,
    allowedActions: node.data.allowedActions,
    automationActionKey: node.data.automationActionKey || null,
    targetDurationMinutes: node.data.targetDurationMinutes,
  }
}

function toDraftEdge(edge: DesignerEdge): WorkflowDraftEdgeInput {
  return {
    source: edge.source,
    target: edge.target,
    actionKey: edge.data?.actionKey || null,
    label: edge.data?.label || null,
  }
}

function createWorkflowSnapshot(
  nodes: WorkflowDraftNodeInput[],
  edges: WorkflowDraftEdgeInput[],
) {
  const canonicalNodes = nodes
    .map((node) => ({
      id: node.id,
      kind: node.kind,
      name: node.name,
      description: node.description ?? null,
      position: { x: node.position.x, y: node.position.y },
      assignmentStrategy: node.assignmentStrategy,
      organizationUnitId: node.organizationUnitId ?? null,
      responsibleUserId: node.responsibleUserId ?? null,
      taskScope: node.taskScope,
      allowedActions: [...node.allowedActions].sort(),
      automationActionKey: node.automationActionKey ?? null,
      targetDurationMinutes: node.targetDurationMinutes ?? null,
    }))
    .sort((left, right) => left.id.localeCompare(right.id))
  const canonicalEdges = edges
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
      actionKey: edge.actionKey ?? null,
      label: edge.label ?? null,
    }))
    .sort((left, right) =>
      `${left.source}:${left.target}:${left.actionKey ?? ""}:${left.label ?? ""}`.localeCompare(
        `${right.source}:${right.target}:${right.actionKey ?? ""}:${right.label ?? ""}`,
      ),
    )

  return JSON.stringify({ nodes: canonicalNodes, edges: canonicalEdges })
}

function BusinessWorkflowDesignerInner({
  definitions,
  selectedDefinitionId,
  draft,
  published,
  organizationUnits,
  users,
  canManage,
}: {
  definitions: BusinessWorkflowDefinition[]
  selectedDefinitionId: string | null
  draft: BusinessWorkflowDraft | null
  published: BusinessWorkflowGraph | null
  organizationUnits: { id: string; name: string }[]
  users: { id: string; name: string; email: string; organizationUnitId: string | null }[]
  canManage: boolean
}) {
  const t = useTranslations()
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [pending, startTransition] = useTransition()
  const [createOpen, setCreateOpen] = useState(false)
  const [restoreVersion, setRestoreVersion] = useState<
    BusinessWorkflowDefinition["versions"][number] | null
  >(null)
  const [deleteDraftOpen, setDeleteDraftOpen] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const selectedDefinition = definitions.find(({ id }) => id === selectedDefinitionId) ?? null
  const availableActions = selectedDefinition ? WORKFLOW_ACTIONS[selectedDefinition.subjectType] : []
  const initialNodes = useMemo(() => (draft?.nodes ?? []).map(toDesignerNode), [draft])
  const initialEdges = useMemo<DesignerEdge[]>(
    () =>
      (draft?.edges ?? []).map((edge, index) => ({
        id: `edge-${index}-${edge.source}-${edge.target}-${edge.actionKey ?? "default"}`,
        source: edge.source,
        target: edge.target,
        label: edge.label ?? edge.actionKey ?? undefined,
        data: { actionKey: edge.actionKey ?? "", label: edge.label ?? "" },
      })),
    [draft],
  )
  const initialDraftSnapshot = useMemo(
    () => draft ? createWorkflowSnapshot(draft.nodes, draft.edges) : "",
    [draft],
  )
  const publishedSnapshot = useMemo(
    () => published
      ? createWorkflowSnapshot(published.nodes, published.edges)
      : initialDraftSnapshot,
    [published, initialDraftSnapshot],
  )
  const [nodes, setNodes, onNodesChange] = useNodesState<DesignerNode>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<DesignerEdge>(initialEdges)
  const [savedSnapshot, setSavedSnapshot] = useState(initialDraftSnapshot)

  /* eslint-disable react-hooks/set-state-in-effect -- the editor must reset when a different saved draft is loaded */
  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
    setSavedSnapshot(initialDraftSnapshot)
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
  }, [draft?.id, initialNodes, initialEdges, initialDraftSnapshot, setNodes, setEdges])
  /* eslint-enable react-hooks/set-state-in-effect */

  const currentSnapshot = useMemo(
    () => createWorkflowSnapshot(nodes.map(toDraftNode), edges.map(toDraftEdge)),
    [nodes, edges],
  )
  const hasUnsavedChanges = Boolean(draft && currentSnapshot !== savedSnapshot)
  const hasUnpublishedChanges = Boolean(draft && currentSnapshot !== publishedSnapshot)

  const graph = validateWorkflowGraph(nodes.map(toDraftNode), edges.map(toDraftEdge))
  const routeErrors = selectedDefinition
    ? validateWorkflowActionRoutes(
        selectedDefinition.subjectType,
        nodes.map(toDraftNode),
        edges.map(toDraftEdge),
      )
    : []
  const selectedNode = nodes.find(({ id }) => id === selectedNodeId) ?? null
  const selectedEdge = edges.find(({ id }) => id === selectedEdgeId) ?? null
  const edgeSourceNode = selectedEdge
    ? nodes.find(({ id }) => id === selectedEdge.source) ?? null
    : null
  const userById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  )
  const hasAssignmentMismatch = nodes.some((node) => {
    if (
      node.data.assignmentStrategy !== "USER"
      || !node.data.responsibleUserId
      || !node.data.organizationUnitId
    ) {
      return false
    }
    return userById.get(node.data.responsibleUserId)?.organizationUnitId
      !== node.data.organizationUnitId
  })
  const canPublish = graph.valid && routeErrors.length === 0 && !hasAssignmentMismatch
  const selectedResponsibleUser = selectedNode?.data.responsibleUserId
    ? userById.get(selectedNode.data.responsibleUserId) ?? null
    : null
  const selectableUsers = selectedNode?.data.assignmentStrategy === "USER"
    && selectedNode.data.organizationUnitId
    ? users.filter(
        (user) => user.organizationUnitId === selectedNode.data.organizationUnitId,
      )
    : users
  const selectableOrganizationUnits = selectedNode?.data.assignmentStrategy === "USER"
    && selectedResponsibleUser
    ? organizationUnits.filter(
        (unit) => unit.id === selectedResponsibleUser.organizationUnitId,
      )
    : organizationUnits

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      setEdges((current) =>
        addEdge<DesignerEdge>(
          {
            ...connection,
            id: `edge-${crypto.randomUUID()}`,
            data: { actionKey: "", label: "" },
          },
          current,
        ),
      )
    },
    [setEdges],
  )

  function updateNode(patch: Partial<WorkflowNodeData>) {
    if (!selectedNode) return
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNode.id ? { ...node, data: { ...node.data, ...patch } } : node,
      ),
    )
  }

  function updateEdge(actionKey: string, label?: string) {
    if (!selectedEdge) return
    setEdges((current) =>
      current.map((edge) =>
        edge.id === selectedEdge.id
          ? {
              ...edge,
              label: label || actionKey || undefined,
              data: { actionKey, label: label ?? edge.data?.label ?? "" },
            }
          : edge,
      ),
    )
  }

  function addNode(kind: (typeof ADDABLE_KINDS)[number]) {
    const id = `${kind.toLowerCase()}-${crypto.randomUUID()}`
    setNodes((current) => [
      ...current,
      {
        id,
        type: "workflow",
        position: { x: 260 + current.length * 50, y: 100 + current.length * 24 },
        data: {
          kind,
          name: t(`logistic.workflow.nodeKinds.${kind}`),
          description: "",
          assignmentStrategy: "ACTOR",
          organizationUnitId: "",
          responsibleUserId: "",
          taskScope: "INSTANCE",
          allowedActions: [],
          automationActionKey: "",
          targetDurationMinutes: null,
        },
      },
    ])
    setSelectedNodeId(id)
    setSelectedEdgeId(null)
  }

  function removeSelection() {
    if (selectedNode && selectedNode.data.kind !== "START" && selectedNode.data.kind !== "END") {
      setNodes((current) => current.filter(({ id }) => id !== selectedNode.id))
      setEdges((current) => current.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id))
      setSelectedNodeId(null)
    }
    if (selectedEdge) {
      setEdges((current) => current.filter(({ id }) => id !== selectedEdge.id))
      setSelectedEdgeId(null)
    }
  }

  function run(
    action: () => Promise<{ success: boolean; error?: string; data?: { id: string } }>,
    successMessage: string,
    onSuccess?: (id?: string) => void,
  ) {
    startTransition(async () => {
      const result = await action()
      if (!result.success) {
        toast({ title: errorMessage(result.error), type: "destructive" })
        return
      }
      toast({ title: successMessage })
      onSuccess?.(result.data?.id)
      router.refresh()
    })
  }

  function errorMessage(error?: string) {
    if (!error) return t("logistic.workflow.errors.generic")
    const code = error.split(":")[0]
    const known = [
      "FORBIDDEN",
      "REQUIRED",
      "DRAFT_IN_USE",
      "DRAFT_NOT_FOUND",
      "VERSION_NOT_FOUND",
      "WORKFLOW_NOT_FOUND",
      "USER_NOT_FOUND",
      "USER_NOT_ELIGIBLE",
      "UNIT_NOT_FOUND",
      "USER_UNIT_MISMATCH",
      "UNKNOWN",
    ] as const
    if (code && (known as readonly string[]).includes(code)) {
      return t(`logistic.workflow.errors.${code as (typeof known)[number]}`)
    }
    return t("logistic.workflow.errors.generic")
  }

  function createDefinition(formData: FormData) {
    run(
      () => createWorkflowDefinition(formData),
      t("logistic.workflow.definitionCreated"),
      (id) => {
        setCreateOpen(false)
        if (!id) return
        startTransition(async () => {
          await ensureWorkflowDraft(id)
          router.push(`/logistic/flows?type=business&workflow=${id}`)
          router.refresh()
        })
      },
    )
  }

  return (
    <div className="-m-6 flex h-[calc(100%+3rem)] min-h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-background">
      <FlowDesignerToolbar
        title={t("logistic.workflow.title")}
        description={t("logistic.workflow.description")}
        activeType="business"
      >
        <NativeSelect
          value={selectedDefinitionId ?? ""}
          onChange={(event) => router.push(`/logistic/flows?type=business&workflow=${event.target.value}`)}
          size="sm"
          className="w-56"
        >
          <NativeSelectOption value="">{t("logistic.workflow.selectDefinition")}</NativeSelectOption>
          {definitions.map((definition) => (
            <NativeSelectOption key={definition.id} value={definition.id}>
              {definition.name}{definition.isDefault ? ` · ${t("logistic.workflow.default")}` : ""}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {selectedDefinition && selectedDefinition.versions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              <History />
              {t("logistic.workflow.versionHistory")}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  {t("logistic.workflow.versionHistory")}
                </DropdownMenuLabel>
                {selectedDefinition.versions.map((version) => (
                  <DropdownMenuItem
                    key={version.id}
                    disabled={!canManage || version.status === "DRAFT"}
                    onClick={() => setRestoreVersion(version)}
                  >
                    {version.status === "DRAFT" ? <History /> : <RotateCcw />}
                    v{version.version}
                    <DropdownMenuShortcut>
                      {t(`logistic.workflow.versionStatuses.${version.status}`)}
                    </DropdownMenuShortcut>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              {canManage && draft && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteDraftOpen(true)}
                  >
                    <Trash2 />
                    {t("logistic.workflow.deleteDraft")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {canManage && <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}><Plus />{t("logistic.workflow.newDefinition")}</Button>}
        {selectedDefinition && canManage && !selectedDefinition.isDefault && (
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => setDefaultWorkflowDefinition(selectedDefinition.id), t("logistic.workflow.defaultSaved"))}>
            {t("logistic.workflow.makeDefault")}
          </Button>
        )}
        {selectedDefinition && canManage && !draft && (
          <Button size="sm" disabled={pending} onClick={() => run(() => ensureWorkflowDraft(selectedDefinition.id), t("logistic.workflow.draftReady"))}>
            {t("logistic.workflow.createDraft")}
          </Button>
        )}
        {draft && canManage && (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={pending || !hasUnsavedChanges}
              onClick={() => run(
                () => saveWorkflowDraft(draft.id, nodes.map(toDraftNode), edges.map(toDraftEdge)),
                t("logistic.workflow.draftSaved"),
                () => setSavedSnapshot(currentSnapshot),
              )}
            >
              <Save />
              {t("common.save")}
            </Button>
            <Button
              size="sm"
              className="bg-emerald-500 text-primary-foreground hover:bg-emerald-500/90"
              disabled={pending || !canPublish || !hasUnpublishedChanges}
              onClick={() => run(async () => {
                if (hasUnsavedChanges) {
                  const saved = await saveWorkflowDraft(
                    draft.id,
                    nodes.map(toDraftNode),
                    edges.map(toDraftEdge),
                  )
                  if (!saved.success) return saved
                }
                return publishWorkflow(draft.id)
              }, t("logistic.workflow.published"))}
            >
              {t("logistic.workflow.publish")}
            </Button>
          </>
        )}
      </FlowDesignerToolbar>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="w-52 shrink-0 overflow-y-auto border-r border-border bg-sidebar p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("logistic.workflow.stepPalette")}</p>
          <div className="space-y-2">
            {ADDABLE_KINDS.map((kind) => {
              const Icon = NODE_ICONS[kind]
              return <Button key={kind} variant="outline" className="w-full justify-start" disabled={!draft || !canManage} onClick={() => addNode(kind)}><Icon />{t(`logistic.workflow.nodeKinds.${kind}`)}</Button>
            })}
          </div>
          {selectedDefinition && (
            <div className="mt-4 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">{selectedDefinition.name}</p>
              <p className="mt-1">{t(`logistic.workflow.subjectTypes.${selectedDefinition.subjectType}`)}</p>
              <p className="mt-1">{t("logistic.workflow.version", { version: draft?.version ?? selectedDefinition.versions[0]?.version ?? 0 })}</p>
            </div>
          )}
        </aside>

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
                onNodeClick={(_, node) => { setSelectedNodeId(node.id); setSelectedEdgeId(null) }}
                onEdgeClick={(_, edge) => { setSelectedEdgeId(edge.id); setSelectedNodeId(null) }}
                onPaneClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null) }}
                fitView
                colorMode={resolvedTheme === "dark" ? "dark" : "light"}
                proOptions={{ hideAttribution: true }}
              >
                <Background />
                <Controls />
                <MiniMap />
              </ReactFlow>
            </div>
            <aside className="flex min-h-0 flex-col overflow-hidden border-l border-border bg-card">
              <div className="flex shrink-0 items-start gap-3 border-b border-border px-4 py-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Settings2 className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-semibold text-foreground">
                      {selectedEdge
                        ? t("logistic.workflow.transitionInspector")
                        : t("logistic.workflow.inspector")}
                    </h2>
                    {selectedNode && (
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {t(`logistic.workflow.nodeKinds.${selectedNode.data.kind}`)}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {selectedNode?.data.name
                      ?? selectedEdge?.data?.label
                      ?? (selectedEdge ? t("logistic.workflow.automaticTransition") : null)
                      ?? t("logistic.workflow.selectInspectorItem")}
                  </p>
                </div>
                {(selectedNode || selectedEdge) && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("common.close")}
                    onClick={() => {
                      setSelectedNodeId(null)
                      setSelectedEdgeId(null)
                    }}
                  >
                    <X />
                  </Button>
                )}
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/20 p-3">
                {selectedNode ? (
                  <>
                    <WorkflowInspectorSection
                      icon={FileText}
                      title={t("logistic.workflow.detailsSection")}
                      description={t("logistic.workflow.detailsSectionDescription")}
                    >
                      <WorkflowInspectorField
                        label={t("logistic.workflow.stepName")}
                        htmlFor="workflow-step-name"
                      >
                        <Input
                          id="workflow-step-name"
                          value={selectedNode.data.name}
                          disabled={!canManage || selectedNode.data.kind === "START" || selectedNode.data.kind === "END"}
                          onChange={(event) => updateNode({ name: event.target.value })}
                        />
                      </WorkflowInspectorField>
                      <WorkflowInspectorField
                        label={t("logistic.workflow.stepDescription")}
                        htmlFor="workflow-step-description"
                      >
                        <Textarea
                          id="workflow-step-description"
                          className="min-h-20 resize-y"
                          value={selectedNode.data.description}
                          disabled={!canManage}
                          onChange={(event) => updateNode({ description: event.target.value })}
                        />
                      </WorkflowInspectorField>
                    </WorkflowInspectorSection>

                    {selectedNode.data.kind !== "START" && selectedNode.data.kind !== "END" && (
                      <>
                        <WorkflowInspectorSection
                          icon={UsersRound}
                          title={t("logistic.workflow.assignmentSection")}
                          description={t("logistic.workflow.assignmentSectionDescription")}
                        >
                          <WorkflowInspectorField
                            label={t("logistic.workflow.assignment")}
                            htmlFor="workflow-assignment-strategy"
                          >
                            <NativeSelect
                              id="workflow-assignment-strategy"
                              value={selectedNode.data.assignmentStrategy}
                              disabled={!canManage}
                              onChange={(event) => updateNode({
                                assignmentStrategy: event.target.value as LogisticWorkflowAssignmentStrategy,
                                responsibleUserId: "",
                                organizationUnitId: "",
                              })}
                              className="w-full"
                            >
                              {WORKFLOW_ASSIGNMENT_STRATEGIES.map((strategy) => (
                                <NativeSelectOption key={strategy} value={strategy}>
                                  {t(`logistic.workflow.assignmentStrategies.${strategy}`)}
                                </NativeSelectOption>
                              ))}
                            </NativeSelect>
                          </WorkflowInspectorField>
                          {selectedNode.data.assignmentStrategy === "USER" && (
                            <WorkflowInspectorField
                              label={t("logistic.workflow.responsibleUser")}
                              htmlFor="workflow-responsible-user"
                            >
                              <NativeSelect
                                id="workflow-responsible-user"
                                value={selectedNode.data.responsibleUserId}
                                disabled={!canManage}
                                onChange={(event) => {
                                  const responsibleUserId = event.target.value
                                  const responsibleUser = userById.get(responsibleUserId)
                                  const organizationUnitId = selectedNode.data.organizationUnitId
                                  updateNode({
                                    responsibleUserId,
                                    organizationUnitId:
                                      organizationUnitId
                                      && responsibleUser?.organizationUnitId !== organizationUnitId
                                        ? ""
                                        : organizationUnitId,
                                  })
                                }}
                                className="w-full"
                              >
                                <NativeSelectOption value="">{t("logistic.workflow.selectUser")}</NativeSelectOption>
                                {selectableUsers.map((user) => (
                                  <NativeSelectOption key={user.id} value={user.id}>
                                    {user.name || user.email}
                                  </NativeSelectOption>
                                ))}
                              </NativeSelect>
                            </WorkflowInspectorField>
                          )}
                          {(selectedNode.data.assignmentStrategy === "ORGANIZATION_UNIT"
                            || selectedNode.data.assignmentStrategy === "USER") && (
                            <WorkflowInspectorField
                              label={selectedNode.data.assignmentStrategy === "USER"
                                ? `${t("logistic.workflow.responsibleUnit")} ${t("common.optional")}`
                                : t("logistic.workflow.responsibleUnit")}
                              htmlFor="workflow-responsible-unit"
                            >
                              <NativeSelect
                                id="workflow-responsible-unit"
                                value={selectedNode.data.organizationUnitId}
                                disabled={!canManage}
                                onChange={(event) => updateNode({ organizationUnitId: event.target.value })}
                                className="w-full"
                              >
                                <NativeSelectOption value="">{t("logistic.workflow.selectUnit")}</NativeSelectOption>
                                {selectableOrganizationUnits.map((unit) => (
                                  <NativeSelectOption key={unit.id} value={unit.id}>
                                    {unit.name}
                                  </NativeSelectOption>
                                ))}
                              </NativeSelect>
                            </WorkflowInspectorField>
                          )}
                          {selectedNode.data.assignmentStrategy === "USER" && (
                            <p className="text-xs text-muted-foreground">
                              {t("logistic.workflow.userAssignmentHint")}
                            </p>
                          )}
                          {selectedNode.data.assignmentStrategy === "ORGANIZATION_UNIT" && (
                            <p className="text-xs text-muted-foreground">
                              {t("logistic.workflow.unitAssignmentHint")}
                            </p>
                          )}
                        </WorkflowInspectorSection>

                        <WorkflowInspectorSection
                          icon={Clock3}
                          title={t("logistic.workflow.executionSection")}
                          description={t("logistic.workflow.executionSectionDescription")}
                        >
                          <WorkflowInspectorField
                            label={t("logistic.workflow.taskScope")}
                            htmlFor="workflow-task-scope"
                          >
                            <NativeSelect
                              id="workflow-task-scope"
                              value={selectedNode.data.taskScope}
                              disabled={!canManage}
                              onChange={(event) => updateNode({ taskScope: event.target.value as LogisticWorkflowTaskScope })}
                              className="w-full"
                            >
                              {WORKFLOW_TASK_SCOPES.map((scope) => (
                                <NativeSelectOption key={scope} value={scope}>
                                  {t(`logistic.workflow.taskScopes.${scope}`)}
                                </NativeSelectOption>
                              ))}
                            </NativeSelect>
                          </WorkflowInspectorField>
                          <WorkflowInspectorField
                            label={t("logistic.workflow.targetMinutes")}
                            htmlFor="workflow-target-minutes"
                          >
                            <InputGroup>
                              <InputGroupInput
                                id="workflow-target-minutes"
                                type="number"
                                min={1}
                                value={selectedNode.data.targetDurationMinutes ?? ""}
                                disabled={!canManage}
                                onChange={(event) => updateNode({
                                  targetDurationMinutes: event.target.value ? Number(event.target.value) : null,
                                })}
                              />
                              <InputGroupAddon align="inline-end">
                                <InputGroupText>{t("logistic.workflow.minutesUnit")}</InputGroupText>
                              </InputGroupAddon>
                            </InputGroup>
                          </WorkflowInspectorField>
                        </WorkflowInspectorSection>

                        <WorkflowInspectorSection
                          icon={ShieldCheck}
                          title={t("logistic.workflow.allowedActions")}
                          description={t("logistic.workflow.actionsSectionDescription")}
                          meta={availableActions.length ? (
                            <Badge variant="secondary" className="text-[10px]">
                              {t("logistic.workflow.selectedActions", {
                                selected: selectedNode.data.allowedActions.length,
                                total: availableActions.length,
                              })}
                            </Badge>
                          ) : undefined}
                        >
                          {availableActions.length ? (
                            <div className="space-y-2">
                              {availableActions.map((action) => {
                                const checked = selectedNode.data.allowedActions.includes(action)
                                const inputId = `workflow-action-${action.toLowerCase()}`
                                return (
                                  <Label
                                    key={action}
                                    htmlFor={inputId}
                                    className={cn(
                                      "min-h-10 cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-background p-2.5 text-xs leading-relaxed text-muted-foreground transition-colors hover:bg-muted",
                                      checked && "border-emerald-500/40 bg-emerald-500/5 text-foreground",
                                      !canManage && "cursor-not-allowed opacity-60",
                                    )}
                                  >
                                    <Checkbox
                                      id={inputId}
                                      className="mt-0.5"
                                      checked={checked}
                                      disabled={!canManage}
                                      onCheckedChange={(isChecked) => updateNode({
                                        allowedActions: isChecked
                                          ? [...selectedNode.data.allowedActions, action]
                                          : selectedNode.data.allowedActions.filter((current) => current !== action),
                                      })}
                                    />
                                    <span>{t(ACTION_MESSAGE_KEYS[action])}</span>
                                  </Label>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              {t("logistic.workflow.noActions")}
                            </p>
                          )}
                        </WorkflowInspectorSection>

                        {canManage && (
                          <Button
                            variant="destructive"
                            className="w-full justify-start"
                            onClick={removeSelection}
                          >
                            <Trash2 />
                            {t("logistic.workflow.removeStep")}
                          </Button>
                        )}
                      </>
                    )}
                  </>
                ) : selectedEdge ? (
                  <>
                    <WorkflowInspectorSection
                      icon={GitBranch}
                      title={t("logistic.workflow.transitionInspector")}
                      description={t("logistic.workflow.transitionSectionDescription")}
                    >
                      <WorkflowInspectorField
                        label={t("logistic.workflow.transitionAction")}
                        htmlFor="workflow-transition-action"
                      >
                        <NativeSelect
                          id="workflow-transition-action"
                          value={selectedEdge.data?.actionKey ?? ""}
                          disabled={!canManage}
                          onChange={(event) => updateEdge(event.target.value)}
                          className="w-full"
                        >
                          <NativeSelectOption value="">{t("logistic.workflow.automaticTransition")}</NativeSelectOption>
                          {(edgeSourceNode?.data.allowedActions ?? []).map((action) => (
                            <NativeSelectOption key={action} value={action}>
                              {isWorkflowActionKey(action) ? t(ACTION_MESSAGE_KEYS[action]) : action}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      </WorkflowInspectorField>
                      <WorkflowInspectorField
                        label={t("logistic.workflow.transitionLabel")}
                        htmlFor="workflow-transition-label"
                      >
                        <Input
                          id="workflow-transition-label"
                          value={selectedEdge.data?.label ?? ""}
                          disabled={!canManage}
                          onChange={(event) => updateEdge(selectedEdge.data?.actionKey ?? "", event.target.value)}
                        />
                      </WorkflowInspectorField>
                    </WorkflowInspectorSection>
                    {canManage && (
                      <Button
                        variant="destructive"
                        className="w-full justify-start"
                        onClick={removeSelection}
                      >
                        <Trash2 />
                        {t("logistic.workflow.removeTransition")}
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <CircleHelp className="size-3.5" />
                    </span>
                    {t("logistic.workflow.selectInspectorItem")}
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-border bg-card p-3">
                <div
                  role="status"
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg p-3 text-xs leading-relaxed",
                    canPublish
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {canPublish
                    ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    : <CircleHelp className="mt-0.5 size-4 shrink-0" />}
                  <span>{canPublish ? t("logistic.workflow.valid") : t("logistic.workflow.invalid")}</span>
                </div>
              </div>
            </aside>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-12 text-center text-sm text-muted-foreground">
            {definitions.length ? t("logistic.workflow.openDraftHint") : t("logistic.workflow.empty")}
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
              {t("logistic.workflow.restoreVersionTitle", {
                version: restoreVersion?.version ?? 0,
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {draft
                ? t("logistic.workflow.restoreVersionWithDraftDescription")
                : t("logistic.workflow.restoreVersionDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setRestoreVersion(null)}>
              {t("common.cancel")}
            </Button>
            <AlertDialogAction
              className="bg-emerald-500 text-primary-foreground hover:bg-emerald-500/90"
              disabled={pending || !restoreVersion}
              onClick={() => {
                if (!restoreVersion) return
                run(
                  () => restoreWorkflowVersion(restoreVersion.id),
                  t("logistic.workflow.restoreSuccess", {
                    version: restoreVersion.version,
                  }),
                  () => setRestoreVersion(null),
                )
              }}
            >
              <RotateCcw />
              {t("logistic.workflow.restoreVersion")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDraftOpen} onOpenChange={setDeleteDraftOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("logistic.workflow.deleteDraftTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("logistic.workflow.deleteDraftDescription", {
                workflow: selectedDefinition?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteDraftOpen(false)}>
              {t("common.cancel")}
            </Button>
            <AlertDialogAction
              className="bg-destructive text-primary-foreground hover:bg-destructive/90"
              disabled={pending || !draft}
              onClick={() => {
                if (!draft) return
                run(
                  () => deleteWorkflowDraft(draft.id),
                  t("logistic.workflow.deleteDraftSuccess"),
                  () => setDeleteDraftOpen(false),
                )
              }}
            >
              <Trash2 />
              {t("logistic.workflow.deleteDraft")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form action={createDefinition} className="space-y-4">
            <DialogHeader><DialogTitle>{t("logistic.workflow.newDefinition")}</DialogTitle><DialogDescription>{t("logistic.workflow.newDefinitionDescription")}</DialogDescription></DialogHeader>
            <Label className="space-y-1.5"><span>{t("logistic.workflow.definitionName")}</span><Input name="name" required /></Label>
            <Label className="space-y-1.5"><span>{t("logistic.workflow.subjectType")}</span><NativeSelect name="subjectType" defaultValue="PLAN_SHEET" className="w-full">{SUBJECT_TYPES.map((subject) => <NativeSelectOption key={subject} value={subject}>{t(`logistic.workflow.subjectTypes.${subject}`)}</NativeSelectOption>)}</NativeSelect></Label>
            <Label className="space-y-1.5"><span>{t("logistic.workflow.stepDescription")}</span><Textarea name="description" /></Label>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button><Button type="submit" disabled={pending}>{t("common.create")}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function BusinessWorkflowDesigner(props: Parameters<typeof BusinessWorkflowDesignerInner>[0]) {
  return (
    <ReactFlowProvider>
      <BusinessWorkflowDesignerInner
        key={props.draft?.id ?? props.selectedDefinitionId ?? "empty"}
        {...props}
      />
    </ReactFlowProvider>
  )
}
