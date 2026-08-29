"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Search,
  PackageCheck,
  Ban,
  Clock,
  Truck,
  Ship,
  ArrowRight,
  X,
} from "lucide-react"
import { VEHICLE_STAGES, STAGE_META, type VehicleStage } from "@/lib/logistic/stage"
import { moveOrderToStage, requestDispatch } from "./stage-actions"

export interface BoardOrder {
  id: string
  orderNumber: string
  customerName: string
  vehicleModel: string
  vehicleVariant: string | null
  vin: string | null
  chassisNumber: string | null
  quantity: number
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT"
  createdAt: string
  requestedDeliveryDate: string | null
  plannedDeliveryDate: string | null
  stage: VehicleStage
  currentGate: string | null
  yardLocation: string | null
  parkingSlot: string | null
  blockedForDispatch: boolean
  waitingDays: number | null
  dispatchStatus: string | null
  carrierName: string | null
}

const PRIORITY_BADGE: Record<BoardOrder["priority"], string> = {
  LOW: "bg-muted text-muted-foreground",
  NORMAL: "bg-muted text-foreground",
  HIGH: "bg-amber-500/10 text-amber-600",
  URGENT: "bg-destructive/10 text-destructive",
}

export function BoardView({
  orders,
  grouped,
}: {
  orders: BoardOrder[]
  grouped: Record<VehicleStage, BoardOrder[]>
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), 30000)
    return () => window.clearInterval(id)
  }, [router])

  const q = search.trim().toLowerCase()
  const filtered = q
    ? orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.vehicleModel.toLowerCase().includes(q) ||
          (o.vin ?? "").toLowerCase().includes(q) ||
          (o.chassisNumber ?? "").toLowerCase().includes(q)
      )
    : orders

  const filteredGrouped = Object.fromEntries(
    VEHICLE_STAGES.map((s) => [s, filtered.filter((o) => o.stage === s)])
  ) as Record<VehicleStage, BoardOrder[]>

  function handleMove(orderId: string, targetStage: VehicleStage) {
    startTransition(async () => {
      const res = await moveOrderToStage(orderId, targetStage)
      if (res?.error) alert(res.error)
      router.refresh()
    })
  }

  function handleRequest(orderId: string) {
    startTransition(async () => {
      const res = await requestDispatch(orderId)
      if (res?.error) alert(res.error)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Şase #, araç, müşteri ara..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} araç</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {VEHICLE_STAGES.map((stage) => (
          <StageColumn
            key={stage}
            stage={stage}
            cardCount={filteredGrouped[stage].length}
            totalCount={grouped[stage].length}
            orders={filteredGrouped[stage]}
            isPending={isPending}
            onDrop={(target, orderId) => handleMove(orderId, target)}
            onRequest={handleRequest}
          />
        ))}
      </div>
    </div>
  )
}

function StageColumn({
  stage,
  cardCount,
  totalCount,
  orders,
  isPending,
  onDrop,
  onRequest,
}: {
  stage: VehicleStage
  cardCount: number
  totalCount: number
  orders: BoardOrder[]
  isPending: boolean
  onDrop: (targetStage: VehicleStage, orderId: string) => void
  onRequest: (orderId: string) => void
}) {
  const meta = STAGE_META[stage]
  const [over, setOver] = useState(false)

  return (
    <div
      className="flex w-64 shrink-0 flex-col rounded-lg border border-border bg-muted/30"
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const orderId = e.dataTransfer.getData("text/plain")
        if (orderId) onDrop(stage, orderId)
      }}
    >
      <div className={`rounded-t-lg border-b border-border bg-card px-3 py-2.5 ${meta.color}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${meta.dotColor}`} />
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
              {meta.label}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {cardCount}
            {cardCount !== totalCount ? ` / ${totalCount}` : ""}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{meta.description}</p>
      </div>

      <div className={`flex flex-1 flex-col gap-2 p-2 ${over ? "bg-card/60" : ""}`}>
        {orders.length === 0 ? (
          <div className="flex h-12 items-center justify-center text-[10px] text-muted-foreground">
            {cardCount === 0 ? "Boş" : "Filtrelenmiş"}
          </div>
        ) : (
          orders.map((order) => (
            <VehicleCard
              key={order.id}
              order={order}
              stage={stage}
              isPending={isPending}
              onDrop={onDrop}
              onRequest={onRequest}
            />
          ))
        )}
      </div>
    </div>
  )
}

function VehicleCard({
  order,
  stage,
  isPending,
  onDrop,
  onRequest,
}: {
  order: BoardOrder
  stage: VehicleStage
  isPending: boolean
  onDrop: (targetStage: VehicleStage, orderId: string) => void
  onRequest: (orderId: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const deliveryTarget = order.requestedDeliveryDate ?? order.plannedDeliveryDate

  const canRequestDispatch =
    (stage === "READY" || stage === "PDI" || stage === "WASH" || stage === "YARD") &&
    order.dispatchStatus !== "IN_TRANSIT" &&
    order.dispatchStatus !== "DELIVERED"

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", order.id)
        e.dataTransfer.effectAllowed = "move"
      }}
      onDragEnd={() => setMenuOpen(false)}
      className="group relative cursor-grab rounded-lg border border-border bg-card p-2.5 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <Link
            href={`/logistic/orders/${order.id}`}
            className="text-xs font-semibold text-foreground hover:text-foreground"
          >
            {order.orderNumber}
          </Link>
          <p className="truncate text-[11px] text-muted-foreground">
            {order.vehicleModel}
            {order.vehicleVariant ? ` · ${order.vehicleVariant}` : ""}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">{order.customerName}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${PRIORITY_BADGE[order.priority]}`}
        >
          {order.priority}
        </span>
      </div>

      <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
        {(order.vin || order.chassisNumber) && (
          <p className="truncate font-mono text-foreground/60">{order.vin ?? order.chassisNumber}</p>
        )}
        {order.currentGate && (
          <p className="flex items-center gap-1">
            <Truck className="size-3" />
            <span>{order.currentGate}</span>
          </p>
        )}
        {order.yardLocation && (
          <p className="flex items-center gap-1">
            <PackageCheck className="size-3" />
            <span>
              {order.yardLocation}
              {order.parkingSlot ? ` / ${order.parkingSlot}` : ""}
            </span>
          </p>
        )}
        {order.blockedForDispatch && (
          <p className="flex items-center gap-1 text-destructive">
            <Ban className="size-3" /> Sevk engelli
          </p>
        )}
        {order.waitingDays !== null && order.waitingDays > 0 && (
          <p className="flex items-center gap-1">
            <Clock className="size-3" />
            <span>{order.waitingDays} gün bekliyor</span>
          </p>
        )}
        {deliveryTarget && (
          <p className="flex items-center gap-1">
            <PackageCheck className="size-3" />
            <span>{new Date(deliveryTarget).toLocaleDateString()}</span>
          </p>
        )}
        {order.carrierName && (
          <p className="flex items-center gap-1">
            <Ship className="size-3" />
            <span>{order.carrierName}</span>
          </p>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <ArrowRight className="size-3" />
          Taşı
        </button>
        {canRequestDispatch && (
          <button
            onClick={() => onRequest(order.id)}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            <Ship className="size-3" /> Sevk Talebi
          </button>
        )}
      </div>

      {menuOpen && (
        <MoveMenu
          current={stage}
          onClose={() => setMenuOpen(false)}
          onMove={(target) => {
            setMenuOpen(false)
            onDrop(target, order.id)
          }}
        />
      )}
    </div>
  )
}

function MoveMenu({
  current,
  onClose,
  onMove,
}: {
  current: VehicleStage
  onClose: () => void
  onMove: (stage: VehicleStage) => void
}) {
  return (
    <div className="absolute right-2 top-2 z-20 w-44 rounded-lg border border-border bg-popover p-1 shadow-lg">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Taşı →
        </span>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      </div>
      <div className="max-h-48 overflow-auto">
        {VEHICLE_STAGES.filter((s) => s !== current).map((s) => (
          <button
            key={s}
            onClick={() => onMove(s)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted"
          >
            <span className={`size-1.5 rounded-full ${STAGE_META[s].dotColor}`} />
            {STAGE_META[s].label}
          </button>
        ))}
      </div>
    </div>
  )
}
