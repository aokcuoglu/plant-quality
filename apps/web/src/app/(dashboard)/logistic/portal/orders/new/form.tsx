"use client"

import { Label } from "@/components/ui/label"

import { Textarea } from "@/components/ui/textarea"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

import { Input } from "@/components/ui/input"

import { Button } from "@/components/ui/button"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  labelForVehicleType,
  labelForPowertrain,
  labelForPriority,
} from "@/lib/logistic/types"
import { DatePicker } from "@/components/ui/date-picker"

interface Oem {
  id: string
  name: string
}

export function PortalOrderForm({ oems }: { oems: Oem[] }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const vehicleTypes = ["BUS", "MIDIBUS", "TRUCK", "LIGHT_TRUCK"] as const
  const powertrains = ["DIESEL", "CNG", "ELECTRIC", "HYBRID", "OTHER"] as const
  const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    try {
      const res = await fetch("/api/logistic/portal/create-order", {
        method: "POST",
        body: formData,
      })
      const result = await res.json()
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.data?.id) {
        router.push(`/logistic/portal/orders/${result.data.id}`)
      }
    } catch {
      setError("Failed to submit order. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="block text-xs font-medium text-foreground mb-1">
            OEM <span className="text-destructive">*</span>
          </Label>
          <NativeSelect
            name="oemId"
            required
            defaultValue="" className="w-full"
          >
            <NativeSelectOption value="" disabled>Select manufacturer...</NativeSelectOption>
            {oems.map((oem) => (
              <NativeSelectOption key={oem.id} value={oem.id}>{oem.name}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div>
          <Label className="block text-xs font-medium text-foreground mb-1">
            Customer Name <span className="text-destructive">*</span>
          </Label>
          <Input
            name="customerName"
            type="text"
            required
            placeholder="End customer name"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>

        <div>
          <Label className="block text-xs font-medium text-foreground mb-1">
            Vehicle Model <span className="text-destructive">*</span>
          </Label>
          <Input
            name="vehicleModel"
            type="text"
            required
            placeholder="e.g. CityBus 12M"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>

        <div>
          <Label className="block text-xs font-medium text-foreground mb-1">
            Vehicle Type <span className="text-destructive">*</span>
          </Label>
          <NativeSelect
            name="vehicleType"
            required
            defaultValue="BUS" className="w-full"
          >
            {vehicleTypes.map((t) => (
              <NativeSelectOption key={t} value={t}>{labelForVehicleType(t)}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div>
          <Label className="block text-xs font-medium text-foreground mb-1">
            Quantity <span className="text-destructive">*</span>
          </Label>
          <Input
            name="quantity"
            type="number"
            required
            min={1}
            defaultValue={1}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>

        <div>
          <Label className="block text-xs font-medium text-foreground mb-1">Priority</Label>
          <NativeSelect
            name="priority"
            defaultValue="NORMAL" className="w-full"
          >
            {priorities.map((p) => (
              <NativeSelectOption key={p} value={p}>{labelForPriority(p)}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div>
          <Label className="block text-xs font-medium text-foreground mb-1">Country</Label>
          <Input
            name="country"
            type="text"
            placeholder="e.g. Turkey"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>

        <div>
          <Label className="block text-xs font-medium text-foreground mb-1">Market</Label>
          <Input
            name="market"
            type="text"
            placeholder="e.g. Domestic"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>

        <div>
          <Label className="block text-xs font-medium text-foreground mb-1">Vehicle Variant</Label>
          <Input
            name="vehicleVariant"
            type="text"
            placeholder="e.g. CNG, Electric"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>

        <div>
          <Label className="block text-xs font-medium text-foreground mb-1">Powertrain</Label>
          <NativeSelect
            name="powertrain"
            defaultValue="" className="w-full"
          >
            <NativeSelectOption value="">Not specified</NativeSelectOption>
            {powertrains.map((p) => (
              <NativeSelectOption key={p} value={p}>{labelForPowertrain(p)}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div>
          <Label className="block text-xs font-medium text-foreground mb-1">Requested Delivery Date</Label>
          <DatePicker name="requestedDeliveryDate" placeholder="mm / dd / yyyy" />
        </div>
      </div>

      <div>
        <Label className="block text-xs font-medium text-foreground mb-1">Notes</Label>
        <Textarea
          name="notes"
          rows={3}
          placeholder="Additional information or special requirements..."
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/logistic/portal/orders")}
          className={cn(
            "rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors",
            submitting && "opacity-50 cursor-not-allowed"
          )}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className={cn(
            "rounded-md bg-foreground px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-foreground/90 transition-colors",
            submitting && "opacity-50 cursor-not-allowed"
          )}
        >
          {submitting ? "Submitting..." : "Submit Order Request"}
        </Button>
      </div>
    </form>
  )
}
