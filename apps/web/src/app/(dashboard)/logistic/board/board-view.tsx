"use client";

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Clock,
  GripVertical,
  History,
  Pencil,
  Search,
  Truck,
  UserRound,
} from "lucide-react";
import { useTranslations } from "@/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UserSearchSelect } from "@/components/defects/UserSearchSelect";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  assignFlowNodeOwner,
  moveVehicleUnit,
  startWaitingVehicles,
} from "../flow-actions";

interface BoardNode {
  id: string;
  clientId: string;
  name: string;
  kind: "START" | "PROCESS" | "END";
  sequence: number;
  targetDurationMinutes: number | null;
  organizationUnitId: string | null;
  organizationUnitName: string | null;
  responsibleUserId: string | null;
  responsibleUserName: string | null;
}
interface BoardEdge {
  sourceClientId: string;
  targetClientId: string;
}
interface BoardUnit {
  id: string;
  temporaryUnitCode: string;
  vin: string | null;
  chassisNumber: string | null;
  model: string;
  currentNodeId: string | null;
  flowStatus: string;
  revision: number;
  orderId: string;
  orderNumber: string;
  customerName: string;
  priority: string;
  visits: {
    id: string;
    nodeName: string;
    enteredAt: string;
    exitedAt: string | null;
    transitionType: string;
    overrideReason: string | null;
  }[];
}

interface BoardActor {
  id: string;
  role: string;
  organizationUnitId: string | null;
}

interface PendingDrop {
  unit: BoardUnit;
  targetNode: BoardNode;
}

type OptimisticUnitAction =
  | { type: "move"; unitId: string; targetNodeId: string }
  | { type: "restore"; unit: BoardUnit };

function isAssignedOperator(node: BoardNode, actor: BoardActor) {
  return node.responsibleUserId
    ? node.responsibleUserId === actor.id
    : node.organizationUnitId
      ? node.organizationUnitId === actor.organizationUnitId
      : false;
}

export function BoardView({
  groups,
  selectedGroupId,
  selectedFlowId,
  waitingCount,
  flow,
  organizationUnits,
  actor,
  nowMs,
}: {
  groups: {
    id: string;
    name: string;
    versions: { id: string; version: number; name: string; status: string }[];
  }[];
  selectedGroupId: string | null;
  selectedFlowId: string | null;
  waitingCount: number;
  organizationUnits: { id: string; name: string }[];
  flow: {
    id: string;
    nodes: BoardNode[];
    edges: BoardEdge[];
    units: BoardUnit[];
  } | null;
  actor: BoardActor;
  nowMs: number;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<BoardUnit | null>(null);
  const [localUnits, updateOptimisticUnits] = useOptimistic(
    flow?.units ?? [],
    (current: BoardUnit[], action: OptimisticUnitAction) => {
      if (action.type === "restore") {
        return current.map((unit) =>
          unit.id === action.unit.id ? action.unit : unit,
        );
      }
      return current.map((unit) =>
        unit.id === action.unitId
          ? {
              ...unit,
              currentNodeId: action.targetNodeId,
              revision: unit.revision + 1,
            }
          : unit,
      );
    },
  );
  const [movingUnitIds, setMovingUnitIds] = useState<Set<string>>(new Set());
  const [draggedUnitId, setDraggedUnitId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const selectedGroup = groups.find((group) => group.id === selectedGroupId);
  const processNodes =
    flow?.nodes.filter((node) => node.kind === "PROCESS") ?? [];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return localUnits.filter(
      (unit) =>
        !query ||
        [
          unit.vin,
          unit.temporaryUnitCode,
          unit.chassisNumber,
          unit.model,
          unit.customerName,
        ].some((value) => value?.toLowerCase().includes(query)),
    );
  }, [localUnits, search]);
  const isAdmin = actor.role === "ADMIN" || actor.role === "SUPER_ADMIN";
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 30000);
    return () => window.clearInterval(timer);
  }, [router]);
  function navigate(groupId: string, flowId?: string) {
    router.push(
      `/logistic/board?group=${groupId}${flowId ? `&flow=${flowId}` : ""}`,
    );
  }

  function getSourceNode(unit: BoardUnit) {
    return flow?.nodes.find((node) => node.id === unit.currentNodeId);
  }

  function isLegalTarget(unit: BoardUnit, targetNode: BoardNode) {
    const sourceNode = getSourceNode(unit);
    if (!flow || !sourceNode || sourceNode.id === targetNode.id) return false;
    return flow.edges.some(
      (edge) =>
        edge.sourceClientId === sourceNode.clientId &&
        edge.targetClientId === targetNode.clientId,
    );
  }

  function canDrop(unit: BoardUnit, targetNode: BoardNode) {
    const sourceNode = getSourceNode(unit);
    if (!sourceNode || sourceNode.id === targetNode.id) return false;
    if (isAdmin) return true;
    return (
      actor.role === "EDITOR" &&
      isAssignedOperator(sourceNode, actor) &&
      isLegalTarget(unit, targetNode)
    );
  }

  function needsAdminOverride(unit: BoardUnit, targetNode: BoardNode) {
    const sourceNode = getSourceNode(unit);
    return Boolean(
      isAdmin &&
        sourceNode &&
        (!isAssignedOperator(sourceNode, actor) ||
          !isLegalTarget(unit, targetNode)),
    );
  }

  function move(unit: BoardUnit, targetNodeId: string, reason?: string) {
    const targetNode = flow?.nodes.find((node) => node.id === targetNodeId);
    if (!targetNode || movingUnitIds.has(unit.id)) return;

    setMovingUnitIds((current) => new Set(current).add(unit.id));
    startTransition(async () => {
      updateOptimisticUnits({ type: "move", unitId: unit.id, targetNodeId });
      try {
        const result = await moveVehicleUnit(
          unit.id,
          targetNodeId,
          unit.revision,
          reason,
        );
        if (result.success) {
          toast({
            title: t("logistic.dynamicFlow.vehicleMoved", {
              vehicle: unit.vin ?? unit.temporaryUnitCode,
              station: targetNode.name,
            }),
          });
          return;
        }
        updateOptimisticUnits({ type: "restore", unit });
        const message =
          result.error === "STALE_REVISION"
            ? t("logistic.dynamicFlow.revisionConflict")
            : result.error === "NODE_OWNER_ONLY"
              ? t("logistic.dynamicFlow.errors.NODE_OWNER_ONLY")
              : result.error === "OVERRIDE_REASON_REQUIRED"
                ? t("logistic.dynamicFlow.errors.OVERRIDE_REASON_REQUIRED")
                : result.error === "NEXT_STEP_ONLY"
                  ? t("logistic.dynamicFlow.errors.NEXT_STEP_ONLY")
                  : t("logistic.dynamicFlow.errors.generic");
        toast({ title: message, type: "destructive" });
      } catch {
        updateOptimisticUnits({ type: "restore", unit });
        toast({
          title: t("logistic.dynamicFlow.errors.generic"),
          type: "destructive",
        });
      } finally {
        setMovingUnitIds((current) => {
          const next = new Set(current);
          next.delete(unit.id);
          return next;
        });
        router.refresh();
      }
    });
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, unit: BoardUnit) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", unit.id);
    setDraggedUnitId(unit.id);
  }

  function resetDragState() {
    setDraggedUnitId(null);
    setDragOverNodeId(null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, targetNode: BoardNode) {
    event.preventDefault();
    const unitId = draggedUnitId ?? event.dataTransfer.getData("text/plain");
    const unit = localUnits.find((candidate) => candidate.id === unitId);
    resetDragState();
    if (!unit || !canDrop(unit, targetNode)) return;
    if (needsAdminOverride(unit, targetNode)) {
      setPendingDrop({ unit, targetNode });
      return;
    }
    move(unit, targetNode.id);
  }

  const draggedUnit = localUnits.find((unit) => unit.id === draggedUnitId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="w-full sm:w-52">
          <Label
            htmlFor="board-group"
            className="mb-1.5 text-xs text-muted-foreground"
          >
            {t("logistic.dynamicFlow.group")}
          </Label>
          <NativeSelect
            id="board-group"
            value={selectedGroupId ?? ""}
            onChange={(event) => navigate(event.target.value)} className="w-full"
          >
            <NativeSelectOption value="">
              {t("logistic.dynamicFlow.selectGroup")}
            </NativeSelectOption>
            {groups.map((group) => (
              <NativeSelectOption key={group.id} value={group.id}>
                {group.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="w-full sm:w-56">
          <Label
            htmlFor="board-flow"
            className="mb-1.5 text-xs text-muted-foreground"
          >
            {t("logistic.dynamicFlow.version")}
          </Label>
          <NativeSelect
            id="board-flow"
            value={selectedFlowId ?? ""}
            disabled={!selectedGroup?.versions.length}
            onChange={(event) =>
              selectedGroupId && navigate(selectedGroupId, event.target.value)
            } className="w-full"
          >
            {!selectedGroup?.versions.length && (
              <NativeSelectOption value="">
                {t("logistic.dynamicFlow.noPublishedFlow")}
              </NativeSelectOption>
            )}
            {selectedGroup?.versions.map((version) => (
              <NativeSelectOption key={version.id} value={version.id}>
                v{version.version} ·{" "}
                {version.status === "PUBLISHED"
                  ? t("logistic.dynamicFlow.published")
                  : t("logistic.dynamicFlow.archived")}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="min-w-0 flex-1 basis-72">
          <Label
            htmlFor="board-search"
            className="mb-1.5 text-xs text-muted-foreground"
          >
            {t("common.search")}
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="board-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              placeholder={t("logistic.dynamicFlow.searchPlaceholder")}
            />
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="flex h-8 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground">
            <Truck className="size-4 text-emerald-500" />
            {t("logistic.dynamicFlow.activeVehicles", {
              count:
                localUnits.filter((unit) => unit.flowStatus === "ACTIVE")
                  .length ?? 0,
            })}
          </div>
          {selectedGroupId && waitingCount > 0 && (
            <Button
              variant="outline"
              disabled={!isAdmin || pending}
              onClick={() =>
                startTransition(async () => {
                  await startWaitingVehicles(selectedGroupId);
                  router.refresh();
                })
              }
            >
              {t("logistic.dynamicFlow.startWaiting")} ({waitingCount})
            </Button>
          )}
        </div>
      </div>
      {flow ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <GripVertical className="size-3.5" />
            {t("logistic.dynamicFlow.dragHint")}
          </p>
          <div className="flex min-w-full gap-3 overflow-x-auto pb-3">
            {processNodes.map((node) => {
              const dropAllowed = Boolean(
                draggedUnit && canDrop(draggedUnit, node),
              );
              const isDropTarget =
                dropAllowed && dragOverNodeId === node.id;
              return (
                <div
                  key={node.id}
                  onDragOver={(event) => {
                    if (!draggedUnit || !canDrop(draggedUnit, node)) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDragOverNodeId(node.id);
                  }}
                  onDrop={(event) => handleDrop(event, node)}
                  className={cn(
                    "flex min-h-80 w-72 shrink-0 grow flex-col overflow-hidden rounded-xl border border-border bg-muted/30 transition-[border-color,box-shadow,background-color,opacity]",
                    draggedUnit && dropAllowed && "border-emerald-500/50 bg-emerald-500/5",
                    draggedUnit && !dropAllowed && node.id !== draggedUnit.currentNodeId && "opacity-60",
                    isDropTarget && "border-emerald-500 ring-2 ring-emerald-500/30",
                  )}
                >
                  <div className="border-b border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-sm font-semibold text-foreground">
                        {node.name}
                      </h2>
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                        {
                          filtered.filter(
                            (unit) => unit.currentNodeId === node.id,
                          ).length
                        }
                      </span>
                    </div>
                    {node.targetDurationMinutes && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {t("logistic.dynamicFlow.sla")} ·{" "}
                        {t("logistic.dynamicFlow.minutes", {
                          count: node.targetDurationMinutes,
                        })}
                      </p>
                    )}
                    <ColumnOwner
                      key={`${node.id}:${node.organizationUnitId ?? ""}:${node.responsibleUserId ?? ""}`}
                      node={node}
                      organizationUnits={organizationUnits}
                      canAssign={isAdmin}
                      pending={pending}
                      onSave={(organizationUnitId, responsibleUserId) => {
                        startTransition(async () => {
                          const result = await assignFlowNodeOwner(
                            node.id,
                            organizationUnitId,
                            responsibleUserId,
                          );
                          if (!result.success) {
                            toast({
                              title: t("logistic.dynamicFlow.errors.generic"),
                              type: "destructive",
                            });
                            return;
                          }
                          toast({
                            title: t("logistic.dynamicFlow.ownerSaved"),
                          });
                          router.refresh();
                        });
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-2 p-2">
                    {filtered
                      .filter((unit) => unit.currentNodeId === node.id)
                      .map((unit) => {
                        const assignedOperator = isAssignedOperator(node, actor);
                        const canOperate =
                          isAdmin ||
                          (actor.role === "EDITOR" && assignedOperator);
                        const nextNodes = flow.edges
                          .filter(
                            (edge) => edge.sourceClientId === node.clientId,
                          )
                          .map((edge) =>
                            flow.nodes.find(
                              (candidate) =>
                                candidate.clientId === edge.targetClientId,
                            ),
                          )
                          .filter(
                            (candidate): candidate is BoardNode =>
                              Boolean(candidate),
                          )
                          .filter(
                            (candidate, index, list) =>
                              list.findIndex(
                                (item) => item.id === candidate.id,
                              ) === index,
                          );
                        return (
                          <VehicleCard
                            key={unit.id}
                            unit={unit}
                            node={node}
                            nextNodes={nextNodes}
                            allNodes={flow.nodes}
                            canEdit={canOperate}
                            isAdmin={isAdmin}
                            requiresAssignmentOverride={
                              isAdmin && !assignedOperator
                            }
                            pending={pending || movingUnitIds.has(unit.id)}
                            dragging={draggedUnitId === unit.id}
                            onMove={move}
                            onHistory={() => setSelectedUnit(unit)}
                            onDragStart={(event) =>
                              handleDragStart(event, unit)
                            }
                            onDragEnd={resetDragState}
                            nowMs={nowMs}
                          />
                        );
                      })}
                    {!filtered.some(
                      (unit) => unit.currentNodeId === node.id,
                    ) && (
                      <p className="py-8 text-center text-xs text-muted-foreground">
                        {isDropTarget
                          ? t("logistic.dynamicFlow.dropHere")
                          : t("logistic.dynamicFlow.emptyColumn")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card py-24 text-center text-sm text-muted-foreground">
          {t("logistic.dynamicFlow.emptyBoard")}
        </div>
      )}
      <Sheet
        open={Boolean(selectedUnit)}
        onOpenChange={(open) => !open && setSelectedUnit(null)}
      >
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedUnit?.vin ?? selectedUnit?.temporaryUnitCode}
            </SheetTitle>
            <SheetDescription>
              {t("logistic.dynamicFlow.history")}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 p-4">
            {selectedUnit?.visits.map((visit) => (
              <div
                key={visit.id}
                className="rounded-md border border-border p-3"
              >
                <div className="flex items-center gap-2">
                  <History className="size-4 text-brand" />
                  <span className="text-sm font-medium text-foreground">
                    {visit.nodeName}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("logistic.dynamicFlow.entered")}:{" "}
                  {new Date(visit.enteredAt).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("logistic.dynamicFlow.exited")}:{" "}
                  {visit.exitedAt
                    ? new Date(visit.exitedAt).toLocaleString()
                    : t("logistic.dynamicFlow.current")}
                </p>
                {visit.overrideReason && (
                  <p className="mt-2 text-xs text-foreground">
                    {visit.overrideReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
      <DragOverrideDialog
        drop={pendingDrop}
        pending={pending}
        onCancel={() => setPendingDrop(null)}
        onConfirm={(reason) => {
          if (!pendingDrop) return;
          move(pendingDrop.unit, pendingDrop.targetNode.id, reason);
          setPendingDrop(null);
        }}
      />
    </div>
  );
}

function ColumnOwner({
  node,
  organizationUnits,
  canAssign,
  pending,
  onSave,
}: {
  node: BoardNode;
  organizationUnits: { id: string; name: string }[];
  canAssign: boolean;
  pending: boolean;
  onSave: (
    organizationUnitId: string | null,
    responsibleUserId: string | null,
  ) => void;
}) {
  const t = useTranslations();
  const [editing, setEditing] = useState(false);
  const [unitId, setUnitId] = useState(node.organizationUnitId ?? "");
  const [userId, setUserId] = useState(node.responsibleUserId ?? "");
  const [userName, setUserName] = useState(node.responsibleUserName ?? "");

  if (!canAssign) {
    return <OwnerSummary node={node} />;
  }

  if (!editing) {
    return (
      <OwnerSummary node={node} onEdit={() => setEditing(true)} />
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-border bg-background p-3 shadow-sm">
      <div>
        <Label
          htmlFor={`owner-unit-${node.id}`}
          className="mb-1.5 text-[11px] text-muted-foreground"
        >
          {t("logistic.dynamicFlow.responsibleUnit")}
        </Label>
        <NativeSelect
          id={`owner-unit-${node.id}`}
          value={unitId}
          onChange={(event) => setUnitId(event.target.value)}
          disabled={pending} className="w-full"
          size="sm"
        >
          <NativeSelectOption value="">{t("common.none")}</NativeSelectOption>
          {organizationUnits.map((unit) => (
            <NativeSelectOption key={unit.id} value={unit.id}>
              {unit.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div>
        <Label className="mb-1.5 text-[11px] text-muted-foreground">
          {t("logistic.dynamicFlow.responsibleUser")}
        </Label>
        <UserSearchSelect
          value={userId}
          selectedName={userName}
          placeholder={t("logistic.dynamicFlow.responsibleUser")}
          onSelect={(id, name) => {
            setUserId(id);
            setUserName(name);
          }}
        />
      </div>
      <div className="flex gap-1">
        <Button
          type="button"
          size="sm"
          className="h-7 bg-emerald-500 px-2 text-[10px] text-primary-foreground hover:bg-emerald-500/90"
          disabled={pending}
          onClick={() => onSave(unitId || null, userId || null)}
        >
          {t("common.save")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[10px]"
          disabled={pending}
          onClick={() => setEditing(false)}
        >
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}

function OwnerSummary({
  node,
  onEdit,
}: {
  node: BoardNode;
  onEdit?: () => void;
}) {
  const t = useTranslations();
  const details = (
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex items-start gap-2">
        <Building2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
        <div className="min-w-0">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("logistic.dynamicFlow.responsibleUnit")}
          </span>
          <span
            className="mt-0.5 block truncate text-xs font-medium text-foreground"
            title={node.organizationUnitName ?? undefined}
          >
            {node.organizationUnitName ?? t("common.none")}
          </span>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <UserRound className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
        <div className="min-w-0">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("logistic.dynamicFlow.responsibleUser")}
          </span>
          <span
            className="mt-0.5 block truncate text-xs font-medium text-foreground"
            title={node.responsibleUserName ?? undefined}
          >
            {node.responsibleUserName ?? t("common.none")}
          </span>
        </div>
      </div>
    </div>
  );

  if (!onEdit) {
    return (
      <div className="mt-3 flex rounded-lg border border-border bg-background p-2.5">
        {details}
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onEdit}
      aria-label={t("logistic.dynamicFlow.assignOwner")}
      className="group mt-3 h-auto w-full items-start justify-between rounded-lg bg-background px-2.5 py-2.5 text-left whitespace-normal"
    >
      {details}
      <Pencil className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-colors group-hover/button:text-foreground" />
    </Button>
  );
}

function VehicleCard({
  unit,
  node,
  nextNodes,
  allNodes,
  canEdit,
  isAdmin,
  requiresAssignmentOverride,
  pending,
  dragging,
  onMove,
  onHistory,
  onDragStart,
  onDragEnd,
  nowMs,
}: {
  unit: BoardUnit;
  node: BoardNode;
  nextNodes: BoardNode[];
  allNodes: BoardNode[];
  canEdit: boolean;
  isAdmin: boolean;
  requiresAssignmentOverride: boolean;
  pending: boolean;
  dragging: boolean;
  onMove: (unit: BoardUnit, nodeId: string, reason?: string) => void;
  onHistory: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  nowMs: number;
}) {
  const t = useTranslations();
  const enteredAt = unit.visits.findLast((visit) => !visit.exitedAt)?.enteredAt;
  const elapsedMinutes = enteredAt
    ? Math.max(
        0,
        Math.floor((nowMs - new Date(enteredAt).getTime()) / 60000),
      )
    : 0;
  const breached = Boolean(
    node.targetDurationMinutes && elapsedMinutes > node.targetDurationMinutes,
  );
  const legalIds = new Set(nextNodes.map((candidate) => candidate.id));
  const defaultTarget = nextNodes[0]?.id ?? "";
  const [target, setTarget] = useState(defaultTarget);
  const [reason, setReason] = useState("");
  const effectiveTarget = target || defaultTarget;
  const isOverride = Boolean(
    isAdmin &&
      effectiveTarget &&
      (requiresAssignmentOverride || !legalIds.has(effectiveTarget)),
  );
  const showAdvance = canEdit && (nextNodes.length > 0 || isAdmin);
  const canDrag = canEdit && !pending;
  return (
    <div
      draggable={canDrag}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={canDrag ? t("logistic.dynamicFlow.dragCard") : undefined}
      className={cn(
        "rounded-lg border border-border bg-card p-3 shadow-sm transition-[border-color,box-shadow,opacity,transform]",
        canDrag && "cursor-grab hover:border-emerald-500/50 hover:shadow-md active:cursor-grabbing",
        dragging && "scale-[0.98] border-emerald-500 opacity-50",
        pending && "opacity-60",
      )}
    >
      <div className="flex justify-between gap-2">
        <div>
          <Link
            href={`/logistic/orders/${unit.orderId}`}
            className="text-xs font-semibold text-foreground"
          >
            {unit.vin ?? unit.temporaryUnitCode}
          </Link>
          <p className="text-[11px] text-muted-foreground">
            {unit.model} · {unit.orderNumber}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {unit.customerName}
          </p>
        </div>
        <div className="flex items-start gap-0.5">
          {canDrag && (
            <GripVertical
              aria-hidden="true"
              className="mt-1 size-4 text-muted-foreground"
            />
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onHistory}
            aria-label={t("logistic.dynamicFlow.history")}
            className="text-muted-foreground hover:text-foreground"
          >
            <History className="size-4" />
          </Button>
        </div>
      </div>
      <div
        className={`mt-3 flex items-center gap-1 text-[10px] ${breached ? "text-destructive" : "text-muted-foreground"}`}
      >
        <Clock className="size-3" />
        {t("logistic.dynamicFlow.elapsed")}:{" "}
        {t("logistic.dynamicFlow.minutes", { count: elapsedMinutes })}
        {breached && ` · ${t("logistic.dynamicFlow.slaExceeded")}`}
      </div>
      {showAdvance && (
        <div className="mt-3 space-y-2">
          {(isAdmin || nextNodes.length > 1) && (
            <NativeSelect
              value={effectiveTarget}
              onChange={(event) => setTarget(event.target.value)} className="w-full"
              size="sm"
            >
              {(isAdmin
                ? allNodes.filter(
                    (candidate) =>
                      candidate.kind !== "START" && candidate.id !== node.id,
                  )
                : nextNodes
              ).map((candidate) => (
                <NativeSelectOption key={candidate.id} value={candidate.id}>
                  {candidate.name}
                  {legalIds.has(candidate.id) && nextNodes.length > 1
                    ? ` · ${t("logistic.dynamicFlow.nextStep")}`
                    : ""}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
          {isOverride && (
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("logistic.dynamicFlow.overrideReason")}
              className="h-8 text-xs"
            />
          )}
          <Button
            size="sm"
            className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
            disabled={Boolean(
              pending ||
              !Boolean(effectiveTarget) ||
              (isOverride && !reason.trim())
            )}
            onClick={() => onMove(unit, effectiveTarget, reason)}
          >
            {isOverride
              ? t("logistic.dynamicFlow.override")
              : t("logistic.dynamicFlow.advance")}
          </Button>
        </div>
      )}
    </div>
  );
}

function DragOverrideDialog({
  drop,
  pending,
  onCancel,
  onConfirm,
}: {
  drop: PendingDrop | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const t = useTranslations();
  const [reason, setReason] = useState("");

  function cancel() {
    setReason("");
    onCancel();
  }

  return (
    <Dialog open={Boolean(drop)} onOpenChange={(open) => !open && cancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("logistic.dynamicFlow.overrideDropTitle")}</DialogTitle>
          <DialogDescription>
            {drop
              ? t("logistic.dynamicFlow.overrideDropDescription", {
                  vehicle: drop.unit.vin ?? drop.unit.temporaryUnitCode,
                  station: drop.targetNode.name,
                })
              : null}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="drag-override-reason">
            {t("logistic.dynamicFlow.overrideReason")}
          </Label>
          <Input
            id="drag-override-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("logistic.dynamicFlow.overrideReason")}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={cancel}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className="bg-emerald-500 text-primary-foreground hover:bg-emerald-500/90"
            disabled={pending || !reason.trim()}
            onClick={() => {
              onConfirm(reason.trim());
              setReason("");
            }}
          >
            {t("logistic.dynamicFlow.confirmOverrideDrop")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
