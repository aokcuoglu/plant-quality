"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { LogisticOrderStatus } from "@/generated/prisma/client"
import { STATUS_LABELS } from "@/lib/logistic/status"
import { changeLogisticOrderStatus } from "../../actions"

export function ChangeStatusButton({
  orderId,
  newStatus,
}: {
  orderId: string
  newStatus: LogisticOrderStatus
  currentStatus: LogisticOrderStatus
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAction = async () => {
    setLoading(true)
    try {
      const result = await changeLogisticOrderStatus(orderId, newStatus)
      if (result?.error) {
        alert(result.error)
      }
      router.refresh()
    } catch {
      alert("Failed to change status")
    } finally {
      setLoading(false)
    }
  }

  const label = STATUS_LABELS[newStatus]
  const isCancel = newStatus === "CANCELLED"
  const isReject = newStatus === "REJECTED"

  return (
    <button
      onClick={handleAction}
      disabled={loading}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        isCancel || isReject
          ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
          : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
      }`}
    >
      {loading ? "..." : label}
    </button>
  )
}