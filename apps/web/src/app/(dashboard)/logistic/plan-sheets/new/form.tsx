"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Upload, FileDown } from "lucide-react"
import {
  CUSTOMER_TYPE_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
} from "@/lib/logistic/types"
import { createPlanSheet } from "../../plan-sheet-actions"
import { DatePicker } from "@/components/ui/date-picker"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTranslations } from "@/i18n/context"

interface PlanLine {
  customerName: string
  customerType: string
  country: string
  dealerName: string
  distributorName: string
  vehicleModel: string
  vehicleType: string
  priority: string
  vin: string
  requestedDeliveryDate: string
  remark: string
}

interface CatalogGroup {
  code: string
  name: string
  models: { name: string; groupCode: string }[]
}

function emptyLine(): PlanLine {
  return {
    customerName: "",
    customerType: "CUSTOMER",
    country: "",
    dealerName: "",
    distributorName: "",
    vehicleModel: "",
    vehicleType: "BUS",
    priority: "NORMAL",
    vin: "",
    requestedDeliveryDate: "",
    remark: "",
  }
}

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
const labelCls = "mb-1 block text-xs text-muted-foreground"

const FIELD_ALIASES: Record<string, keyof PlanLine> = {
  customername: "customerName",
  customer: "customerName",
  müşteri: "customerName",
  musteri: "customerName",
  müşteriadı: "customerName",
  musteriadi: "customerName",
  vehiclemodel: "vehicleModel",
  vehicle: "vehicleModel",
  araçmodeli: "vehicleModel",
  arcmodeli: "vehicleModel",
  aracadi: "vehicleModel",
  aracmodeli: "vehicleModel",
  araçadı: "vehicleModel",
  model: "vehicleModel",
  customertype: "customerType",
  müşteritipi: "customerType",
  musteritipi: "customerType",
  vin: "vin",
  priority: "priority",
  öncelik: "priority",
  oncelik: "priority",
  country: "country",
  ülke: "country",
  ulke: "country",
  dealer: "dealerName",
  dealername: "dealerName",
  distributor: "distributorName",
  distributorname: "distributorName",
  bayidistadi: "customerName",
  bayidistributoradi: "customerName",
  requesteddeliverydate: "requestedDeliveryDate",
  requesteddelivery: "requestedDeliveryDate",
  talep: "requestedDeliveryDate",
  teslimtarihi: "requestedDeliveryDate",
  ongorusevktarihi: "requestedDeliveryDate",
  öngörüsevktarihi: "requestedDeliveryDate",
  vehicletype: "vehicleType",
  araçtipi: "vehicleType",
  arctipi: "vehicleType",
  aracgrubu: "vehicleType",
  remark: "remark",
  açıklama: "remark",
  aciklama: "remark",
  not: "remark",
}

const DEFAULT_FIELD_ORDER: (keyof PlanLine)[] = [
  "vin",
  "vehicleModel",
  "customerName",
  "vehicleType",
  "country",
  "requestedDeliveryDate",
  "customerType",
  "priority",
  "remark",
]

function normalizeKey(v: string): string {
  return v.toLowerCase().trim().replace(/[\s_.-]/g, "")
}

function normalizeEnum(val: string, allowed: readonly string[], fallback: string): string {
  const norm = val.toLowerCase().trim()
  const direct = allowed.find((a) => a.toLowerCase() === norm)
  if (direct) return direct
  const byLabel = allowed.find(
    (a) => a.replace(/_/g, " ").toLowerCase() === norm || a.toLowerCase().replace(/_/g, "") === norm
  )
  return byLabel ?? fallback
}

function normalizeDate(val: string): string {
  const d = val.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  const m = d.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/)
  if (!m) return d
  const first = Number(m[1])
  const second = Number(m[2])
  let day = 0
  let month = 0
  let year = m[3]
  if (year.length === 2) year = `20${year}`
  if (first > 12) {
    day = first
    month = second
  } else if (second > 12) {
    day = second
    month = first
  } else {
    month = first
    day = second
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function parseCsvRows(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

  const firstLine = text.split(/\r?\n/, 1)[0] ?? ""
  const candidates: [string, number][] = [
    [",", (firstLine.match(/,/g) ?? []).length],
    [";", (firstLine.match(/;/g) ?? []).length],
    ["\t", (firstLine.match(/\t/g) ?? []).length],
  ]
  const delim = candidates.reduce((a, b) => (b[1] > a[1] ? b : a))[0]

  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === delim) {
      row.push(field)
      field = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      field = ""
      if (row.some((cell) => cell.trim() !== "")) rows.push(row)
      row = []
    } else {
      field += c
    }
  }
  if (field !== "" || row.length) {
    row.push(field)
    if (row.some((cell) => cell.trim() !== "")) rows.push(row)
  }
  return rows
}

function parseLineCsv(text: string, catalogModels: { name: string; groupCode: string }[]): PlanLine[] {
  const rows = parseCsvRows(text).filter((row) => !row[0]?.trim().startsWith("#"))
  if (rows.length === 0) return []

  const header = rows[0]
  const headerIsHeader = header.some((cell) => FIELD_ALIASES[normalizeKey(cell)] !== undefined)

  const dataRowStart = headerIsHeader ? 1 : 0
  const mapping: Record<number, keyof PlanLine> = headerIsHeader
    ? header.reduce((acc, cell, idx) => {
        const key = FIELD_ALIASES[normalizeKey(cell)]
        if (key) acc[idx] = key
        return acc
      }, {} as Record<number, keyof PlanLine>)
    : DEFAULT_FIELD_ORDER.reduce((acc, key, idx) => {
        acc[idx] = key
        return acc
      }, {} as Record<number, keyof PlanLine>)

  const out: PlanLine[] = []
  for (let r = dataRowStart; r < rows.length; r++) {
    const row = rows[r]
    const line = emptyLine()
    let hasData = false
    for (const [idxStr, key] of Object.entries(mapping)) {
      const idx = Number(idxStr)
      const val = (row[idx] ?? "").trim()
      if (!val) continue
      hasData = true
      if (key === "requestedDeliveryDate") {
        line.requestedDeliveryDate = normalizeDate(val)
      } else if (key === "priority") {
        line.priority = normalizeEnum(val, PRIORITY_OPTIONS.map((o) => o.value), "NORMAL")
      } else if (key === "customerType") {
        line.customerType = normalizeEnum(val, CUSTOMER_TYPE_OPTIONS.map((o) => o.value), "CUSTOMER")
      } else if (key === "vehicleType") {
        line.vehicleType = normalizeEnum(val, VEHICLE_TYPE_OPTIONS.map((o) => o.value), "BUS")
      } else {
        line[key] = val
      }
    }
    const catalogModel = catalogModels.find((model) => model.name.toLocaleLowerCase() === line.vehicleModel.toLocaleLowerCase())
    if (catalogModel && !Object.values(mapping).includes("vehicleType")) line.vehicleType = catalogModel.groupCode
    if (hasData && (line.customerName || line.vehicleModel)) {
      out.push(line)
    }
  }
  return out
}

function downloadCsv() {
  const csv = [
    "vin,arac_modeli,bayi_dist_adi,arac_grubu,ulke,ongoru_sevk_tarihi,musteri_tipi,oncelik,aciklama",
    "LZG12345678901234,,Acme Lojistik,,DE,2026-09-25,CUSTOMER,NORMAL,",
  ].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "plan-sheet-template.csv"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

interface CountryOption { code: string; name: string }

let countriesRequest: Promise<CountryOption[]> | null = null

function loadCountries(): Promise<CountryOption[]> {
  if (!countriesRequest) {
    countriesRequest = fetch("/api/logistic/countries")
      .then((response) => {
        if (!response.ok) throw new Error(`Countries endpoint returned ${response.status}`)
        return response.json() as Promise<unknown>
      })
      .then((data) => {
        if (!Array.isArray(data)) return []
        return data.flatMap((item) => {
          if (!item || typeof item !== "object") return []
          const record = item as { code?: unknown; name?: unknown }
          const code = typeof record.code === "string" ? record.code : ""
          const name = typeof record.name === "string" ? record.name : ""
          return code && typeof name === "string" ? [{ code, name }] : []
        }).sort((a, b) => a.name.localeCompare(b.name, "tr"))
      })
      .catch(() => [])
  }
  return countriesRequest
}

function CountryCombobox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = useTranslations()
  const rootRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [countries, setCountries] = useState<CountryOption[]>([])
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    let cancelled = false
    loadCountries().then((options) => { if (!cancelled) setCountries(options) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !popupRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [open])

  const filtered = countries.filter((country) => `${country.name} ${country.code}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 80)
  return <div ref={rootRef} className="relative min-w-36">
    <button type="button" className="w-full truncate bg-transparent px-2 py-2 text-left text-sm text-foreground outline-none hover:bg-muted/40" onClick={() => { setRect(rootRef.current?.getBoundingClientRect() ?? null); setOpen((current) => !current) }}>
      {countries.find((country) => country.code === value)?.name ?? (value || t("logistic.dynamicFlow.planSheetSelectCountry"))}
    </button>
    {open && rect && typeof document !== "undefined" && createPortal(
      <div ref={popupRef} className="z-50 w-64 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-md" style={{ position: "fixed", top: rect.bottom + 4, left: rect.left }}>
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("logistic.dynamicFlow.planSheetSearchCountry")} className="mb-2 w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none" />
        <div className="max-h-56 overflow-y-auto">{filtered.map((country) => <button type="button" key={country.code} className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={() => { onChange(country.code); setOpen(false); setQuery("") }}>{country.name} ({country.code})</button>)}{filtered.length === 0 && <p className="px-2 py-2 text-sm text-muted-foreground">{t("logistic.dynamicFlow.planSheetCountryNotFound")}</p>}</div>
      </div>, document.body,
    )}
  </div>
}

export function PlanSheetForm({ defaultMonth, catalog }: { defaultMonth: string; catalog: CatalogGroup[] }) {
  const t = useTranslations()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState("")
  const [periodMonth, setPeriodMonth] = useState(defaultMonth)
  const [channel, setChannel] = useState<"EXPORT" | "DOMESTIC">("EXPORT")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<PlanLine[]>([emptyLine()])
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cellRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | HTMLButtonElement | null>>({})
  const catalogModels = useMemo(() => catalog.flatMap((group) => group.models), [catalog])

  function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseLineCsv(reader.result as string, catalogModels)
      if (parsed.length === 0) {
        setAlertMessage(t("logistic.dynamicFlow.planSheetCsvReadError"))
        return
      }
      setLines(parsed)
      setAlertMessage(t("logistic.dynamicFlow.planSheetCsvLoaded", { count: parsed.length }))
    }
    reader.onerror = () => setAlertMessage(t("logistic.dynamicFlow.planSheetFileReadError"))
    reader.readAsText(file)
  }

  function setLine(index: number, patch: Partial<PlanLine>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  function addLine(focusField: keyof PlanLine = "vehicleModel") {
    const idx = lines.length
    setLines((prev) => [...prev, emptyLine()])
    window.setTimeout(() => cellRefs.current[`${idx}-${focusField}`]?.focus(), 0)
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  function moveFocus(index: number, field: keyof PlanLine, delta: number) {
    const next = index + delta
    if (next < 0) return
    if (next >= lines.length) addLine(field)
    else cellRefs.current[`${next}-${field}`]?.focus()
  }

  function handleCellKeyDown(index: number, field: keyof PlanLine) {
    return (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault()
        moveFocus(index, field, 1)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        moveFocus(index, field, -1)
      } else if (e.key === "Escape") {
        ;(e.currentTarget as HTMLElement).blur()
      }
    }
  }

  function handleSubmit() {
    const valid = lines.filter((l) => l.customerName.trim() && l.vehicleModel.trim())
    if (valid.length === 0) {
      setAlertMessage(t("logistic.dynamicFlow.planSheetRequiredLine"))
      return
    }
    const formData = new FormData()
    formData.set("title", title)
    formData.set("periodMonth", periodMonth)
    formData.set("channel", channel)
    formData.set("notes", notes)
    formData.set("lines", JSON.stringify(valid))

    startTransition(async () => {
      const res = await createPlanSheet(formData)
      if (res?.error) {
        setAlertMessage(res.error)
        return
      }
      router.push("/logistic/plan-sheets")
      router.refresh()
    })
  }

  return (
    <>
      <AlertDialog open={alertMessage !== null} onOpenChange={(open) => !open && setAlertMessage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.info")}</AlertDialogTitle>
            <AlertDialogDescription>{alertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>{t("common.close")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className={labelCls}>Başlık</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="örn. Eylül 2026 İhracat Programı" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Dönem Ayı</label>
            <input type="month" value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Kanal</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value as "EXPORT" | "DOMESTIC")} className={inputCls}>
              <option value="EXPORT">İhracat</option>
              <option value="DOMESTIC">Yurtiçi</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className={labelCls}>Not</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} placeholder="Opsiyonel açıklama..." />
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-foreground">Araç Satırları ({lines.length})</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFilePicked}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Upload className="size-3.5" /> CSV Yükle
            </button>
            <button
              onClick={downloadCsv}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              <FileDown className="size-3.5" /> Şablon
            </button>
            <button
              onClick={() => addLine()}
              className="inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-foreground hover:bg-foreground/20"
            >
              <Plus className="size-3.5" /> Satır Ekle
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="w-10 border-r border-border px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">#</th>
                <th className="min-w-48 border-r border-border px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Araç Modeli *</th>
                <th className="min-w-48 border-r border-border px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Bayi/Dist. Adı *</th>
                <th className="min-w-32 border-r border-border px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Ülke</th>
                <th className="min-w-40 border-r border-border px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Müşteri Tipi</th>
                <th className="min-w-48 border-r border-border px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">VIN</th>
                <th className="min-w-36 border-r border-border px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Araç Grubu</th>
                <th className="min-w-32 border-r border-border px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Öncelik</th>
                <th className="min-w-44 border-r border-border px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Talep Teslim Tarihi</th>
                <th className="min-w-48 border-r border-border px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Açıklama</th>
                <th className="w-10 px-1 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={index} className="border-b border-border/60 last:border-b-0 hover:bg-muted/20">
                  <td className="border-r border-border px-2 py-1 text-center text-xs text-muted-foreground">{index + 1}</td>
                  <td className="border-r border-border p-0">
                    <select value={line.vehicleModel} onChange={(e) => { const model = catalogModels.find((item) => item.name === e.target.value); setLine(index, { vehicleModel: e.target.value, vehicleType: model?.groupCode ?? line.vehicleType }) }} className="w-full bg-transparent px-2 py-2 text-sm text-foreground outline-none focus:bg-muted/40">
                      <option value="">{t("logistic.dynamicFlow.planSheetSelectModel")}</option>
                      {catalog.map((group) => <optgroup key={group.code} label={`${group.name} (${group.code})`}>{group.models.map((model) => <option key={model.name} value={model.name}>{model.name}</option>)}</optgroup>)}
                    </select>
                  </td>
                  <td className="border-r border-border p-0">
                    <input
                      ref={(el) => { cellRefs.current[`${index}-customerName`] = el }}
                      value={line.customerName}
                      onChange={(e) => setLine(index, { customerName: e.target.value })}
                      onKeyDown={handleCellKeyDown(index, "customerName")}
                      className="w-full bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:bg-muted/40"
                    />
                  </td>
                  <td className="border-r border-border p-0"><CountryCombobox value={line.country} onChange={(country) => setLine(index, { country })} /></td>
                  <td className="border-r border-border p-0">
                    <select
                      ref={(el) => { cellRefs.current[`${index}-customerType`] = el }}
                      value={line.customerType}
                      onChange={(e) => setLine(index, { customerType: e.target.value })}
                      className="w-full bg-transparent px-2 py-2 text-sm text-foreground outline-none focus:bg-muted/40"
                    >
                      {CUSTOMER_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="border-r border-border p-0">
                    <input
                      ref={(el) => { cellRefs.current[`${index}-vin`] = el }}
                      value={line.vin}
                      onChange={(e) => setLine(index, { vin: e.target.value })}
                      onKeyDown={handleCellKeyDown(index, "vin")}
                      className="w-full bg-transparent px-2 py-2 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus:bg-muted/40"
                    />
                  </td>
                  <td className="border-r border-border p-0">
                    <select
                      ref={(el) => { cellRefs.current[`${index}-vehicleType`] = el }}
                      value={line.vehicleType}
                      onChange={(e) => {
                        const groupCode = e.target.value
                        const model = catalogModels.find((item) => item.name === line.vehicleModel)
                        setLine(index, {
                          vehicleType: groupCode,
                          vehicleModel: model && model.groupCode !== groupCode ? "" : line.vehicleModel,
                        })
                      }}
                      className="w-full bg-transparent px-2 py-2 text-sm text-foreground outline-none focus:bg-muted/40"
                    >
                      {catalog.map((group) => <option key={group.code} value={group.code}>{group.name}</option>)}
                    </select>
                  </td>
                  <td className="border-r border-border p-0">
                    <select
                      ref={(el) => { cellRefs.current[`${index}-priority`] = el }}
                      value={line.priority}
                      onChange={(e) => setLine(index, { priority: e.target.value })}
                      className="w-full bg-transparent px-2 py-2 text-sm text-foreground outline-none focus:bg-muted/40"
                    >
                      {PRIORITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="border-r border-border p-0">
                    <DatePicker
                      value={line.requestedDeliveryDate}
                      onChange={(d) => setLine(index, { requestedDeliveryDate: d })}
                      onKeyDown={handleCellKeyDown(index, "requestedDeliveryDate")}
                      inputRef={(el) => { cellRefs.current[`${index}-requestedDeliveryDate`] = el }}
                      placeholder="mm / dd / yyyy"
                      variant="table"
                    />
                  </td>
                  <td className="border-r border-border p-0">
                    <input
                      ref={(el) => { cellRefs.current[`${index}-remark`] = el }}
                      value={line.remark}
                      onChange={(e) => setLine(index, { remark: e.target.value })}
                      onKeyDown={handleCellKeyDown(index, "remark")}
                      className="w-full bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:bg-muted/40"
                    />
                  </td>
                  <td className="px-1 py-1">
                    {lines.length > 1 && (
                      <button onClick={() => removeLine(index)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive" title="Satırı sil">
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-foreground/90 disabled:opacity-50"
        >
          {isPending ? "Kaydediliyor..." : "Listeyi Oluştur"}
        </button>
        <button
          onClick={() => router.push("/logistic/plan-sheets")}
          disabled={isPending}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          İptal
        </button>
      </div>
      </div>
    </>
  )
}
