"use client"

import { Textarea } from "@/components/ui/textarea"

import { Button } from "@/components/ui/button"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { submitPpapPackage } from "../actions/submit"

export function SupplierPpapActions({
  ppapId,
  allUploaded,
  totalDocs,
}: {
  ppapId: string
  allUploaded: boolean
  totalDocs: number
}) {
  const router = useRouter()
  const [supplierNotes, setSupplierNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [showSubmit, setShowSubmit] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    const result = await submitPpapPackage(ppapId, supplierNotes || undefined)
    setLoading(false)
    if (result.success) {
      setShowSubmit(false)
      router.refresh()
    } else {
      setError(result.error ?? "Failed to submit PPAP package")
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => setShowSubmit(true)}
          disabled={!allUploaded || totalDocs === 0}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={!allUploaded ? "All required documents must be uploaded before submitting" : ""}
        >
          Submit PPAP Package
        </Button>
        {!allUploaded && totalDocs > 0 && (
          <span className="text-xs text-destructive">Some required documents are still missing</span>
        )}
      </div>

      {showSubmit && (
        <div className="rounded-lg border border-border bg-foreground/5 p-4 space-y-3">
          <h3 className="text-sm font-medium text-foreground">Submit PPAP Package</h3>
          <p className="text-xs text-muted-foreground">
            This will notify the OEM that your PPAP package is ready for review.
          </p>
          <Textarea
            value={supplierNotes}
            onChange={(e) => setSupplierNotes(e.target.value)}
            placeholder="Optional notes for the OEM reviewer..."
            rows={3}
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={loading} className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-foreground/90 disabled:opacity-50">
              {loading ? "Submitting..." : "Confirm Submit"}
            </Button>
            <Button variant="outline" onClick={() => setShowSubmit(false)} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}
