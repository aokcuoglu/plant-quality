"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Send, Ban, XCircle, PackagePlus, CalendarClock, Save, MoreHorizontal } from "lucide-react"
import {
  PLAN_SHEET_STATUS,
  PLAN_SHEET_STATUS_COLOR,
  PLAN_SHEET_CHANNEL,
  PLAN_SHEET_LINE_STATUS,
  PLAN_SHEET_LINE_STATUS_COLOR,
} from "@/lib/logistic/plan-sheet"
import { labelForCustomerType, labelForVehicleType, labelForPriority, PRIORITY_OPTIONS } from "@/lib/logistic/types"
import {
  submitPlanSheet,
  approvePlanSheet,
  rejectPlanSheet,
  cancelPlanSheet,
  setLineForecastDate,
  setLineReviewStatus,
  updatePlanSheetLine,
} from "../../plan-sheet-actions"
import type { VehicleLineUpdateInput } from "../../plan-sheet-actions"
import type { PlanSheetLineStatus } from "@plantx/db/client"
import { DatePicker } from "@/components/ui/date-picker"
import { useTranslations } from "@/i18n/context"
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
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
    canEditForecast: boolean
  }
  lines: DetailLine[]
  catalogModels: { name: string; groupCode: string }[]
}

interface CountryOption {
  code: string
  name: string
}

let countryOptionsRequest: Promise<CountryOption[]> | null = null

function loadCountryOptions(): Promise<CountryOption[]> {
  if (!countryOptionsRequest) {
    countryOptionsRequest = fetch("/api/logistic/countries")
      .then((response) => response.ok ? response.json() as Promise<unknown> : [])
      .then((data) => Array.isArray(data)
        ? data.flatMap((item) => {
            if (!item || typeof item !== "object") return []
            const country = item as { code?: unknown; name?: unknown }
            return typeof country.code === "string" && typeof country.name === "string"
              ? [{ code: country.code, name: country.name }]
              : []
          })
        : [])
      .catch(() => [])
  }
  return countryOptionsRequest
}

function CountrySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = useTranslations()
  const [countries, setCountries] = useState<CountryOption[]>([])

  useEffect(() => {
    let cancelled = false
    loadCountryOptions().then((options) => { if (!cancelled) setCountries(options) })
    return () => { cancelled = true }
  }, [])

  const hasSelectedCountry = countries.some((country) => country.code === value)

  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
      <option value="">{t("logistic.dynamicFlow.planSheetSelectCountry")}</option>
      {value && !hasSelectedCountry && <option value={value}>{value}</option>}
      {countries.map((country) => <option key={country.code} value={country.code}>{country.name} ({country.code})</option>)}
    </select>
  )
}

export function PlanSheetDetail({ sheet }: { sheet: DetailSheet }) {
  const t = useTranslations()
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
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
          <h2 className="text-sm font-medium text-foreground">{t("logistic.dynamicFlow.orderLines")}</h2>
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
                  canEditForecast={sheet.allowedActions.canEditForecast}
                  canReviewLines={sheet.allowedActions.canApprove}
                  isPending={isPending}
                  forecastDraft={forecastDraft[line.id] ?? line.forecastDispatchDate ?? ""}
                  onForecastChange={(date) => setForecastDraft((d) => ({ ...d, [line.id]: date }))}
                  onSaveForecast={() =>
                    run(() => setLineForecastDate(sheet.id, line.id, forecastDraft[line.id] ?? null))
                  }
                  onSetStatus={(status) => run(() => setLineReviewStatus(sheet.id, line.id, status))}
                  onSaveVehicle={(input) => run(() => updatePlanSheetLine(sheet.id, line.id, input))}
                  catalogModels={sheet.catalogModels}
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
  canEditForecast,
  canReviewLines,
  isPending,
  forecastDraft,
  onForecastChange,
  onSaveForecast,
  onSetStatus,
  onSaveVehicle,
  catalogModels,
}: {
  line: DetailLine
  canEdit: boolean
  canEditForecast: boolean
  canReviewLines: boolean
  isPending: boolean
  forecastDraft: string
  onForecastChange: (date: string) => void
  onSaveForecast: () => void
  onSetStatus: (status: PlanSheetLineStatus) => void
  onSaveVehicle: (input: VehicleLineUpdateInput) => void
  catalogModels: { name: string; groupCode: string }[]
}) {
  const t = useTranslations()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<VehicleLineUpdateInput>(() => ({
    identifier: line.chassisNumber ?? line.vin,
    customerName: line.customerName,
    country: line.country,
    vehicleModel: line.vehicleModel,
    priority: line.priority as VehicleLineUpdateInput["priority"],
    requestedDeliveryDate: line.requestedDeliveryDate,
  }))
  const canReview = canReviewLines && line.status !== "REJECTED" && line.status !== "GENERATED" && !line.orderId
  const changed = forecastDraft !== (line.forecastDispatchDate ?? "")
  const canEditVehicle = canEdit && !line.orderId && line.status !== "REJECTED" && line.status !== "GENERATED"

  function startEditing() {
    setDraft({
      identifier: line.chassisNumber ?? line.vin,
      customerName: line.customerName,
      country: line.country,
      vehicleModel: line.vehicleModel,
      priority: line.priority as VehicleLineUpdateInput["priority"],
      requestedDeliveryDate: line.requestedDeliveryDate,
    })
    setEditing(true)
  }

  return (
    <>
    <tr className="hover:bg-muted/50">
      <td className="px-4 py-3 text-sm text-muted-foreground">{line.sequence}</td>
      <td className="px-4 py-3 text-sm">
        <div className="font-mono text-foreground">{line.chassisNumber ?? line.vin ?? ""}</div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        <>
          {line.vehicleModel}
          {line.vehicleVariant ? ` (${line.vehicleVariant})` : ""}
          <div className="text-[10px] text-muted-foreground">{labelForVehicleType(line.vehicleType)} · {line.quantity}</div>
        </>
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
        {canEditForecast ? (
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
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t("common.actions")}
            disabled={isPending}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-36">
            {canEditVehicle && (
              <DropdownMenuItem onClick={startEditing}>
                {t("common.edit")}
              </DropdownMenuItem>
            )}
            {canReviewLines && canReview && (
              <>
                <DropdownMenuItem onClick={() => onSetStatus("CONFIRMED")}>
                  <CheckCircle2 className="size-3.5 text-emerald-600" /> {t("logistic.dynamicFlow.planSheetConfirmLine")}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => onSetStatus("REJECTED")}>
                  <XCircle className="size-3.5" /> {t("logistic.dynamicFlow.planSheetRejectLine")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {line.orderId && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <PackagePlus className="size-3" /> Sipariş oluştu
          </span>
        )}
      </td>
    </tr>
    <Dialog open={editing} onOpenChange={setEditing}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("logistic.dynamicFlow.planSheetEditLineTitle")}</DialogTitle>
          <DialogDescription>{t("logistic.dynamicFlow.planSheetEditLineDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm text-foreground">
            <span>{t("logistic.dynamicFlow.planSheetIdentifier")}</span>
            <input value={draft.identifier ?? ""} onChange={(e) => setDraft({ ...draft, identifier: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </label>
          <label className="space-y-1.5 text-sm text-foreground">
            <span>{t("logistic.dynamicFlow.vehicle")}</span>
            <select value={draft.vehicleModel} onChange={(e) => setDraft({ ...draft, vehicleModel: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              {catalogModels.map((model) => <option key={model.name} value={model.name}>{model.name}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-sm text-foreground sm:col-span-2">
            <span>{t("logistic.dynamicFlow.customer")}</span>
            <input value={draft.customerName} onChange={(e) => setDraft({ ...draft, customerName: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </label>
          <label className="space-y-1.5 text-sm text-foreground">
            <span>{t("logistic.dynamicFlow.country")}</span>
            <CountrySelect value={draft.country ?? ""} onChange={(country) => setDraft({ ...draft, country: country || null })} />
          </label>
          <label className="space-y-1.5 text-sm text-foreground">
            <span>{t("logistic.dynamicFlow.priority")}</span>
            <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as VehicleLineUpdateInput["priority"] })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              {PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(`logistic.dynamicFlow.priorities.${option.value}`)}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-sm text-foreground sm:col-span-2">
            <span>{t("logistic.dynamicFlow.requestedDelivery")}</span>
            <DatePicker value={draft.requestedDeliveryDate ?? ""} onChange={(date) => setDraft({ ...draft, requestedDeliveryDate: date || null })} placeholder="mm / dd / yyyy" />
          </label>
        </div>
        <DialogFooter>
          <button onClick={() => setEditing(false)} disabled={isPending} className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">{t("common.cancel")}</button>
          <button onClick={() => { onSaveVehicle(draft); setEditing(false) }} disabled={isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            <Save className="size-3.5" /> {t("common.save")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
