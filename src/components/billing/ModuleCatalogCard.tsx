"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createModuleAccessRequest } from "@/app/(dashboard)/_actions/module-requests"
import type { ModuleCatalogEntry, ModuleStatus } from "@/lib/billing/features"
import { ShieldCheck, TruckIcon, LockIcon, PackageCheck, FileText, Leaf, ClipboardCheck, Settings, MoveRight, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  quality: ShieldCheck,
  logistic: TruckIcon,
  dock: PackageCheck,
  quote: FileText,
  trace: Leaf,
  audit: ClipboardCheck,
  asset: Settings,
  flow: MoveRight,
  staff: Users,
}

interface ModuleCatalogCardProps {
  entry: ModuleCatalogEntry
  status: ModuleStatus
}

export function ModuleCatalogCard({ entry, status }: ModuleCatalogCardProps) {
  const Icon = MODULE_ICONS[entry.id] ?? ShieldCheck
  const isSoon = status === "SOON"
  const isLocked = status === "LOCKED"
  const isActive = status === "ACTIVE"
  const isLive = status === "LIVE"

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3",
        isSoon ? "border-border/50 bg-muted/30" : "border-border bg-card"
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          isActive
            ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/30"
            : isLive
              ? "bg-emerald-500/10 text-emerald-500"
              : isLocked
                ? "bg-muted text-muted-foreground"
                : "bg-muted text-muted-foreground/50"
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              isActive ? "text-foreground" : isLive ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {entry.name}
          </span>
          {isActive ? (
            <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-500">
              Active
            </span>
          ) : isLive ? (
            <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-500">
              Live
            </span>
          ) : isLocked ? (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted px-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              <LockIcon className="size-2.5" />Locked
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-border bg-muted px-1.5 text-[9px] font-normal uppercase tracking-wider text-muted-foreground">
              Soon
            </span>
          )}
        </div>
        <p className={cn("truncate text-xs", isSoon ? "text-muted-foreground/50" : "text-muted-foreground")}>
          {entry.description}
        </p>
      </div>
      {isLocked && <ModuleRequestButton moduleKey={entry.moduleKey!} />}
    </div>
  )
}

function ModuleRequestButton({
  moduleKey,
}: {
  moduleKey: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ duplicate: boolean } | null>(null)

  if (success) {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs text-emerald-500">
          {success.duplicate ? "Request already exists" : "Request submitted"}
        </span>
        <button
          type="button"
          onClick={() => { setSuccess(null); setShowForm(false) }}
          className="text-[10px] text-muted-foreground hover:text-foreground underline"
        >
          Dismiss
        </button>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="flex flex-col items-end gap-1.5 w-44">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Why do you need this module? (optional)"
          rows={2}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
          disabled={isPending}
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              startTransition(async () => {
                setError(null)
                const result = await createModuleAccessRequest({ moduleKey, message: message.trim() || undefined })
                if (result.success) {
                  setSuccess({ duplicate: result.duplicate ?? false })
                  router.refresh()
                } else {
                  setError(result.error)
                }
              })
            }}
            disabled={isPending}
            className="rounded-md bg-emerald-500 px-2 py-1 text-[10px] font-medium text-primary-foreground hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            {isPending ? "Submitting..." : "Submit"}
          </button>
          <button
            type="button"
            onClick={() => { setShowForm(false); setError(null) }}
            disabled={isPending}
            className="rounded-md border border-border px-2 py-1 text-[10px] font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-[10px] text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setShowForm(true)}
      className="shrink-0 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-500 hover:bg-emerald-500/20 transition-colors"
    >
      Request access
    </button>
  )
}