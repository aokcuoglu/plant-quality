"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { markAllAsRead } from "@/app/(dashboard)/_actions/notifications"

export function MarkAllAsReadButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleClick = async () => {
    setLoading(true)
    await markAllAsRead()
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
    >
      {loading ? "Marking..." : "Mark All as Read"}
    </button>
  )
}