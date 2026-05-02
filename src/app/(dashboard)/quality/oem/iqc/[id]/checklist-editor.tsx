"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateIqcChecklistItem } from "../actions/report"
import { IQC_CHECKLIST_RESULT_LABELS, getIqcChecklistResultColor, getIqcChecklistResultIcon } from "@/lib/iqc"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type ChecklistItem = {
  id: string
  itemName: string
  requirement: string | null
  result: string
  measuredValue: string | null
  comment: string | null
}

type ChecklistResultType = "PENDING" | "OK" | "NOK" | "NA"

const RESULT_OPTIONS: ChecklistResultType[] = ["PENDING", "OK", "NOK", "NA"]

export function IqcChecklistEditor({
  items,
  editable,
}: {
  items: ChecklistItem[]
  editable: boolean
}) {
  const router = useRouter()
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ result?: ChecklistResultType; measuredValue?: string; comment?: string }>({})
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function startEdit(item: ChecklistItem) {
    setEditingItem(item.id)
    setEditData({
      result: item.result as ChecklistResultType,
      measuredValue: item.measuredValue ?? "",
      comment: item.comment ?? "",
    })
    setError(null)
  }

  function cancelEdit() {
    setEditingItem(null)
    setEditData({})
    setError(null)
  }

  function saveEdit(itemId: string) {
    setError(null)
    startTransition(async () => {
      const payload: { result?: ChecklistResultType; measuredValue?: string; comment?: string } = {}
      if (editData.result) payload.result = editData.result
      if (editData.measuredValue !== undefined) payload.measuredValue = editData.measuredValue
      if (editData.comment !== undefined) payload.comment = editData.comment

      const result = await updateIqcChecklistItem(itemId, payload)
      if (result.success) {
        setEditingItem(null)
        setEditData({})
        router.refresh()
      } else {
        setError(result.error ?? "Failed to update checklist item")
      }
    })
  }

  const ok = items.filter((c) => c.result === "OK").length
  const nok = items.filter((c) => c.result === "NOK").length
  const na = items.filter((c) => c.result === "NA").length
  const pending = items.filter((c) => c.result === "PENDING").length

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Checklist</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-emerald-400">{ok} OK</span>
          <span className="text-red-400">{nok} NOK</span>
          <span>{na} N/A</span>
          <span>{pending} pending</span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">{error}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Item</th>
              <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Requirement</th>
              <th className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground w-28">Result</th>
              <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-28">Value</th>
              <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-36">Comment</th>
              {editable && <th className="px-2 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground w-16">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => {
              const isEditing = editingItem === item.id
              return (
                <tr key={item.id} className="transition-colors hover:bg-muted/50">
                  <td className="px-2 py-2 text-foreground">{item.itemName}</td>
                  <td className="px-2 py-2 text-muted-foreground text-xs max-w-[200px] truncate">{item.requirement ?? "—"}</td>
                  {isEditing ? (
                    <>
                      <td className="px-2 py-2">
                        <select
                          value={editData.result ?? item.result}
                          onChange={(e) => setEditData((prev) => ({ ...prev, result: e.target.value as ChecklistResultType }))}
                          disabled={isPending}
                          className="flex h-8 w-full rounded-lg border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {RESULT_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{IQC_CHECKLIST_RESULT_LABELS[opt] ?? opt}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          value={editData.measuredValue ?? ""}
                          onChange={(e) => setEditData((prev) => ({ ...prev, measuredValue: e.target.value }))}
                          disabled={isPending}
                          placeholder="—"
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Textarea
                          value={editData.comment ?? ""}
                          onChange={(e) => setEditData((prev) => ({ ...prev, comment: e.target.value }))}
                          disabled={isPending}
                          placeholder="—"
                          rows={1}
                          className="min-h-0 text-xs resize-none"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => saveEdit(item.id)}
                            disabled={isPending}
                            className="inline-flex h-7 items-center justify-center rounded-md bg-emerald-500/10 px-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                          >
                            {isPending ? "..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={isPending}
                            className="inline-flex h-7 items-center justify-center rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-2 py-2 text-center">
                        <span className={`inline-flex items-center justify-center size-6 rounded-full text-xs font-bold ${getIqcChecklistResultColor(item.result)}`}>
                          {getIqcChecklistResultIcon(item.result)}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-foreground text-xs">{item.measuredValue ?? "—"}</td>
                      <td className="px-2 py-2 text-muted-foreground text-xs max-w-[150px] truncate">{item.comment ?? "—"}</td>
                      {editable && (
                        <td className="px-2 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="inline-flex h-7 items-center justify-center rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}