"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Upload, FileDown } from "lucide-react"
import {
  CUSTOMER_TYPE_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
} from "@/lib/logistic/types"
import { createPlanSheet } from "../../plan-sheet-actions"
import { DatePicker } from "@/components/ui/date-picker"

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
  requesteddeliverydate: "requestedDeliveryDate",
  requesteddelivery: "requestedDeliveryDate",
  talep: "requestedDeliveryDate",
  teslimtarihi: "requestedDeliveryDate",
  ongorusevktarihi: "requestedDeliveryDate",
  öngörüsevktarihi: "requestedDeliveryDate",
  vehicletype: "vehicleType",
  araçtipi: "vehicleType",
  arctipi: "vehicleType",
  remark: "remark",
  açıklama: "remark",
  aciklama: "remark",
  not: "remark",
}

const DEFAULT_FIELD_ORDER: (keyof PlanLine)[] = [
  "vin",
  "vehicleModel",
  "customerName",
  "requestedDeliveryDate",
  "customerType",
  "vehicleType",
  "priority",
  "country",
  "dealerName",
  "distributorName",
  "remark",
]

const CSV_TEMPLATE = [
  "vin,arac_adi,musteri_adi,ongoru_sevk_tarihi",
  "LZG12345678901234,Novociti Life,Acme Lojistik,2026-09-25",
].join("\n")

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

function parseLineCsv(text: string): PlanLine[] {
  const rows = parseCsvRows(text)
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
    if (hasData && (line.customerName || line.vehicleModel)) {
      out.push(line)
    }
  }
  return out
}

function downloadCsv() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "plan-sheet-template.csv"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function PlanSheetForm({ defaultMonth }: { defaultMonth: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState("")
  const [periodMonth, setPeriodMonth] = useState(defaultMonth)
  const [channel, setChannel] = useState<"EXPORT" | "DOMESTIC">("EXPORT")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<PlanLine[]>([emptyLine()])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cellRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | HTMLButtonElement | null>>({})

  function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseLineCsv(reader.result as string)
      if (parsed.length === 0) {
        alert("CSV'den satır okunamadı. Şablonu kullanarak başlık sırasını kontrol edin.")
        return
      }
      setLines(parsed)
      alert(`${parsed.length} satır yüklendi.`)
    }
    reader.onerror = () => alert("Dosya okunamadı.")
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
      alert("En az bir satırda müşteri ve araç modeli girin")
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
        alert(res.error)
        return
      }
      router.push("/logistic/plan-sheets")
      router.refresh()
    })
  }

  return (
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
                <th className="min-w-48 border-r border-border px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Müşteri *</th>
                <th className="min-w-40 border-r border-border px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Müşteri Tipi</th>
                <th className="min-w-48 border-r border-border px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">VIN</th>
                <th className="min-w-36 border-r border-border px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Araç Tipi</th>
                <th className="min-w-32 border-r border-border px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Öncelik</th>
                <th className="min-w-44 border-r border-border px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Talep Teslim Tarihi</th>
                <th className="min-w-32 border-r border-border px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Ülke</th>
                <th className="min-w-36 border-r border-border px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Dealer</th>
                <th className="min-w-36 border-r border-border px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Distribütör</th>
                <th className="min-w-48 border-r border-border px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Açıklama</th>
                <th className="w-10 px-1 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={index} className="border-b border-border/60 last:border-b-0 hover:bg-muted/20">
                  <td className="border-r border-border px-2 py-1 text-center text-xs text-muted-foreground">{index + 1}</td>
                  <td className="border-r border-border p-0">
                    <input
                      ref={(el) => { cellRefs.current[`${index}-vehicleModel`] = el }}
                      value={line.vehicleModel}
                      onChange={(e) => setLine(index, { vehicleModel: e.target.value })}
                      onKeyDown={handleCellKeyDown(index, "vehicleModel")}
                      placeholder="örn. Novociti Life"
                      className="w-full bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:bg-muted/40"
                    />
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
                      onChange={(e) => setLine(index, { vehicleType: e.target.value })}
                      className="w-full bg-transparent px-2 py-2 text-sm text-foreground outline-none focus:bg-muted/40"
                    >
                      {VEHICLE_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
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
                      ref={(el) => { cellRefs.current[`${index}-country`] = el }}
                      value={line.country}
                      onChange={(e) => setLine(index, { country: e.target.value })}
                      onKeyDown={handleCellKeyDown(index, "country")}
                      className="w-full bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:bg-muted/40"
                    />
                  </td>
                  <td className="border-r border-border p-0">
                    <input
                      ref={(el) => { cellRefs.current[`${index}-dealerName`] = el }}
                      value={line.dealerName}
                      onChange={(e) => setLine(index, { dealerName: e.target.value })}
                      onKeyDown={handleCellKeyDown(index, "dealerName")}
                      className="w-full bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:bg-muted/40"
                    />
                  </td>
                  <td className="border-r border-border p-0">
                    <input
                      ref={(el) => { cellRefs.current[`${index}-distributorName`] = el }}
                      value={line.distributorName}
                      onChange={(e) => setLine(index, { distributorName: e.target.value })}
                      onKeyDown={handleCellKeyDown(index, "distributorName")}
                      className="w-full bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:bg-muted/40"
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
  )
}
