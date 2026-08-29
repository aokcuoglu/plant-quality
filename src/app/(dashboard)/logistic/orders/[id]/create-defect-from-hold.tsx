"use client"

import { useState, useEffect } from "react"
import { createDefectFromQualityHold } from "@/app/(dashboard)/logistic/milestone-actions"
import { useRouter } from "next/navigation"
import { BugIcon, Loader2Icon } from "lucide-react"

export function CreateDefectFromHoldButton({
  milestoneId,
  linkedDefectId,
  companyId,
}: {
  milestoneId: string
  orderId: string
  linkedDefectId: string | null
  companyId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [supplierId, setSupplierId] = useState("")
  const [partNumber, setPartNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (open) {
      fetch(`/api/companies?companyType=SUPPLIER`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setSuppliers(data)
          }
        })
        .catch(() => {})
    }
  }, [open, companyId])

  if (linkedDefectId) {
    return (
      <a
        href={`/quality/oem/defects/${linkedDefectId}`}
        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground hover:bg-foreground/20 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        <BugIcon className="size-3" />
        View Defect
      </a>
    )
  }

  const handleCreate = async () => {
    if (!supplierId || !partNumber.trim()) {
      setError("Please select a supplier and enter a part number")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await createDefectFromQualityHold(milestoneId, supplierId, partNumber.trim())
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
        router.refresh()
        if (result.success && "defectId" in result) {
          window.open(`/quality/oem/defects/${result.defectId}`, "_blank")
        }
      }
    } catch {
      setError("Failed to create defect")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground hover:bg-accent transition-colors"
      >
        Create Defect
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-background/80" onClick={() => setOpen(false)} />
          <div className="relative z-50 w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <BugIcon className="size-4 text-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Create Defect from Quality Hold</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Supplier</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Part Number</label>
                <input
                  type="text"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  placeholder="e.g. BR-5500-ASSY"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={loading}
                  className="flex-1 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2Icon className="size-4 animate-spin mx-auto" /> : "Create Defect"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}