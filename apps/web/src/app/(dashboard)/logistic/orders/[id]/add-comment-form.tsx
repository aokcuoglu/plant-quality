"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function AddCommentForm({ orderId }: { orderId: string }) {
  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return
    setLoading(true)
    try {
      const { addLogisticOrderComment } = await import("../../actions")
      const result = await addLogisticOrderComment(orderId, value)
      if (result?.error) alert(result.error)
      setValue("")
      router.refresh()
    } catch {
      alert("Failed to add comment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a comment..."
        className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-foreground/90 disabled:opacity-50"
      >
        {loading ? "..." : "Send"}
      </button>
    </form>
  )
}