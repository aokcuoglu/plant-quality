"use client"

import { Label } from "@/components/ui/label"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import { Button } from "@/components/ui/button"

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowUpRight, CheckCircle2, Send, Ban, XCircle, PackagePlus, CalendarClock, Save, MoreHorizontal, GitBranch } from "lucide-react"
import {
  PLAN_SHEET_STATUS,
  PLAN_SHEET_STATUS_COLOR,
  PLAN_SHEET_CHANNEL,
  PLAN_SHEET_LINE_STATUS,
  PLAN_SHEET_LINE_STATUS_COLOR,
  PLAN_SHEET_FORECAST_IN_PAST,
  PLAN_SHEET_FORECAST_REQUIRED,
  PLAN_SHEET_LINE_ALLOWED,
  PLAN_SHEET_LINE_LOCKED,
  PLAN_SHEET_REJECTION_COMMENT_REQUIRED,
  dateOnlyInTimeZone,
  hasForecastDispatchDate,
  isForecastDispatchDateCurrentOrFuture,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAppAlertDialog } from "@/components/ui/app-alert-dialog"

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
  workflow: {
    activeNodeName: string | null
    assignedUserName: string | null
    assignedOrganizationUnitName: string | null
    isAssignee: boolean
  }
  allowedActions: {
    canSubmit: boolean
    canApprove: boolean
    canReject: boolean
    canCancel: boolean
    canEditLines: boolean
    canEditForecast: boolean
    canReviewLines: boolean
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
    <NativeSelect value={value} onChange={(event) => onChange(event.target.value)} className="w-full">
      <NativeSelectOption value="">{t("logistic.dynamicFlow.planSheetSelectCountry")}</NativeSelectOption>
      {value && !hasSelectedCountry && <NativeSelectOption value={value}>{value}</NativeSelectOption>}
      {countries.map((country) => <NativeSelectOption key={country.code} value={country.code}>{country.name} ({country.code})</NativeSelectOption>)}
    </NativeSelect>
  )
}

export function PlanSheetDetail({ sheet }: { sheet: DetailSheet }) {
  const t = useTranslations()
  const { showAlert } = useAppAlertDialog()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [completeReviewOpen, setCompleteReviewOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [forecastDraft, setForecastDraft] = useState<Record<string, string>>({})
  const approvedLineCount = sheet.lines.filter((line) => line.status === "CONFIRMED").length
  const rejectedLineCount = sheet.lines.filter((line) => line.status === "REJECTED").length
  const decidedLineCount = approvedLineCount + rejectedLineCount
  const pendingLineCount = sheet.lines.length - decidedLineCount
  const canCompleteReview = pendingLineCount === 0

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn()
      if (res?.error) {
        const workflowErrors: Record<string, string> = {
          WORKFLOW_ACTION_FORBIDDEN: t("logistic.workflow.errors.actionForbidden"),
          WORKFLOW_TASK_STALE: t("logistic.workflow.errors.taskStale"),
          PLAN_SHEET_LINES_PENDING: t("logistic.workflow.errors.linesPending"),
          [PLAN_SHEET_FORECAST_IN_PAST]: t("logistic.workflow.errors.forecastInPast"),
          [PLAN_SHEET_FORECAST_REQUIRED]: t("logistic.workflow.errors.forecastRequired"),
          [PLAN_SHEET_LINE_LOCKED]: t("logistic.workflow.errors.lineLocked"),
          [PLAN_SHEET_REJECTION_COMMENT_REQUIRED]: t("logistic.workflow.errors.rejectionCommentRequired"),
        }
        showAlert(workflowErrors[res.error] ?? res.error)
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
              <Button
                onClick={() => run(() => submitPlanSheet(sheet.id))}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-foreground/90 disabled:opacity-50"
              >
                <Send className="size-3.5" /> İncelemeye Gönder
              </Button>
            )}
            {sheet.allowedActions.canApprove && (
              <Button
                onClick={() => setCompleteReviewOpen(true)}
                disabled={isPending || !canCompleteReview}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
              >
                <CheckCircle2 className="size-3.5" /> {t("logistic.dynamicFlow.planSheetCompleteReview")}
              </Button>
            )}
            {sheet.allowedActions.canReject && (
              <Button
                onClick={() => setRejectOpen((v) => !v)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
              >
                <XCircle className="size-3.5" /> Reddet
              </Button>
            )}
            {sheet.allowedActions.canCancel && (
              <Button
                onClick={() => run(() => cancelPlanSheet(sheet.id))}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
              >
                <Ban className="size-3.5" /> İptal
              </Button>
            )}
          </div>
        </div>

        {sheet.allowedActions.canApprove && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium text-foreground">
                {t("logistic.dynamicFlow.planSheetReviewProgress", {
                  decided: decidedLineCount,
                  total: sheet.lines.length,
                })}
              </span>
              <span className="text-muted-foreground">
                {t("logistic.dynamicFlow.planSheetDecisionSummary", {
                  approved: approvedLineCount,
                  rejected: rejectedLineCount,
                })}
              </span>
            </div>
            <span className={canCompleteReview ? "text-emerald-500" : "text-muted-foreground"}>
              {canCompleteReview
                ? t("logistic.dynamicFlow.planSheetDecisionsAutoSaved")
                : t("logistic.dynamicFlow.planSheetPendingDecisionCount", { count: pendingLineCount })}
            </span>
          </div>
        )}

        {sheet.workflow.activeNodeName && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs">
            <GitBranch className="size-4 text-emerald-500" />
            <span className="font-medium text-foreground">
              {t("logistic.workflow.activeTask")}: {sheet.workflow.activeNodeName}
            </span>
            <span className="text-muted-foreground">
              {t("logistic.workflow.assignee")}: {[sheet.workflow.assignedOrganizationUnitName, sheet.workflow.assignedUserName].filter(Boolean).join(" · ") || t("logistic.workflow.unassigned")}
            </span>
            <span className={sheet.workflow.isAssignee ? "text-emerald-500" : "text-muted-foreground"}>
              {sheet.workflow.isAssignee
                ? t("logistic.workflow.yourTask")
                : t("logistic.workflow.readOnlyTask")}
            </span>
          </div>
        )}

        {rejectOpen && (
          <div className="mt-3 rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Red sebepli açıklama..."
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
              <Button
                onClick={() => run(() => rejectPlanSheet(sheet.id, rejectReason))}
                disabled={isPending}
                className="rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                Onayla
              </Button>
              <Button
                onClick={() => { setRejectOpen(false); setRejectReason("") }}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Vazgeç
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">{t("logistic.dynamicFlow.orderLines")}</h2>
        </div>
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-b text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <TableHead className="px-4 py-3 text-left">#</TableHead>
                <TableHead className="px-4 py-3 text-left">Şase / VIN</TableHead>
                <TableHead className="px-4 py-3 text-left">Araç</TableHead>
                <TableHead className="px-4 py-3 text-left">Müşteri</TableHead>
                <TableHead className="px-4 py-3 text-left">Öncelik</TableHead>
                <TableHead className="px-4 py-3 text-left">Talep Teslim</TableHead>
                <TableHead className="px-4 py-3 text-left">Öngörü Sevk</TableHead>
                <TableHead className="px-4 py-3 text-left">Durum</TableHead>
                <TableHead className="min-w-32 px-4 py-3 text-left">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {sheet.lines.map((line) => (
                <LineRow
                  key={line.id}
                  line={line}
                  canEdit={sheet.allowedActions.canEditLines}
                  canEditForecast={sheet.allowedActions.canEditForecast}
                  canReviewLines={sheet.allowedActions.canReviewLines}
                  isPending={isPending}
                  forecastDraft={forecastDraft[line.id] ?? line.forecastDispatchDate ?? ""}
                  onForecastChange={(date) => setForecastDraft((d) => ({ ...d, [line.id]: date }))}
                  onSaveForecast={(date) =>
                    run(() => setLineForecastDate(sheet.id, line.id, date || null))
                  }
                  onConfirm={() => run(() => setLineReviewStatus(sheet.id, line.id, "CONFIRMED"))}
                  onReject={(comment) => run(() => setLineReviewStatus(sheet.id, line.id, "REJECTED", comment))}
                  onSaveVehicle={(input) => run(() => updatePlanSheetLine(sheet.id, line.id, input))}
                  catalogModels={sheet.catalogModels}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <AlertDialog open={completeReviewOpen} onOpenChange={setCompleteReviewOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("logistic.dynamicFlow.planSheetCompleteReviewTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("logistic.dynamicFlow.planSheetCompleteReviewDescription", {
                approved: approvedLineCount,
                rejected: rejectedLineCount,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setCompleteReviewOpen(false)} disabled={isPending}>
              {t("common.cancel")}
            </Button>
            <AlertDialogAction
              className="bg-emerald-500 text-primary-foreground hover:bg-emerald-500/90"
              disabled={isPending || !canCompleteReview}
              onClick={() => run(() => approvePlanSheet(sheet.id))}
            >
              <PackagePlus className="size-3.5" />
              {t("logistic.dynamicFlow.planSheetCompleteReviewAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  onConfirm,
  onReject,
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
  onSaveForecast: (date: string) => void
  onConfirm: () => void
  onReject: (comment: string) => void
  onSaveVehicle: (input: VehicleLineUpdateInput) => void
  catalogModels: { name: string; groupCode: string }[]
}) {
  const t = useTranslations()
  const [editing, setEditing] = useState(false)
  const [forecastEditing, setForecastEditing] = useState(false)
  const [forecastRevision, setForecastRevision] = useState(line.forecastDispatchDate ?? "")
  const [rejecting, setRejecting] = useState(false)
  const [rejectionComment, setRejectionComment] = useState("")
  const [draft, setDraft] = useState<VehicleLineUpdateInput>(() => ({
    identifier: line.chassisNumber ?? line.vin,
    customerName: line.customerName,
    country: line.country,
    vehicleModel: line.vehicleModel,
    priority: line.priority as VehicleLineUpdateInput["priority"],
    requestedDeliveryDate: line.requestedDeliveryDate,
  }))
  const lineStatus = line.status as keyof typeof PLAN_SHEET_LINE_STATUS
  const canReview = canReviewLines && PLAN_SHEET_LINE_ALLOWED.review(lineStatus) && !line.orderId
  const canEnterForecast = canEditForecast && line.status === "SUBMITTED" && !line.orderId
  const canReviseForecast = canEditForecast && PLAN_SHEET_LINE_ALLOWED.reviseForecast(lineStatus) && !line.orderId
  const canEditVehicle = canEdit && !line.orderId && line.status !== "REJECTED" && line.status !== "GENERATED"
  const hasRowActions = canEditVehicle || canReview || canReviseForecast
  const minimumForecastDate = dateOnlyInTimeZone()
  const hasForecastDate = hasForecastDispatchDate(line.forecastDispatchDate)
  const hasValidForecastDate = isForecastDispatchDateCurrentOrFuture(
    line.forecastDispatchDate,
    minimumForecastDate,
  )

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

  function startForecastEditing() {
    setForecastRevision(line.forecastDispatchDate ?? "")
    setForecastEditing(true)
  }

  function startRejecting() {
    setRejectionComment("")
    setRejecting(true)
  }

  return (
    <>
    <TableRow className="hover:bg-muted/50">
      <TableCell className="px-4 py-3 text-sm text-muted-foreground">{line.sequence}</TableCell>
      <TableCell className="px-4 py-3 text-sm">
        <div className="font-mono text-foreground">{line.chassisNumber ?? line.vin ?? ""}</div>
      </TableCell>
      <TableCell className="px-4 py-3 text-sm text-muted-foreground">
        <>
          {line.vehicleModel}
          {line.vehicleVariant ? ` (${line.vehicleVariant})` : ""}
          <div className="text-[10px] text-muted-foreground">{labelForVehicleType(line.vehicleType)} · {line.quantity}</div>
        </>
      </TableCell>
      <TableCell className="px-4 py-3 text-sm">
        <div className="text-foreground">{line.customerName}</div>
        <div className="text-[10px] text-muted-foreground">
          {labelForCustomerType(line.customerType)}
          {line.country ? ` · ${line.country}` : ""}
        </div>
      </TableCell>
      <TableCell className="px-4 py-3 text-sm text-muted-foreground">{labelForPriority(line.priority)}</TableCell>
      <TableCell className="px-4 py-3 text-sm text-muted-foreground">
        {line.requestedDeliveryDate ?? "—"}
      </TableCell>
      <TableCell className="px-4 py-3">
        {canEnterForecast ? (
          <DatePicker
            value={forecastDraft}
            onChange={(date) => {
              onForecastChange(date)
              onSaveForecast(date)
            }}
            disabled={isPending}
            minDate={minimumForecastDate}
            placeholder={t("logistic.dynamicFlow.planSheetDatePlaceholder")}
            className="w-44 rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
          />
        ) : (
          <span className="text-sm text-muted-foreground">{line.forecastDispatchDate ?? "—"}</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-3">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${PLAN_SHEET_LINE_STATUS_COLOR[line.status as keyof typeof PLAN_SHEET_LINE_STATUS_COLOR]}`}>
          {PLAN_SHEET_LINE_STATUS[line.status as keyof typeof PLAN_SHEET_LINE_STATUS]}
        </span>
      </TableCell>
      <TableCell className="px-4 py-3">
        {line.orderId ? (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/logistic/orders/${line.orderId}`} />}
          >
            {t("logistic.dynamicFlow.planSheetOpenOrder")}
            <ArrowUpRight data-icon="inline-end" />
          </Button>
        ) : hasRowActions ? (
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
              {canReviseForecast && (
                <DropdownMenuItem onClick={startForecastEditing}>
                  <CalendarClock className="size-3.5" /> {t("common.edit")}
                </DropdownMenuItem>
              )}
              {canReview && (
                <>
                  <DropdownMenuItem
                    disabled={!hasValidForecastDate}
                    onClick={onConfirm}
                  >
                    <CheckCircle2 className="size-3.5 text-emerald-600" /> {t("logistic.dynamicFlow.planSheetConfirmLine")}
                  </DropdownMenuItem>
                  {!hasValidForecastDate && (
                    <div className="px-1.5 py-1 text-xs text-muted-foreground">
                      {t(hasForecastDate
                        ? "logistic.workflow.errors.forecastInPast"
                        : "logistic.workflow.errors.forecastRequired")}
                    </div>
                  )}
                  <DropdownMenuItem variant="destructive" onClick={startRejecting}>
                    <XCircle className="size-3.5" /> {t("logistic.dynamicFlow.planSheetRejectLine")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
    <Dialog open={editing} onOpenChange={setEditing}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("logistic.dynamicFlow.planSheetEditLineTitle")}</DialogTitle>
          <DialogDescription>{t("logistic.dynamicFlow.planSheetEditLineDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Label className="space-y-1.5 text-sm text-foreground">
            <span>{t("logistic.dynamicFlow.planSheetIdentifier")}</span>
            <Input value={draft.identifier ?? ""} onChange={(e) => setDraft({ ...draft, identifier: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </Label>
          <Label className="space-y-1.5 text-sm text-foreground">
            <span>{t("logistic.dynamicFlow.vehicle")}</span>
            <NativeSelect value={draft.vehicleModel} onChange={(e) => setDraft({ ...draft, vehicleModel: e.target.value })} className="w-full">
              {catalogModels.map((model) => <NativeSelectOption key={model.name} value={model.name}>{model.name}</NativeSelectOption>)}
            </NativeSelect>
          </Label>
          <Label className="space-y-1.5 text-sm text-foreground sm:col-span-2">
            <span>{t("logistic.dynamicFlow.customer")}</span>
            <Input value={draft.customerName} onChange={(e) => setDraft({ ...draft, customerName: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </Label>
          <Label className="space-y-1.5 text-sm text-foreground">
            <span>{t("logistic.dynamicFlow.country")}</span>
            <CountrySelect value={draft.country ?? ""} onChange={(country) => setDraft({ ...draft, country: country || null })} />
          </Label>
          <Label className="space-y-1.5 text-sm text-foreground">
            <span>{t("logistic.dynamicFlow.priority")}</span>
            <NativeSelect value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as VehicleLineUpdateInput["priority"] })} className="w-full">
              {PRIORITY_OPTIONS.map((option) => <NativeSelectOption key={option.value} value={option.value}>{t(`logistic.dynamicFlow.priorities.${option.value}`)}</NativeSelectOption>)}
            </NativeSelect>
          </Label>
          <Label className="space-y-1.5 text-sm text-foreground sm:col-span-2">
            <span>{t("logistic.dynamicFlow.requestedDelivery")}</span>
            <DatePicker value={draft.requestedDeliveryDate ?? ""} onChange={(date) => setDraft({ ...draft, requestedDeliveryDate: date || null })} placeholder="mm / dd / yyyy" />
          </Label>
        </div>
        <DialogFooter>
          <Button onClick={() => setEditing(false)} disabled={isPending} className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">{t("common.cancel")}</Button>
          <Button onClick={() => { onSaveVehicle(draft); setEditing(false) }} disabled={isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            <Save className="size-3.5" /> {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={forecastEditing} onOpenChange={setForecastEditing}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("logistic.dynamicFlow.planSheetReviseForecastTitle")}</DialogTitle>
          <DialogDescription>{t("logistic.dynamicFlow.planSheetReviseForecastDescription")}</DialogDescription>
        </DialogHeader>
        <Label className="flex-col items-stretch gap-1.5 text-sm text-foreground">
          <span>{t("logistic.dynamicFlow.planSheetForecastDispatchDate")}</span>
          <DatePicker
            value={forecastRevision}
            onChange={(date) => {
              setForecastRevision(date)
              if (!date) return
              if (date !== line.forecastDispatchDate) onSaveForecast(date)
              setForecastEditing(false)
            }}
            disabled={isPending}
            minDate={minimumForecastDate}
            clearable={false}
            placeholder={t("logistic.dynamicFlow.planSheetDatePlaceholder")}
          />
        </Label>
        <DialogFooter>
          <Button variant="outline" onClick={() => setForecastEditing(false)} disabled={isPending}>
            {t("common.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={rejecting} onOpenChange={setRejecting}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("logistic.dynamicFlow.planSheetRejectLineTitle")}</DialogTitle>
          <DialogDescription>{t("logistic.dynamicFlow.planSheetRejectLineDescription")}</DialogDescription>
        </DialogHeader>
        <Label className="space-y-1.5 text-sm text-foreground">
          <span>{t("logistic.dynamicFlow.planSheetRejectionComment")}</span>
          <Textarea
            value={rejectionComment}
            onChange={(event) => setRejectionComment(event.target.value)}
            placeholder={t("logistic.dynamicFlow.planSheetRejectionCommentPlaceholder")}
            disabled={isPending}
            aria-invalid={rejectionComment.length > 0 && !rejectionComment.trim()}
          />
        </Label>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRejecting(false)} disabled={isPending}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => { onReject(rejectionComment.trim()); setRejecting(false) }}
            disabled={isPending || !rejectionComment.trim()}
          >
            <XCircle className="size-3.5" /> {t("logistic.dynamicFlow.planSheetRejectLine")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
