"use client"

import { useState } from "react"
import { seedDefaultMilestonesForOrder } from "@/app/(dashboard)/logistic/milestone-actions"
import { useRouter } from "next/navigation"

export function SeedMilestonesButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSeed = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await seedDefaultMilestonesForOrder(orderId)
      if (result.error) {
        setError(result.error)
      }
      router.refresh()
    } catch {
      setError("Failed to create milestones")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 flex flex-col items-center gap-2">
      <button
        onClick={handleSeed}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
      >
        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        Create Default Milestones
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}