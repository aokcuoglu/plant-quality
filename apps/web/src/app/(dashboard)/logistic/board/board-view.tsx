"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, History, Search, Truck } from "lucide-react";
import { useTranslations } from "@/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UserSearchSelect } from "@/components/defects/UserSearchSelect";
import { toast } from "@/components/ui/use-toast";
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

export function BoardView({
  groups,
  selectedGroupId,
  selectedFlowId,
  waitingCount,
  flow,
  organizationUnits,
  role,
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
  role: string;
  nowMs: number;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<BoardUnit | null>(null);
  const selectedGroup = groups.find((group) => group.id === selectedGroupId);
  const processNodes =
    flow?.nodes.filter((node) => node.kind === "PROCESS") ?? [];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (flow?.units ?? []).filter(
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
  }, [flow?.units, search]);
  const canEdit = role !== "VIEWER";
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 30000);
    return () => window.clearInterval(timer);
  }, [router]);
  function navigate(groupId: string, flowId?: string) {
    router.push(
      `/logistic/board?group=${groupId}${flowId ? `&flow=${flowId}` : ""}`,
    );
  }
  function move(unit: BoardUnit, targetNodeId: string, reason?: string) {
    startTransition(async () => {
      const result = await moveVehicleUnit(
        unit.id,
        targetNodeId,
        unit.revision,
        reason,
      );
      if (!result.success)
        window.alert(
          result.error === "STALE_REVISION"
            ? t("logistic.dynamicFlow.revisionConflict")
            : result.error,
        );
      router.refresh();
    });
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          value={selectedGroupId ?? ""}
          onChange={(event) => navigate(event.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        >
          <option value="">{t("logistic.dynamicFlow.selectGroup")}</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <select
          value={selectedFlowId ?? ""}
          disabled={!selectedGroup?.versions.length}
          onChange={(event) =>
            selectedGroupId && navigate(selectedGroupId, event.target.value)
          }
          className="h-9 min-w-48 rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        >
          {!selectedGroup?.versions.length && (
            <option value="">
              {t("logistic.dynamicFlow.noPublishedFlow")}
            </option>
          )}
          {selectedGroup?.versions.map((version) => (
            <option key={version.id} value={version.id}>
              v{version.version} ·{" "}
              {version.status === "PUBLISHED"
                ? t("logistic.dynamicFlow.published")
                : t("logistic.dynamicFlow.archived")}
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-2 rounded-md border border-border bg-card px-3 text-xs text-muted-foreground">
          <Truck className="size-4" />
          {t("logistic.dynamicFlow.activeVehicles", {
            count:
              flow?.units.filter((unit) => unit.flowStatus === "ACTIVE")
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
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
          placeholder={t("logistic.dynamicFlow.searchPlaceholder")}
        />
      </div>
      {flow ? (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {processNodes.map((node) => (
            <div
              key={node.id}
              className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/30"
            >
              <div className="border-b border-border bg-card p-3">
                <div className="flex justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    {node.name}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {
                      filtered.filter((unit) => unit.currentNodeId === node.id)
                        .length
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
                      toast({ title: t("logistic.dynamicFlow.ownerSaved") });
                      router.refresh();
                    });
                  }}
                />
              </div>
              <div className="space-y-2 p-2">
                {filtered
                  .filter((unit) => unit.currentNodeId === node.id)
                  .map((unit) => {
                    const nextNodes = flow.edges
                      .filter((edge) => edge.sourceClientId === node.clientId)
                      .map((edge) =>
                        flow.nodes.find(
                          (candidate) => candidate.clientId === edge.targetClientId,
                        ),
                      )
                      .filter((candidate): candidate is BoardNode => Boolean(candidate))
                      .filter(
                        (candidate, index, list) =>
                          list.findIndex((item) => item.id === candidate.id) === index,
                      );
                    return (
                      <VehicleCard
                        key={unit.id}
                        unit={unit}
                        node={node}
                        nextNodes={nextNodes}
                        allNodes={flow.nodes}
                        canEdit={canEdit}
                        isAdmin={isAdmin}
                        pending={pending}
                        onMove={move}
                        onHistory={() => setSelectedUnit(unit)}
                        nowMs={nowMs}
                      />
                    );
                  })}
                {!filtered.some((unit) => unit.currentNodeId === node.id) && (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    {t("logistic.dynamicFlow.emptyColumn")}
                  </p>
                )}
              </div>
            </div>
          ))}
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

  useEffect(() => {
    setUnitId(node.organizationUnitId ?? "");
    setUserId(node.responsibleUserId ?? "");
    setUserName(node.responsibleUserName ?? "");
    setEditing(false);
  }, [
    node.id,
    node.organizationUnitId,
    node.responsibleUserId,
    node.responsibleUserName,
  ]);

  const summary =
    node.organizationUnitName || node.responsibleUserName
      ? [node.organizationUnitName, node.responsibleUserName]
          .filter(Boolean)
          .join(" · ")
      : t("logistic.dynamicFlow.noOwner");

  if (!canAssign) {
    return (
      <p className="mt-2 text-[10px] text-muted-foreground">{summary}</p>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-2 block w-full text-left text-[10px] text-muted-foreground hover:text-foreground"
      >
        {summary} · {t("logistic.dynamicFlow.assignOwner")}
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-md border border-border bg-background p-2">
      <select
        value={unitId}
        onChange={(event) => setUnitId(event.target.value)}
        disabled={pending}
        className="h-8 w-full rounded-md border border-border bg-background px-2 text-[11px] text-foreground"
        aria-label={t("logistic.dynamicFlow.responsibleUnit")}
      >
        <option value="">{t("common.none")}</option>
        {organizationUnits.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.name}
          </option>
        ))}
      </select>
      <UserSearchSelect
        value={userId}
        selectedName={userName}
        placeholder={t("logistic.dynamicFlow.responsibleUser")}
        onSelect={(id, name) => {
          setUserId(id);
          setUserName(name);
        }}
      />
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

function VehicleCard({
  unit,
  node,
  nextNodes,
  allNodes,
  canEdit,
  isAdmin,
  pending,
  onMove,
  onHistory,
  nowMs,
}: {
  unit: BoardUnit;
  node: BoardNode;
  nextNodes: BoardNode[];
  allNodes: BoardNode[];
  canEdit: boolean;
  isAdmin: boolean;
  pending: boolean;
  onMove: (unit: BoardUnit, nodeId: string, reason?: string) => void;
  onHistory: () => void;
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
  const isOverride =
    Boolean(isAdmin && effectiveTarget && !legalIds.has(effectiveTarget));
  const showAdvance = canEdit && (nextNodes.length > 0 || isAdmin);
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
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
        <button
          type="button"
          onClick={onHistory}
          aria-label={t("logistic.dynamicFlow.history")}
        >
          <History className="size-4 text-muted-foreground" />
        </button>
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
            <select
              value={effectiveTarget}
              onChange={(event) => setTarget(event.target.value)}
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
            >
              {(isAdmin
                ? allNodes.filter(
                    (candidate) =>
                      candidate.kind !== "START" && candidate.id !== node.id,
                  )
                : nextNodes
              ).map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                  {legalIds.has(candidate.id) && nextNodes.length > 1
                    ? ` · ${t("logistic.dynamicFlow.nextStep")}`
                    : ""}
                </option>
              ))}
            </select>
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
