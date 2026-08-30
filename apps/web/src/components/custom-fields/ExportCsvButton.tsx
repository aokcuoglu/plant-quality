"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ResolvedField } from "@/lib/custom-fields/types"

interface ExportCsvButtonProps {
  label?: string
  fileName?: string
  headers: { key: string; label: string }[]
  rows: Record<string, unknown>[]
  listVisibleFields?: ResolvedField[]
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function ExportCsvButton({
  label = "Export CSV",
  fileName = "export.csv",
  headers,
  rows,
  listVisibleFields,
}: ExportCsvButtonProps) {
  const [loading, setLoading] = useState(false)

  function handleExport() {
    setLoading(true)

    const allHeaders = [
      ...headers,
      ...(listVisibleFields ?? []).map((f) => ({ key: f.fieldName, label: f.label })),
    ]

    const headerLine = allHeaders.map((h) => escapeCsv(h.label)).join(",")

    const dataLines = rows.map((row) =>
      allHeaders
        .map((h) => {
          if (h.key.startsWith("custom_")) {
            const cfKey = h.key.replace("custom_", "")
            return escapeCsv((row.customFields as Record<string, unknown>)?.[cfKey])
          }
          return escapeCsv(row[h.key])
        })
        .join(",")
    )

    const csv = [headerLine, ...dataLines].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)

    setLoading(false)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading}
    >
      <Download className="mr-1.5 size-3.5" />
      {loading ? "Exporting..." : label}
    </Button>
  )
}
