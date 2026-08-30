"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field-error"
import { Input } from "@/components/ui/input"
import { useTranslations } from "@/i18n/context"
import { createVehicleGroup, type CatalogActionState } from "../flow-actions"

const INITIAL_STATE: CatalogActionState = { status: "idle" }

export function VehicleGroupForm() {
  const t = useTranslations()
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [nameError, setNameError] = useState(false)
  const [state, action, pending] = useActionState(createVehicleGroup, INITIAL_STATE)

  useEffect(() => {
    if (state.status !== "success") return
    formRef.current?.reset()
    router.refresh()
  }, [router, state.status])

  const error = state.error
    ? t(`logistic.dynamicFlow.errors.${state.error}`)
    : null

  return (
    <form ref={formRef} action={action} className="grid gap-3" onSubmit={(event) => {
      const missing = !new FormData(event.currentTarget).get("name")?.toString().trim()
      setNameError(missing)
      if (missing) event.preventDefault()
    }}>
      <div className="grid gap-1.5">
        <Input name="name" disabled={pending} placeholder={t("logistic.dynamicFlow.name")} aria-invalid={nameError} />
        <FieldError message={nameError ? t("logistic.dynamicFlow.errors.REQUIRED") : null} />
      </div>
      <Input name="description" disabled={pending} placeholder={t("logistic.dynamicFlow.description")} />
      <FieldError message={error} />
      {state.status === "success" && <p className="text-sm text-emerald-400">{t("logistic.dynamicFlow.groupCreated")}</p>}
      <Button type="submit" disabled={pending} className="bg-brand text-brand-foreground hover:bg-brand/90">
        {pending && <LoaderCircle className="size-4 animate-spin" />}
        {pending ? t("logistic.dynamicFlow.adding") : t("common.add")}
      </Button>
    </form>
  )
}
