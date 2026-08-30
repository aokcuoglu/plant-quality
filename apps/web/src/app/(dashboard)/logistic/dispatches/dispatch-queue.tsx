"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Ship, Check } from "lucide-react"
import { STAGE_META, type VehicleStage } from "@/lib/logistic/stage"
import { getNextDispatchStatuses, DISPATCH_STATUS_LABELS } from "@/lib/logistic/dispatch-status"
import { createOrUpdateDispatch, changeDispatchStatus } from "../dispatch-actions"
import { DatePicker } from "@/components/ui/date-picker"

export interface QueueItem {
  id: string
  orderNumber: string
  customerName: string
  vehicleModel: string
  vehicleVariant: string | null
  vin: string | null
  chassisNumber: string | null
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT"
  stage: VehicleStage
  yardLocation: string | null
  parkingSlot: string | null
  blockedForDispatch: boolean
  dispatch: {
    id: string
    status: string
    statusLabel: string
    carrierName: string | null
    transportMode: string | null
    plannedLoadingDate: string | null
    estimatedArrivalDate: string | null
  } | null
}

const PRIORITY_BADGE: Record<QueueItem["priority"], string> = {
  LOW: "bg-muted text-muted-foreground",
  NORMAL: "bg-muted text-foreground",
  HIGH: "bg-amber-500/10 text-amber-600",
  URGENT: "bg-destructive/10 text-destructive",
}

export function DispatchQueue({ items, canManage }: { items: QueueItem[]; canManage: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<"all" | "no_dispatch" | "ready" | "intransit">("all")
  const [carrierInput, setCarrierInput] = useState<Record<string, string>>({})
  const [loadingDate, setLoadingDate] = useState<Record<string, string>>({})

  function run(fn: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const res = await fn()
      if (res?.error) alert(res.error)
      router.refresh()
    })
  }

  const filtered = items.filter((it) => {
    if (filter === "no_dispatch") return !it.dispatch
    if (filter === "ready") return it.stage === "READY"
    if (filter === "intransit") return it.dispatch?.status === "IN_TRANSIT"
    return true
  })

  const filterOptions: { value: typeof filter; label: string }[] = [
    { value: "all", label: "Tümü" },
    { value: "no_dispatch", label: "Talep Yok" },
    { value: "ready", label: "Hazır (Sevk Bekleyen)" },
    { value: "intransit", label: "Yolda" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {filterOptions.map((o) => (
          <button
            key={o.value}
            onClick={() => setFilter(o.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === o.value
                ? "bg-foreground text-primary-foreground"
                : "border border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            {o.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} araç</span>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 text-left">Araç</th>
                <th className="px-4 py-3 text-left">Müşteri</th>
                <th className="px-4 py-3 text-left">Konum</th>
                <th className="px-4 py-3 text-left">Sevk Durumu</th>
                <th className="px-4 py-3 text-left">Taşıyıcı</th>
                <th className="px-4 py-3 text-left">Yükleme Planı</th>
                <th className="px-4 py-3 text-left">ETA</th>
                <th className="px-4 py-3 text-left">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((it) => (
                <QueueRow
                  key={it.id}
                  item={it}
                  isPending={isPending}
                  canManage={canManage}
                  carrierInput={carrierInput[it.dispatch?.id ?? it.id] ?? it.dispatch?.carrierName ?? ""}
                  onCarrierChange={(v) => setCarrierInput((d) => ({ ...d, [it.dispatch?.id ?? it.id]: v }))}
                  loadingDate={loadingDate[it.dispatch?.id ?? it.id] ?? it.dispatch?.plannedLoadingDate ?? ""}
                  onLoadingDateChange={(v) => setLoadingDate((d) => ({ ...d, [it.dispatch?.id ?? it.id]: v }))}
                  onRequest={() => run(() => createOrUpdateDispatch(null, it.id, {}))}
                  onAdvance={(status) => run(() => changeDispatchStatus(it.dispatch!.id, status as never))}
                  onSaveCarrier={() =>
                    run(() =>
                      createOrUpdateDispatch(it.dispatch!.id, it.id, {
                        carrierName: carrierInput[it.dispatch!.id] ?? null,
                      })
                    )
                  }
                  onSaveLoadingDate={() =>
                    run(() =>
                      createOrUpdateDispatch(it.dispatch!.id, it.id, {
                        plannedLoadingDate: loadingDate[it.dispatch!.id] ?? null,
                      })
                    )
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function QueueRow({
  item,
  isPending,
  canManage,
  carrierInput,
  onCarrierChange,
  loadingDate,
  onLoadingDateChange,
  onRequest,
  onAdvance,
  onSaveCarrier,
  onSaveLoadingDate,
}: {
  item: QueueItem
  isPending: boolean
  canManage: boolean
  carrierInput: string
  onCarrierChange: (v: string) => void
  loadingDate: string
  onLoadingDateChange: (v: string) => void
  onRequest: () => void
  onAdvance: (status: string) => void
  onSaveCarrier: () => void
  onSaveLoadingDate: () => void
}) {
  const dispatch = item.dispatch
  const nextStatuses = dispatch ? getNextDispatchStatuses(dispatch.status as never) : []
  const stageMeta = STAGE_META[item.stage]

  return (
    <tr className="hover:bg-muted/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${stageMeta.dotColor}`} />
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">{item.orderNumber}</div>
            <div className="text-[11px] text-muted-foreground">
              {item.vehicleModel}
              {item.vehicleVariant ? ` · ${item.vehicleVariant}` : ""}
              {item.chassisNumber ? ` · ${item.chassisNumber}` : ""}
            </div>
          </div>
        </div>
        <div className="mt-0.5">
          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${PRIORITY_BADGE[item.priority]}`}>
            {item.priority}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{item.customerName}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        <div className="text-xs">{stageMeta.label}</div>
        {item.yardLocation && <div className="text-[10px] text-muted-foreground">{item.yardLocation}{item.parkingSlot ? ` / ${item.parkingSlot}` : ""}</div>}
        {item.blockedForDispatch && <div className="text-[10px] text-destructive">Sevk engelli</div>}
      </td>
      <td className="px-4 py-3">
        {dispatch ? (
          <span className="text-xs text-foreground">{dispatch.statusLabel}</span>
        ) : (
          <span className="text-xs text-muted-foreground">Talep yok</span>
        )}
      </td>
      <td className="px-4 py-3">
        {dispatch ? (
          <div className="flex items-center gap-1">
            <input
              value={carrierInput}
              onChange={(e) => onCarrierChange(e.target.value)}
              placeholder="Taşıyıcı"
              disabled={isPending}
              className="w-32 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
            />
            {carrierInput !== (dispatch.carrierName ?? "") && (
              <button onClick={onSaveCarrier} disabled={isPending} className="rounded p-1 text-foreground hover:bg-muted">
                <Check className="size-3.5" />
              </button>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {dispatch ? (
          <div className="flex items-center gap-1">
            <DatePicker
              value={loadingDate}
              onChange={onLoadingDateChange}
              disabled={isPending}
              placeholder="mm / dd / yyyy"
              className="w-40 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
            />
            {loadingDate !== (dispatch.plannedLoadingDate ?? "") && (
              <button onClick={onSaveLoadingDate} disabled={isPending} className="rounded p-1 text-foreground hover:bg-muted">
                <Check className="size-3.5" />
              </button>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {dispatch?.estimatedArrivalDate ? new Date(dispatch.estimatedArrivalDate).toLocaleDateString() : "—"}
      </td>
      <td className="px-4 py-3">
        {!dispatch ? (
          canManage ? (
            <button
              onClick={onRequest}
              disabled={isPending || item.blockedForDispatch}
              className="inline-flex items-center gap-1 rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-foreground/90 disabled:opacity-50"
            >
              <Plus className="size-3.5" /> Talep Oluştur
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )
        ) : canManage ? (
          <div className="flex flex-wrap items-center gap-1">
            {nextStatuses.map((ns) => (
              <button
                key={ns}
                onClick={() => onAdvance(ns)}
                disabled={isPending}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium disabled:opacity-50 ${
                  ns === "CANCELLED"
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "bg-muted text-foreground hover:bg-foreground/20"
                }`}
              >
                <Ship className="size-3" />
                {DISPATCH_STATUS_LABELS[ns as keyof typeof DISPATCH_STATUS_LABELS]}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  )
}
