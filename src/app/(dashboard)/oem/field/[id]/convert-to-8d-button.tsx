"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { convertTo8D } from "@/app/(dashboard)/field/actions"

export function ConvertTo8DButton({ fieldDefectId }: { fieldDefectId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function handleConvert() {
    setError(null)
    const result = await convertTo8D(fieldDefectId)
    if (result.success && result.defectId) {
      setOpen(false)
      router.push(`/oem/defects/${result.defectId}`)
      router.refresh()
    } else {
      setError(result.error ?? "Failed to convert to 8D")
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
      >
        Convert to 8D
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/10 backdrop-blur-xs" onClick={() => setOpen(false)} />
          <div className="relative z-50 w-full max-w-lg rounded-xl border bg-popover text-popover-foreground p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Convert to 8D Report</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This will create a new Defect and 8D Report from this field defect. The field defect status will be changed to &ldquo;Linked to 8D&rdquo; and cannot be converted again.
            </p>
            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
                {error}
              </div>
            )}
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => startTransition(handleConvert)}
                disabled={isPending}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {isPending ? "Converting..." : "Convert to 8D"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}