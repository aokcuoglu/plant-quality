import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { requireFeature, requireModule } from "@/lib/billing/guards"
import { createLogisticOrder } from "../../actions"
import { CUSTOMER_TYPE_OPTIONS, VEHICLE_TYPE_OPTIONS, POWERTRAIN_OPTIONS, PRIORITY_OPTIONS } from "@/lib/logistic/types"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function NewLogisticOrderPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">New Vehicle Order</h1>
        <p className="text-sm text-muted-foreground">Create a new vehicle order request</p>
      </div>

      <form action={createLogisticOrder} className="space-y-6 rounded-lg border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Customer Type *</label>
            <select name="customerType" defaultValue="CUSTOMER" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              {CUSTOMER_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Customer / Dealer / Distributor Name *</label>
            <input
              type="text"
              name="customerName"
              required
              placeholder="Enter customer name"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Dealer Name</label>
            <input
              type="text"
              name="dealerName"
              placeholder="Optional"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Distributor Name</label>
            <input
              type="text"
              name="distributorName"
              placeholder="Optional"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Country</label>
            <input
              type="text"
              name="country"
              placeholder="e.g. Germany"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Market</label>
            <input
              type="text"
              name="market"
              placeholder="e.g. EU, MENA, LATAM"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Vehicle Model *</label>
            <input
              type="text"
              name="vehicleModel"
              required
              placeholder="e.g. CityStar 12E"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Vehicle Variant</label>
            <input
              type="text"
              name="vehicleVariant"
              placeholder="e.g. Low Entry, High Floor"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Vehicle Type *</label>
            <select name="vehicleType" defaultValue="BUS" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              {VEHICLE_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Powertrain</label>
            <select name="powertrain" defaultValue="DIESEL" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              {POWERTRAIN_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Quantity *</label>
            <input
              type="number"
              name="quantity"
              required
              min={1}
              defaultValue={1}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Priority</label>
            <select name="priority" defaultValue="NORMAL" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              {PRIORITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Requested Delivery Date</label>
            <input
              type="date"
              name="requestedDeliveryDate"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Request Number</label>
            <input
              type="text"
              name="requestNumber"
              placeholder="Optional"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Sales Order Number</label>
          <input
            type="text"
            name="salesOrderNo"
            placeholder="Optional"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Notes</label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Additional notes..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-emerald-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
          >
            Create Order
          </button>
          <Link
            href="/logistic/orders"
            className="rounded-lg border border-border px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}