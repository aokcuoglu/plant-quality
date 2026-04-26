"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { getSuppliersForField, assignSupplier } from "@/app/(dashboard)/field/actions"
import { useEffect } from "react"

export function AssignSupplierForm({ fieldDefectId, currentSupplierId }: { fieldDefectId: string; currentSupplierId: string | null }) {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState(currentSupplierId ?? "")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSuppliersForField().then(setSuppliers)
  }, [])

  async function handleAssign() {
    setError(null)
    const result = await assignSupplier(fieldDefectId, selectedSupplier || null)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error ?? "Failed to assign supplier")
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Assign Supplier</h2>
      </div>
      <div className="px-4 py-3 space-y-3">
        <select
          value={selectedSupplier}
          onChange={(e) => setSelectedSupplier(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">No supplier assigned</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          onClick={() => startTransition(handleAssign)}
          disabled={isPending}
          className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          {isPending ? "Assigning..." : "Assign Supplier"}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  )
}