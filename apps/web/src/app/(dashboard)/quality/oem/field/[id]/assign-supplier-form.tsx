"use client"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

import { Button } from "@/components/ui/button"

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
    try {
      const result = await assignSupplier(fieldDefectId, selectedSupplier || null)
      if (result.success) {
        router.refresh()
      } else {
        setError(result.error ?? "Failed to assign supplier")
      }
    } catch {
      setError("An unexpected error occurred. Please try again.")
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Assign Supplier</h2>
      </div>
      <div className="px-4 py-3 space-y-3">
        <NativeSelect
          value={selectedSupplier}
          onChange={(e) => setSelectedSupplier(e.target.value)} className="w-full"
        >
          <NativeSelectOption value="">No supplier assigned</NativeSelectOption>
          {suppliers.map((s) => (
            <NativeSelectOption key={s.id} value={s.id}>{s.name}</NativeSelectOption>
          ))}
        </NativeSelect>
        <Button
          onClick={() => startTransition(handleAssign)}
          disabled={isPending}
          className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-foreground/90 transition-colors disabled:opacity-50"
        >
          {isPending ? "Assigning..." : "Assign Supplier"}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  )
}