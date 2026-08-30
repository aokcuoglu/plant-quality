"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PanelLeftClose, PanelLeft, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { useTranslations } from "@/i18n/context"
import { createProcess, deleteProcess } from "../flow-actions"

const PROCESS_TYPES = [
  "OPERATION",
  "QUALITY_CONTROL",
  "WAITING",
  "STORAGE_YARD",
  "DISPATCH",
  "TRANSPORT",
  "DELIVERY",
  "OTHER",
] as const

export type CatalogProcess = {
  id: string
  name: string
  type: string
  description: string | null
  targetDurationMinutes: number | null
  usedInGroups: string[]
}

export function ProcessPackageSidebar({
  processes,
  canManage,
  canAddToFlow,
  expanded,
  onExpandedChange,
  onAddToFlow,
}: {
  processes: CatalogProcess[]
  canManage: boolean
  canAddToFlow: boolean
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  onAddToFlow: (process: CatalogProcess) => void
}) {
  const t = useTranslations()
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()

  function errorTitle(code?: string) {
    const known = [
      "FORBIDDEN",
      "REQUIRED",
      "DUPLICATE",
      "UNKNOWN",
      "PROCESS_IN_USE",
      "generic",
    ] as const
    if (code && (known as readonly string[]).includes(code)) {
      return t(`logistic.dynamicFlow.errors.${code as (typeof known)[number]}`)
    }
    return t("logistic.dynamicFlow.errors.generic")
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createProcess(formData)
      if (!result.success) {
        toast({ title: errorTitle(result.error), type: "destructive" })
        return
      }
      toast({ title: t("logistic.dynamicFlow.processCreated") })
      setShowForm(false)
      router.refresh()
    })
  }

  function remove(process: CatalogProcess) {
    if (process.usedInGroups.length) return
    startTransition(async () => {
      const result = await deleteProcess(process.id)
      if (!result.success) {
        toast({ title: errorTitle(result.error), type: "destructive" })
        return
      }
      toast({ title: t("logistic.dynamicFlow.processDeleted") })
      router.refresh()
    })
  }

  if (!expanded) {
    return (
      <aside className="flex w-10 shrink-0 flex-col items-center border-r border-border bg-card py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onExpandedChange(true)}
          aria-label={t("logistic.dynamicFlow.expandPackage")}
        >
          <PanelLeft className="size-4" />
        </Button>
        <span
          className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          style={{ writingMode: "vertical-rl" }}
        >
          {t("logistic.dynamicFlow.processPackage")}
        </span>
        <span className="mt-2 text-[10px] text-muted-foreground">({processes.length})</span>
      </aside>
    )
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card lg:w-72">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {t("logistic.dynamicFlow.processPackage")}{" "}
          <span className="font-normal text-muted-foreground">({processes.length})</span>
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 shrink-0 p-0"
          onClick={() => onExpandedChange(false)}
          aria-label={t("logistic.dynamicFlow.collapsePackage")}
        >
          <PanelLeftClose className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {processes.length ? (
          processes.map((process) => {
            const unused = process.usedInGroups.length === 0
            const typeLabel = PROCESS_TYPES.includes(
              process.type as (typeof PROCESS_TYPES)[number],
            )
              ? t(`logistic.dynamicFlow.types.${process.type as (typeof PROCESS_TYPES)[number]}`)
              : process.type
            return (
              <div
                key={process.id}
                className="rounded-md border border-border bg-background p-2"
              >
                <div className="flex items-start gap-1">
                  <button
                    type="button"
                    disabled={!canManage || !canAddToFlow || pending}
                    onClick={() => onAddToFlow(process)}
                    className="min-w-0 flex-1 rounded-sm text-left hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                    title={
                      canAddToFlow
                        ? t("logistic.dynamicFlow.addToFlow")
                        : t("logistic.dynamicFlow.createDraft")
                    }
                  >
                    <span className="block truncate text-xs font-medium text-foreground">
                      {process.name}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {typeLabel}
                      {process.targetDurationMinutes != null
                        ? ` · ${t("logistic.dynamicFlow.minutes", {
                            count: process.targetDurationMinutes,
                          })}`
                        : ""}
                    </span>
                  </button>
                  {canAddToFlow && canManage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 shrink-0 p-0"
                      disabled={pending}
                      onClick={() => onAddToFlow(process)}
                      aria-label={t("logistic.dynamicFlow.addToFlow")}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  )}
                  {canManage && unused && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                      disabled={pending}
                      onClick={() => remove(process)}
                      aria-label={t("common.delete")}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {unused ? (
                    <span className="text-[10px] text-muted-foreground">
                      {t("logistic.dynamicFlow.unusedProcess")}
                    </span>
                  ) : (
                    process.usedInGroups.map((group) => (
                      <span
                        key={group}
                        className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400"
                      >
                        {group}
                      </span>
                    ))
                  )}
                </div>
              </div>
            )
          })
        ) : (
          <p className="text-xs text-muted-foreground">{t("logistic.dynamicFlow.noProcesses")}</p>
        )}
      </div>

      {canManage && (
        <div className="shrink-0 border-t border-border p-3">
          {showForm ? (
            <form action={submit} className="space-y-2">
              <Input
                name="name"
                required
                disabled={pending}
                placeholder={t("logistic.dynamicFlow.name")}
              />
              <select
                name="type"
                disabled={pending}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                aria-label={t("logistic.dynamicFlow.processType")}
              >
                {PROCESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`logistic.dynamicFlow.types.${type}`)}
                  </option>
                ))}
              </select>
              <Input
                name="targetDurationMinutes"
                type="number"
                min="1"
                disabled={pending}
                placeholder={t("logistic.dynamicFlow.targetMinutes")}
              />
              <Textarea
                name="description"
                disabled={pending}
                placeholder={t("logistic.dynamicFlow.description")}
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={pending}
                  size="sm"
                  className="bg-emerald-500 text-primary-foreground hover:bg-emerald-500/90"
                >
                  {t("common.create")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => setShowForm(false)}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowForm(true)}
            >
              <Plus className="size-3" />
              {t("logistic.dynamicFlow.addProcess")}
            </Button>
          )}
        </div>
      )}
    </aside>
  )
}
