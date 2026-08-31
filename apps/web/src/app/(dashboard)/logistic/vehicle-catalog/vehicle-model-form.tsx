"use client"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

import { useActionState, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field-error"
import { Input } from "@/components/ui/input"
import { useTranslations } from "@/i18n/context"
import { createVehicleModel, type CatalogActionState } from "../flow-actions"

const INITIAL_STATE: CatalogActionState = { status: "idle" }

export function VehicleModelForm({ groups }: { groups: { id: string; name: string }[] }) {
  const t = useTranslations()
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [fieldErrors, setFieldErrors] = useState({ groupId: false, name: false })
  const [state, action, pending] = useActionState(createVehicleModel, INITIAL_STATE)
  useEffect(() => {
    if (state.status !== "success") return
    formRef.current?.reset()
    router.refresh()
  }, [router, state.status])
  const error = state.error ? t(`logistic.dynamicFlow.errors.${state.error}`) : null
  return <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => {
    const data = new FormData(event.currentTarget)
    const nextErrors = {
      groupId: !data.get("groupId")?.toString().trim(),
      name: !data.get("name")?.toString().trim(),
    }
    setFieldErrors(nextErrors)
    if (nextErrors.groupId || nextErrors.name) event.preventDefault()
  }}>
    <div className="grid gap-1.5">
      <NativeSelect name="groupId" disabled={pending} aria-invalid={fieldErrors.groupId}><NativeSelectOption value="">{t("logistic.dynamicFlow.selectGroup")}</NativeSelectOption>{groups.map((group) => <NativeSelectOption key={group.id} value={group.id}>{group.name}</NativeSelectOption>)}</NativeSelect>
      <FieldError message={fieldErrors.groupId ? t("logistic.dynamicFlow.errors.REQUIRED") : null} />
    </div>
    <div className="grid gap-1.5">
      <Input name="name" disabled={pending} placeholder={t("logistic.dynamicFlow.name")} aria-invalid={fieldErrors.name} />
      <FieldError message={fieldErrors.name ? t("logistic.dynamicFlow.errors.REQUIRED") : null} />
    </div>
    <FieldError message={error} />
    {state.status === "success" && <p className="text-sm text-emerald-400">{t("logistic.dynamicFlow.modelCreated")}</p>}
    <Button type="submit" disabled={pending} className="sm:col-span-2 bg-brand text-brand-foreground hover:bg-brand/90">{pending && <LoaderCircle className="size-4 animate-spin" />}{pending ? t("logistic.dynamicFlow.adding") : t("common.add")}</Button>
  </form>
}
