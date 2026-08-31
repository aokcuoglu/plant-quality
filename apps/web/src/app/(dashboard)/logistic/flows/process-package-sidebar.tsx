"use client"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MapPin, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { useTranslations } from "@/i18n/context"
import { createProcess, deleteProcess } from "../flow-actions"
import { PROCESS_TYPES, type ProcessType } from "./process-types"

export type CatalogProcess = {
  id: string
  name: string
  type: ProcessType
  description: string | null
  targetDurationMinutes: number | null
  isUsed: boolean
}

export function ProcessPackageSidebar({
  processes,
  canManage,
  canAddToFlow,
  onAddToFlow,
}: {
  processes: CatalogProcess[]
  canManage: boolean
  canAddToFlow: boolean
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
    if (process.isUsed) return
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

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="shrink-0 px-3 pt-3">
        <h2 className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("logistic.dynamicFlow.processPackage")}{" "}
          <span className="font-normal text-muted-foreground">({processes.length})</span>
        </h2>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {processes.length ? (
          processes.map((process) => {
            const unused = !process.isUsed
            return (
              <div key={process.id} className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canManage || !canAddToFlow || pending}
                  onClick={() => onAddToFlow(process)}
                  className="min-w-0 flex-1 justify-start"
                  title={
                    canAddToFlow
                      ? t("logistic.dynamicFlow.addToFlow")
                      : t("logistic.dynamicFlow.createDraft")
                  }
                >
                  <MapPin className="size-3.5 text-muted-foreground" />
                  <span className="truncate">{process.name}</span>
                  {canAddToFlow && canManage && <Plus className="ml-auto size-3.5" />}
                </Button>
                {canManage && unused && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={pending}
                    onClick={() => remove(process)}
                    aria-label={t("common.delete")}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
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
              <NativeSelect
                name="type"
                disabled={pending}
                className="w-full"
                aria-label={t("logistic.dynamicFlow.processType")}
              >
                {PROCESS_TYPES.map((type) => (
                  <NativeSelectOption key={type} value={type}>
                    {t(`logistic.dynamicFlow.types.${type}`)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
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
