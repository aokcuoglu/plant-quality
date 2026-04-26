"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { convertTo8D } from "@/app/(dashboard)/field/actions"

export function ConvertTo8DConfirmation({ fieldDefectId }: { fieldDefectId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleConvert() {
    setError(null)
    const result = await convertTo8D(fieldDefectId)
    if (result.success && result.defectId) {
      router.push(`/quality/oem/defects/${result.defectId}`)
    } else {
      setError(result.error ?? "Failed to convert to 8D")
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={() => startTransition(handleConvert)}
          disabled={isPending}
          className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          {isPending ? "Converting..." : "Convert to 8D"}
        </button>
        <a
          href={`/quality/oem/field/${fieldDefectId}`}
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </a>
      </div>
      <p className="text-xs text-muted-foreground">
        This action cannot be undone. The field defect will be permanently linked to the new 8D report.
      </p>
    </div>
  )
}