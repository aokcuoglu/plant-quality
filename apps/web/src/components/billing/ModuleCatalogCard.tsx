"use client"

import { Textarea } from "@/components/ui/textarea"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

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
    <Card
      className={cn(
        "flex-row items-center gap-3 p-3",
        isSoon ? "border-border/50 bg-muted/30" : "border-border bg-card"
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          isActive
            ? "bg-muted text-muted-foreground ring-1 ring-brand/30"
            : isLive
              ? "bg-muted text-muted-foreground"
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
            <Badge variant="outline" className="bg-brand/10 text-[9px] uppercase tracking-wider text-foreground">
              Active
            </Badge>
          ) : isLive ? (
            <Badge variant="outline" className="bg-brand/10 text-[9px] uppercase tracking-wider text-foreground">
              Live
            </Badge>
          ) : isLocked ? (
            <Badge variant="outline" className="gap-0.5 bg-muted text-[9px] uppercase tracking-wider text-muted-foreground">
              <LockIcon className="size-2.5" />Locked
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-muted text-[9px] font-normal uppercase tracking-wider text-muted-foreground">
              Soon
            </Badge>
          )}
        </div>
        <p className={cn("truncate text-xs", isSoon ? "text-muted-foreground/50" : "text-muted-foreground")}>
          {entry.description}
        </p>
      </div>
      {isLocked && <ModuleRequestButton moduleKey={entry.moduleKey!} />}
    </Card>
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
        <span className="text-xs text-foreground">
          {success.duplicate ? "Request already exists" : "Request submitted"}
        </span>
        <Button
          type="button"
          onClick={() => { setSuccess(null); setShowForm(false) }}
          variant="ghost" className="text-[10px] text-muted-foreground hover:text-foreground underline"
        >
          Dismiss
        </Button>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="flex flex-col items-end gap-1.5 w-44">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Why do you need this module? (optional)"
          rows={2}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground resize-none"
          disabled={isPending}
        />
        <div className="flex gap-1.5">
          <Button
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
            className="rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-primary-foreground hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            {isPending ? "Submitting..." : "Submit"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => { setShowForm(false); setError(null) }}
            disabled={isPending}
            className="rounded-md border border-border px-2 py-1 text-[10px] font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </Button>
        </div>
        {error && <p className="text-[10px] text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <Button
      type="button"
      onClick={() => setShowForm(true)}
      className="shrink-0 rounded-md border border-border bg-muted px-2.5 py-1 text-[10px] font-medium text-foreground hover:bg-foreground/20 transition-colors"
    >
      Request access
    </Button>
  )
}
