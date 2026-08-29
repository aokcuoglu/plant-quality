import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireFeature, requireModule } from "@/lib/billing/guards"
import { deriveVehicleStage } from "@/lib/logistic/stage"
import { DISPATCH_STATUS_LABELS } from "@/lib/logistic/dispatch-status"
import { DispatchQueue, type QueueItem } from "./dispatch-queue"
import { Ship, TruckIcon } from "lucide-react"

export const dynamic = "force-dynamic"

const ACTIVE_DISPATCHES = ["NOT_PLANNED", "PLANNED", "CARRIER_ASSIGNED", "LOADING_PLANNED", "LOADED", "IN_TRANSIT"] as const

export default async function DispatchQueuePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const companyId = session.user.companyId

  const orders = await prisma.plantLogisticOrder.findMany({
    where: {
      companyId,
      status: { notIn: ["CLOSED", "CANCELLED", "REJECTED", "DELIVERED", "DISPATCHED"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      milestones: { select: { gate: true, status: true, qualityHold: true } },
      yardStatus: {
        select: {
          yardLocation: true,
          parkingSlot: true,
          readyForDispatch: true,
          blockedForDispatch: true,
          lastMovementAt: true,
        },
      },
      dispatches: { orderBy: { createdAt: "desc" } },
    },
  })

  const items: QueueItem[] = orders
    .map((order) => {
      const stage = deriveVehicleStage(order)
      const dispatch = order.dispatches.find((d) => ACTIVE_DISPATCHES.includes(d.status as never)) ?? null
      const isCandidate = stage === "READY" || stage === "PDI" || stage === "WASH" || stage === "YARD"
      if (!dispatch && !isCandidate) return null

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        vehicleModel: order.vehicleModel,
        vehicleVariant: order.vehicleVariant,
        vin: order.vin,
        chassisNumber: order.chassisNumber,
        priority: order.priority,
        stage,
        yardLocation: order.yardStatus?.yardLocation ?? null,
        parkingSlot: order.yardStatus?.parkingSlot ?? null,
        blockedForDispatch: order.yardStatus?.blockedForDispatch ?? false,
        dispatch: dispatch
          ? {
              id: dispatch.id,
              status: dispatch.status as string,
              statusLabel: DISPATCH_STATUS_LABELS[dispatch.status as keyof typeof DISPATCH_STATUS_LABELS] ?? dispatch.status,
              carrierName: dispatch.carrierName,
              transportMode: dispatch.transportMode,
              plannedLoadingDate: dispatch.plannedLoadingDate?.toISOString() ?? null,
              estimatedArrivalDate: dispatch.estimatedArrivalDate?.toISOString() ?? null,
            }
          : null,
      } as QueueItem
    })
    .filter((x): x is QueueItem => x !== null)

  const readyCount = items.filter((i) => i.stage === "READY" && !i.dispatch).length
  const inPipeline = items.filter((i) => i.dispatch && i.dispatch.status === "IN_TRANSIT").length
  const loadingToday = items.filter(
    (i) =>
      i.dispatch?.plannedLoadingDate &&
      new Date(i.dispatch.plannedLoadingDate).toDateString() === new Date().toDateString()
  ).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            <span className="inline-flex items-center gap-2">
              <Ship className="size-5" />
              Sevk Kuyruğu
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Üst park + hazır araçlar için anlık sevk talepleri ve yükleme planı
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TruckIcon className="size-4" />
          {items.length} araç
        </div>
      </div>

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3">
        <Summary label="Sevk Bekleyen (Hazır)" value={readyCount} />
        <Summary label="Bugün Yükleme Planı" value={loadingToday} />
        <Summary label="Yolda (In Transit)" value={inPipeline} />
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-20 text-muted-foreground">
          <Ship className="mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm">Aktif sevk talebi veya hazır araç yok.</p>
        </div>
      ) : (
        <DispatchQueue items={items} />
      )}
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  )
}
