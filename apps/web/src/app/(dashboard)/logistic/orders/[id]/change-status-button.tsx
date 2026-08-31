"use client"

import { Button } from "@/components/ui/button"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { LogisticOrderStatus } from "@plantx/db/client"
import { STATUS_LABELS } from "@/lib/logistic/status"
import { changeLogisticOrderStatus } from "../../actions"
import { useAppAlertDialog } from "@/components/ui/app-alert-dialog"
import { useTranslations } from "@/i18n/context"

export function ChangeStatusButton({
  orderId,
  newStatus,
}: {
  orderId: string
  newStatus: LogisticOrderStatus
  currentStatus: LogisticOrderStatus
}) {
  const t = useTranslations()
  const { showAlert } = useAppAlertDialog()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAction = async () => {
    setLoading(true)
    try {
      const result = await changeLogisticOrderStatus(orderId, newStatus)
      if (result?.error) {
        showAlert(result.error)
        return
      }
      router.refresh()
    } catch {
      showAlert(t("logistic.actionErrors.changeStatus"))
    } finally {
      setLoading(false)
    }
  }

  const label = STATUS_LABELS[newStatus]
  const isCancel = newStatus === "CANCELLED"
  const isReject = newStatus === "REJECTED"

  return (
    <Button
      onClick={handleAction}
      disabled={loading}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        isCancel || isReject
          ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
          : "bg-muted text-muted-foreground hover:bg-foreground/20"
      }`}
    >
      {loading ? "..." : label}
    </Button>
  )
}
