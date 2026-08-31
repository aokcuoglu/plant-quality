"use client"

import { Label } from "@/components/ui/label"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { createLogisticOrder } from "../../actions"
import { DynamicCustomFields } from "@/components/custom-fields/DynamicCustomFields"
import { DatePicker } from "@/components/ui/date-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useTranslations } from "@/i18n/context"
import type { ResolvedFields } from "@/lib/custom-fields/resolver"
import type { CustomFieldsData } from "@/lib/custom-fields/types"

const CUSTOMER_TYPES = ["CUSTOMER", "DEALER", "DISTRIBUTOR", "INTERNAL"] as const
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const
type OrderLine = { id: string; identifier: string; vehicleModelId: string; priority: typeof PRIORITIES[number] }
const emptyLine = (): OrderLine => ({ id: crypto.randomUUID(), identifier: "", vehicleModelId: "", priority: "NORMAL" })

export function LogisticOrderFormWrapper({ fieldConfig, vehicleModels }: { fieldConfig: ResolvedFields; vehicleModels: { id: string; name: string; groupName: string }[] }) {
  const t = useTranslations()
  const [customFields, setCustomFields] = useState<CustomFieldsData>({})
  const [lines, setLines] = useState<OrderLine[]>([emptyLine()])
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState("")
  const setLine = (id: string, patch: Partial<OrderLine>) => setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line))

  return (
    <form action={async (formData) => {
      formData.set("customFields", JSON.stringify(customFields))
      formData.set("requestedDeliveryDate", requestedDeliveryDate)
      formData.set("orderLines", JSON.stringify(lines.map((line) => ({ ...line, quantity: 1, variant: "", powertrain: "DIESEL" }))))
      await createLogisticOrder(formData)
    }} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("logistic.dynamicFlow.orderDetails")}</CardTitle>
          <CardDescription>{t("logistic.dynamicFlow.orderDetailsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-3">
          <Label className="flex flex-col gap-2 text-sm font-medium text-foreground"><span>{t("logistic.dynamicFlow.customerType")}</span><NativeSelect name="customerType" className="w-full">{CUSTOMER_TYPES.map((type) => <NativeSelectOption key={type} value={type}>{t(`logistic.dynamicFlow.customerTypes.${type}`)}</NativeSelectOption>)}</NativeSelect></Label>
          <Label className="flex flex-col gap-2 text-sm font-medium text-foreground"><span>{t("logistic.dynamicFlow.customerName")}</span><Input name="customerName" required /></Label>
          <Label className="flex flex-col gap-2 text-sm font-medium text-foreground"><span>{t("logistic.dynamicFlow.requestNumber")}</span><Input name="requestNumber" /></Label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("logistic.dynamicFlow.orderLines")} ({lines.length})</CardTitle>
          <CardDescription>{t("logistic.dynamicFlow.orderLinesDescription")}</CardDescription>
          <CardAction>
            <Button type="button" variant="outline" size="sm" onClick={() => setLines((current) => [...current, emptyLine()])}>
              <Plus className="size-4" />
              {t("logistic.dynamicFlow.addLine")}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border">
          <Table className="min-w-[1040px] w-full border-collapse text-sm">
            <TableHeader><TableRow className="border-b border-border bg-muted/40"><TableHead className="w-12 border-r border-border px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">#</TableHead><TableHead className="min-w-44 border-r border-border px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("logistic.dynamicFlow.planSheetIdentifier")}</TableHead><TableHead className="min-w-72 border-r border-border px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("logistic.dynamicFlow.vehicle")}</TableHead><TableHead className="min-w-28 border-r border-border px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("logistic.dynamicFlow.quantity")}</TableHead><TableHead className="min-w-40 border-r border-border px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("logistic.dynamicFlow.priority")}</TableHead><TableHead className="min-w-52 border-r border-border px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("logistic.dynamicFlow.requestedDelivery")}</TableHead><TableHead className="w-14 px-2 py-3" /></TableRow></TableHeader>
            <TableBody>{lines.map((line, index) => <TableRow key={line.id} className="border-b border-border/60 last:border-b-0 hover:bg-muted/20">
              <TableCell className="border-r border-border px-3 py-3 text-center text-xs text-muted-foreground">{index + 1}</TableCell>
              <TableCell className="border-r border-border p-0"><Input value={line.identifier} onChange={(event) => setLine(line.id, { identifier: event.target.value })} placeholder={t("logistic.dynamicFlow.planSheetIdentifier")} className="h-11 rounded-none border-0 bg-transparent px-3 font-mono shadow-none focus-visible:ring-0" /></TableCell>
              <TableCell className="border-r border-border p-0"><NativeSelect required value={line.vehicleModelId} onChange={(event) => setLine(line.id, { vehicleModelId: event.target.value })} className="w-full"><NativeSelectOption value="">{t("logistic.dynamicFlow.selectModel")}</NativeSelectOption>{vehicleModels.map((model) => <NativeSelectOption key={model.id} value={model.id}>{model.groupName} · {model.name}</NativeSelectOption>)}</NativeSelect></TableCell>
              <TableCell className="border-r border-border px-3 py-3 text-sm text-foreground">1</TableCell>
              <TableCell className="border-r border-border p-0"><NativeSelect value={line.priority} onChange={(event) => setLine(line.id, { priority: event.target.value as OrderLine["priority"] })} className="w-full">{PRIORITIES.map((item) => <NativeSelectOption key={item} value={item}>{t(`logistic.dynamicFlow.priorities.${item}`)}</NativeSelectOption>)}</NativeSelect></TableCell>
              <TableCell className="border-r border-border p-0"><DatePicker value={requestedDeliveryDate} onChange={setRequestedDeliveryDate} variant="table" /></TableCell>
              <TableCell className="px-2 py-2"><Button type="button" variant="ghost" size="icon-sm" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((candidate) => candidate.id !== line.id))} aria-label={t("logistic.dynamicFlow.removeLine")}><Trash2 className="size-4" /></Button></TableCell>
            </TableRow>)}</TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Label className="block space-y-2 text-sm font-medium text-foreground"><span>{t("logistic.dynamicFlow.notes")}</span><Textarea name="notes" className="min-h-28 resize-y" /></Label>
        </CardContent>
      </Card>
      {fieldConfig.custom.length > 0 && <DynamicCustomFields entity="LOGISTIC_ORDER" fields={fieldConfig.all} values={customFields} onChange={(fieldName, value) => setCustomFields((current) => ({ ...current, [fieldName]: value }))} mode="create" />}
      <div className="flex flex-wrap gap-3 border-t border-border pt-6"><Button type="submit" className="bg-brand text-brand-foreground hover:bg-brand/90">{t("logistic.dynamicFlow.createOrder")}</Button><Button type="button" variant="outline" onClick={() => history.back()}>{t("common.cancel")}</Button></div>
    </form>
  )
}
