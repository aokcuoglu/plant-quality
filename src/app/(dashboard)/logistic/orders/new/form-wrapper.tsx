"use client"

import { useState } from "react"
import { createLogisticOrder } from "../../actions"
import { DynamicCustomFields } from "@/components/custom-fields/DynamicCustomFields"
import type { ResolvedFields } from "@/lib/custom-fields/resolver"
import type { CustomFieldsData } from "@/lib/custom-fields/types"
import { CUSTOMER_TYPE_OPTIONS, VEHICLE_TYPE_OPTIONS, POWERTRAIN_OPTIONS, PRIORITY_OPTIONS } from "@/lib/logistic/types"

export function LogisticOrderFormWrapper({
  fieldConfig,
}: {
  fieldConfig: ResolvedFields
}) {
  const [customFields, setCustomFields] = useState<CustomFieldsData>({})

  return (
    <form
      action={async (formData: FormData) => {
        formData.set("customFields", JSON.stringify(customFields))
        await createLogisticOrder(formData)
      }}
      className="space-y-6 rounded-lg border bg-card p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Customer Type *</label>
          <select
            name="customerType"
            required
            defaultValue="CUSTOMER"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {CUSTOMER_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Customer / Dealer / Distributor Name *</label>
          <input
            name="customerName"
            required
            placeholder="Enter customer name"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Dealer Name</label>
          <input
            name="dealerName"
            placeholder="Optional"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Distributor Name</label>
          <input
            name="distributorName"
            placeholder="Optional"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Country</label>
          <input
            name="country"
            placeholder="e.g. Germany"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Market</label>
          <input
            name="market"
            placeholder="e.g. EU, MENA, LATAM"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Vehicle Model *</label>
          <input
            name="vehicleModel"
            required
            placeholder="e.g. CityStar 12E"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Vehicle Variant</label>
          <input
            name="vehicleVariant"
            placeholder="e.g. Low Entry, High Floor"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Vehicle Type *</label>
          <select
            name="vehicleType"
            required
            defaultValue="BUS"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {VEHICLE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Powertrain</label>
          <select
            name="powertrain"
            defaultValue="DIESEL"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {POWERTRAIN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Quantity *</label>
          <input
            name="quantity"
            type="number"
            required
            min={1}
            defaultValue={1}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Priority</label>
          <select
            name="priority"
            defaultValue="NORMAL"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Requested Delivery Date</label>
          <input
            name="requestedDeliveryDate"
            type="date"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Request Number</label>
          <input
            name="requestNumber"
            placeholder="Optional"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Sales Order Number</label>
          <input
            name="salesOrderNo"
            placeholder="Optional"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium text-foreground">Notes</label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Additional notes..."
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      {fieldConfig.custom.length > 0 && (
        <DynamicCustomFields
          entity="LOGISTIC_ORDER"
          fields={fieldConfig.all}
          values={customFields}
          onChange={(fieldName, value) => setCustomFields((prev) => ({ ...prev, [fieldName]: value }))}
          mode="create"
        />
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Create Order
        </button>
        <a
          href="/logistic/orders"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  )
}
