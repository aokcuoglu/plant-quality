import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireFeature, requireModule } from "@/lib/billing/guards"
import { deriveVehicleStage, VEHICLE_STAGES, getActiveMilestone } from "@/lib/logistic/stage"
import { labelForGate } from "@/lib/logistic/milestone-types"
import type { VehicleStage } from "@/lib/logistic/stage"
import type { Prisma, ProductionMilestoneStatus, ProductionMilestoneGate, DispatchStatus, LogisticOrderStatus } from "@/generated/prisma/client"
import { BoardView, type BoardOrder } from "./board-view"
import { LayoutGrid, TruckIcon } from "lucide-react"

export const dynamic = "force-dynamic"

const ORDER_INCLUDE = {
  milestones: {
    orderBy: { sequence: "asc" },
    select: { gate: true, status: true, qualityHold: true, sequence: true, plannedFinish: true },
  },
  yardStatus: {
    select: {
      yardLocation: true,
      parkingSlot: true,
      readyForDispatch: true,
      blockedForDispatch: true,
      blockReason: true,
      lastMovementAt: true,
    },
  },
  dispatches: {
    orderBy: { createdAt: "desc" },
    select: { status: true, carrierName: true, estimatedArrivalDate: true },
  },
} satisfies Prisma.PlantLogisticOrderInclude

type BoardQueryOrder = ({
  id: string
  orderNumber: string
  customerName: string
  vehicleModel: string
  vehicleVariant: string | null
  vin: string | null
  chassisNumber: string | null
  quantity: number
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT"
  status: LogisticOrderStatus
  createdAt: Date
  requestedDeliveryDate: Date | null
  plannedDeliveryDate: Date | null
  milestones: { gate: ProductionMilestoneGate; status: ProductionMilestoneStatus; qualityHold: boolean; sequence: number; plannedFinish: Date | null }[]
  yardStatus: { yardLocation: string | null; parkingSlot: string | null; readyForDispatch: boolean; blockedForDispatch: boolean; blockReason: string | null; lastMovementAt: Date | null } | null
  dispatches: { status: DispatchStatus; carrierName: string | null; estimatedArrivalDate: Date | null }[]
})

async function getBoardOrders(companyId: string): Promise<BoardOrder[]> {
  const orders = (await prisma.plantLogisticOrder.findMany({
    where: { companyId, status: { notIn: ["CLOSED", "CANCELLED", "REJECTED"] } },
    orderBy: { createdAt: "asc" },
    include: ORDER_INCLUDE,
  })) as unknown as BoardQueryOrder[]

  const now = Date.now()
  return orders.map((order) => {
    const stage = deriveVehicleStage(order)
    const active = getActiveMilestone(order.milestones)
    const dispatch = order.dispatches[0] ?? null
    const lastMovement = order.yardStatus?.lastMovementAt
      ? new Date(order.yardStatus.lastMovementAt).getTime()
      : null
    const waitingDays = lastMovement ? Math.max(0, Math.floor((now - lastMovement) / 86400000)) : null

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      vehicleModel: order.vehicleModel,
      vehicleVariant: order.vehicleVariant,
      vin: order.vin,
      chassisNumber: order.chassisNumber,
      quantity: order.quantity,
      priority: order.priority,
      createdAt: order.createdAt.toISOString(),
      requestedDeliveryDate: order.requestedDeliveryDate?.toISOString() ?? null,
      plannedDeliveryDate: order.plannedDeliveryDate?.toISOString() ?? null,
      stage,
      currentGate: active ? labelForGate(active.gate) : null,
      yardLocation: order.yardStatus?.yardLocation ?? null,
      parkingSlot: order.yardStatus?.parkingSlot ?? null,
      blockedForDispatch: order.yardStatus?.blockedForDispatch ?? false,
      waitingDays,
      dispatchStatus: dispatch?.status ?? null,
      carrierName: dispatch?.carrierName ?? null,
    }
  })
}

export default async function LogisticBoardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const companyId = session.user.companyId
  const boardOrders = await getBoardOrders(companyId)

  const grouped = Object.fromEntries(VEHICLE_STAGES.map((s) => [s, [] as BoardOrder[]])) as Record<
    VehicleStage,
    BoardOrder[]
  >
  for (const order of boardOrders) {
    grouped[order.stage].push(order)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            <span className="inline-flex items-center gap-2">
              <LayoutGrid className="size-5" />
              Live Vehicle Board
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerçek zamanlı araç konum görünümü — tüm bölümler için anlık durum
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TruckIcon className="size-4" />
          {boardOrders.length} aktif araç
        </div>
      </div>

      {boardOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-24 text-muted-foreground">
          <TruckIcon className="mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm">Panele koyacak aktif araç yok.</p>
        </div>
      ) : (
        <BoardView orders={boardOrders} grouped={grouped} />
      )}
    </div>
  )
}
