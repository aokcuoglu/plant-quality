"use client"

import { Input } from "@/components/ui/input"

import { Button } from "@/components/ui/button"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAppAlertDialog } from "@/components/ui/app-alert-dialog"
import { useTranslations } from "@/i18n/context"

export function AddCommentForm({ orderId }: { orderId: string }) {
  const t = useTranslations()
  const { showAlert } = useAppAlertDialog()
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
      if (result?.error) {
        showAlert(result.error)
        return
      }
      setValue("")
      router.refresh()
    } catch {
      showAlert(t("logistic.actionErrors.addComment"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a comment..."
        className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground"
      />
      <Button
        type="submit"
        disabled={loading || !value.trim()}
        className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-foreground/90 disabled:opacity-50"
      >
        {loading ? "..." : "Send"}
      </Button>
    </form>
  )
}
