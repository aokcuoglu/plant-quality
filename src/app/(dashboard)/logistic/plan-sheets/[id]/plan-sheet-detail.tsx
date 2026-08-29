"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Send, Ban, XCircle, PackagePlus, CalendarClock } from "lucide-react"
import {
  PLAN_SHEET_STATUS,
  PLAN_SHEET_STATUS_COLOR,
  PLAN_SHEET_CHANNEL,
  PLAN_SHEET_LINE_STATUS,
  PLAN_SHEET_LINE_STATUS_COLOR,
} from "@/lib/logistic/plan-sheet"
import { labelForCustomerType, labelForVehicleType, labelForPriority } from "@/lib/logistic/types"
import {
  submitPlanSheet,
  approvePlanSheet,
  rejectPlanSheet,
  cancelPlanSheet,
  setLineForecastDate,
  setLineReviewStatus,
} from "../../plan-sheet-actions"
import type { PlanSheetLineStatus } from "@/generated/prisma/client"
import { DatePicker } from "@/components/ui/date-picker"

interface DetailLine {
  id: string
  sequence: number
  customerName: string
  customerType: string
  country: string | null
  market: string | null
  dealerName: string | null
  distributorName: string | null
  vehicleModel: string
  vehicleVariant: string | null
  vehicleType: string
  powertrain: string | null
  quantity: number
  priority: string
  chassisNumber: string | null
  vin: string | null
  requestedDeliveryDate: string | null
  forecastDispatchDate: string | null
  status: string
  remark: string | null
  orderId: string | null
  generatedAt: string | null
}

interface DetailSheet {
  id: string
  planNumber: string
  title: string
  periodMonth: string
  channel: string
  status: string
  notes: string | null
  createdAt: string
  submittedAt: string | null
  approvedAt: string | null
  rejectedAt: string | null
  createdByName: string
  approvedByName: string | null
  allowedActions: {
    canSubmit: boolean
    canApprove: boolean
    canReject: boolean
    canCancel: boolean
    canEditLines: boolean
  }
  lines: DetailLine[]
}

export function PlanSheetDetail({ sheet }: { sheet: DetailSheet }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [forecastDraft, setForecastDraft] = useState<Record<string, string>>({})

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn()
      if (res?.error) {
        alert(res.error)
        if (rejectOpen) { setRejectOpen(false); setRejectReason("") }
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${PLAN_SHEET_STATUS_COLOR[sheet.status as keyof typeof PLAN_SHEET_STATUS_COLOR]}`}>
              {PLAN_SHEET_STATUS[sheet.status as keyof typeof PLAN_SHEET_STATUS]}
            </span>
            <span className="text-xs text-muted-foreground">{PLAN_SHEET_CHANNEL[sheet.channel as keyof typeof PLAN_SHEET_CHANNEL]}</span>
            <span className="text-xs text-muted-foreground">{sheet.lines.length} satır</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {sheet.allowedActions.canSubmit && (
              <button
                onClick={() => run(() => submitPlanSheet(sheet.id))}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-foreground/90 disabled:opacity-50"
              >
                <Send className="size-3.5" /> İncelemeye Gönder
              </button>
            )}
            {sheet.allowedActions.canApprove && (
              <button
                onClick={() => run(() => approvePlanSheet(sheet.id))}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                <CheckCircle2 className="size-3.5" /> Onayla & Sipariş Üret
              </button>
            )}
            {sheet.allowedActions.canReject && (
              <button
                onClick={() => setRejectOpen((v) => !v)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
              >
                <XCircle className="size-3.5" /> Reddet
              </button>
            )}
            {sheet.allowedActions.canCancel && (
              <button
                onClick={() => run(() => cancelPlanSheet(sheet.id))}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
              >
                <Ban className="size-3.5" /> İptal
              </button>
            )}
          </div>
        </div>

        {rejectOpen && (
          <div className="mt-3 rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Red sebepli açıklama..."
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
              <button
                onClick={() => run(() => rejectPlanSheet(sheet.id, rejectReason))}
                disabled={isPending}
                className="rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                Onayla
              </button>
              <button
                onClick={() => { setRejectOpen(false); setRejectReason("") }}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Vazgeç
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">Araç Satırları</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Şase / VIN</th>
                <th className="px-4 py-3 text-left">Araç</th>
                <th className="px-4 py-3 text-left">Müşteri</th>
                <th className="px-4 py-3 text-left">Öncelik</th>
                <th className="px-4 py-3 text-left">Talep Teslim</th>
                <th className="px-4 py-3 text-left">Öngörü Sevk</th>
                <th className="px-4 py-3 text-left">Durum</th>
                <th className="px-4 py-3 text-left">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sheet.lines.map((line) => (
                <LineRow
                  key={line.id}
                  line={line}
                  canEdit={sheet.allowedActions.canEditLines}
                  isPending={isPending}
                  forecastDraft={forecastDraft[line.id] ?? line.forecastDispatchDate ?? ""}
                  onForecastChange={(date) => setForecastDraft((d) => ({ ...d, [line.id]: date }))}
                  onSaveForecast={() =>
                    run(() => setLineForecastDate(sheet.id, line.id, forecastDraft[line.id] ?? null))
                  }
                  onSetStatus={(status) => run(() => setLineReviewStatus(sheet.id, line.id, status))}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function LineRow({
  line,
  canEdit,
  isPending,
  forecastDraft,
  onForecastChange,
  onSaveForecast,
  onSetStatus,
}: {
  line: DetailLine
  canEdit: boolean
  isPending: boolean
  forecastDraft: string
  onForecastChange: (date: string) => void
  onSaveForecast: () => void
  onSetStatus: (status: PlanSheetLineStatus) => void
}) {
  const canReview = line.status !== "REJECTED" && line.status !== "GENERATED" && !line.orderId
  const changed = forecastDraft !== (line.forecastDispatchDate ?? "")

  return (
    <tr className="hover:bg-muted/50">
      <td className="px-4 py-3 text-sm text-muted-foreground">{line.sequence}</td>
      <td className="px-4 py-3 text-sm">
        <div className="font-mono text-foreground">{line.chassisNumber ?? "--"}</div>
        {line.vin ? <div className="text-[10px] text-muted-foreground">{line.vin}</div> : null}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {line.vehicleModel}
        {line.vehicleVariant ? ` (${line.vehicleVariant})` : ""}
        <div className="text-[10px] text-muted-foreground">{labelForVehicleType(line.vehicleType)}</div>
      </td>
      <td className="px-4 py-3 text-sm">
        <div className="text-foreground">{line.customerName}</div>
        <div className="text-[10px] text-muted-foreground">
          {labelForCustomerType(line.customerType)}
          {line.country ? ` · ${line.country}` : ""}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{labelForPriority(line.priority)}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {line.requestedDeliveryDate ?? "—"}
      </td>
      <td className="px-4 py-3">
        {canEdit ? (
          <div className="flex items-center gap-1">
            <DatePicker
              value={forecastDraft}
              onChange={onForecastChange}
              disabled={isPending}
              placeholder="mm / dd / yyyy"
              className="w-44 rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
            />
            {changed && (
              <button
                onClick={onSaveForecast}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium text-foreground hover:bg-muted"
                title="Öngörü tarihini kaydet"
              >
                <CalendarClock className="size-3.5" />
              </button>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">{line.forecastDispatchDate ?? "—"}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${PLAN_SHEET_LINE_STATUS_COLOR[line.status as keyof typeof PLAN_SHEET_LINE_STATUS_COLOR]}`}>
          {PLAN_SHEET_LINE_STATUS[line.status as keyof typeof PLAN_SHEET_LINE_STATUS]}
        </span>
        {line.orderId && (
          <Link href={`/logistic/orders/${line.orderId}`} className="ml-1 text-[10px] font-medium text-foreground hover:underline">
            Sipariş →
          </Link>
        )}
      </td>
      <td className="px-4 py-3">
        {canReview && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSetStatus("CONFIRMED")}
              disabled={isPending}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-50"
            >
              <CheckCircle2 className="size-3" /> Onayla
            </button>
            <button
              onClick={() => onSetStatus("REJECTED")}
              disabled={isPending}
              className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-[10px] font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
            >
              <XCircle className="size-3" /> Reddet
            </button>
          </div>
        )}
        {line.orderId && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <PackagePlus className="size-3" /> Sipariş oluştu
          </span>
        )}
      </td>
    </tr>
  )
}
