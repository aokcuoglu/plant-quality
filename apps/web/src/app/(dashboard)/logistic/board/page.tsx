import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/i18n/server";
import { BoardView } from "./board-view";
import { getCurrentTimeMs } from "@/lib/current-time";

export const dynamic = "force-dynamic";

export default async function LogisticBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; flow?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");
  const t = await getTranslations();
  const params = await searchParams;
  const groups = await prisma.logisticVehicleGroup.findMany({
    where: { companyId: session.user.companyId, active: true },
    orderBy: { name: "asc" },
    include: {
      flowVersions: {
        where: { status: { in: ["PUBLISHED", "ARCHIVED"] } },
        orderBy: { version: "desc" },
        select: { id: true, version: true, name: true, status: true },
      },
    },
  });
  const selectedGroup =
    groups.find((group) => group.id === params.group) ?? groups[0];
  const selectedFlowId = selectedGroup?.flowVersions.some(
    (flow) => flow.id === params.flow,
  )
    ? params.flow
    : selectedGroup?.flowVersions[0]?.id;
  const flow = selectedFlowId
    ? await prisma.logisticFlowVersion.findFirst({
        where: {
          id: selectedFlowId,
          companyId: session.user.companyId,
          groupId: selectedGroup?.id,
        },
        include: {
          nodes: { orderBy: { sequence: "asc" } },
          edges: true,
          vehicleUnits: {
            where: {
              companyId: session.user.companyId,
              flowStatus: { in: ["ACTIVE", "COMPLETED"] },
              orderLine: { order: { planSheetId: { not: null } } },
            },
            include: {
              vehicleModel: true,
              orderLine: {
                include: {
                  order: {
                    select: { id: true, orderNumber: true, customerName: true },
                  },
                },
              },
              visits: {
                orderBy: { enteredAt: "asc" },
                include: { node: { select: { nameSnapshot: true } } },
              },
            },
          },
        },
      })
    : null;
  const waitingCount = selectedGroup
    ? await prisma.logisticVehicleUnit.count({
        where: {
          companyId: session.user.companyId,
          flowStatus: "WAITING_FOR_FLOW",
          vehicleModel: { groupId: selectedGroup.id },
          orderLine: { order: { planSheetId: { not: null } } },
        },
      })
    : 0;

  const ownerUserIds = [
    ...new Set(
      (flow?.nodes ?? [])
        .map((node) => node.responsibleUserId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const [organizationUnits, ownerUsers] = await Promise.all([
    prisma.organizationUnit.findMany({
      where: { companyId: session.user.companyId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    ownerUserIds.length
      ? prisma.user.findMany({
          where: { companyId: session.user.companyId, id: { in: ownerUserIds } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
  ]);
  const unitNameById = new Map(organizationUnits.map((unit) => [unit.id, unit.name]));
  const userLabelById = new Map(
    ownerUsers.map((user) => [user.id, user.name?.trim() || user.email]),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("logistic.dynamicFlow.boardTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("logistic.dynamicFlow.boardDescription")}
        </p>
      </div>
      <BoardView
        nowMs={getCurrentTimeMs()}
        groups={groups.map((group) => ({
          id: group.id,
          name: group.name,
          versions: group.flowVersions,
        }))}
        selectedGroupId={selectedGroup?.id ?? null}
        selectedFlowId={selectedFlowId ?? null}
        waitingCount={waitingCount}
        organizationUnits={organizationUnits}
        flow={
          flow
            ? {
                id: flow.id,
                nodes: flow.nodes.map((node) => ({
                  id: node.id,
                  clientId: node.clientId,
                  name: node.nameSnapshot,
                  kind: node.kind,
                  sequence: node.sequence,
                  targetDurationMinutes: node.targetDurationMinutesSnapshot,
                  organizationUnitId: node.organizationUnitIdSnapshot,
                  organizationUnitName: node.organizationUnitIdSnapshot
                    ? (unitNameById.get(node.organizationUnitIdSnapshot) ?? null)
                    : null,
                  responsibleUserId: node.responsibleUserId,
                  responsibleUserName: node.responsibleUserId
                    ? (userLabelById.get(node.responsibleUserId) ?? null)
                    : null,
                })),
                edges: flow.edges.map((edge) => ({
                  sourceClientId: edge.sourceClientId,
                  targetClientId: edge.targetClientId,
                })),
                units: flow.vehicleUnits.map((unit) => ({
                  id: unit.id,
                  temporaryUnitCode: unit.temporaryUnitCode,
                  vin: unit.vin,
                  chassisNumber: unit.chassisNumber,
                  model: unit.vehicleModel.name,
                  currentNodeId: unit.currentNodeId,
                  flowStatus: unit.flowStatus,
                  revision: unit.revision,
                  orderId: unit.orderLine.order.id,
                  orderNumber: unit.orderLine.order.orderNumber,
                  customerName: unit.orderLine.order.customerName,
                  priority: unit.orderLine.priority,
                  visits: unit.visits.map((visit) => ({
                    id: visit.id,
                    nodeName: visit.node.nameSnapshot,
                    enteredAt: visit.enteredAt.toISOString(),
                    exitedAt: visit.exitedAt?.toISOString() ?? null,
                    transitionType: visit.transitionType,
                    overrideReason: visit.overrideReason,
                  })),
                })),
              }
            : null
        }
        role={session.user.role}
      />
    </div>
  );
}
