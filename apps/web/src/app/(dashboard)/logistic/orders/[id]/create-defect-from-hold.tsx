"use client"

import { Label } from "@/components/ui/label"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

import { Input } from "@/components/ui/input"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground hover:bg-accent transition-colors"
      >
        Create Defect
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BugIcon className="size-4 text-foreground" />
              Create Defect from Quality Hold
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
              <div>
                <Label className="block text-xs font-medium text-foreground mb-1">Supplier</Label>
                <NativeSelect
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)} className="w-full"
                >
                  <NativeSelectOption value="">Select supplier...</NativeSelectOption>
                  {suppliers.map((s) => (
                    <NativeSelectOption key={s.id} value={s.id}>{s.name}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div>
                <Label className="block text-xs font-medium text-foreground mb-1">Part Number</Label>
                <Input
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

          </div>
          <DialogFooter>
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? <Loader2Icon className="size-4 animate-spin mx-auto" /> : "Create Defect"}
                </Button>
                <Button
                  type="button"
                  onClick={() => setOpen(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
