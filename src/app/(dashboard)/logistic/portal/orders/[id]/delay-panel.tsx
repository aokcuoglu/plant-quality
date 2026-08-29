import {
  EXTERNAL_DELAY_STATUS_LABELS,
  EXTERNAL_DELAY_STATUS_COLORS,
  getExternalDelayStatus,
  getExternalEta,
  formatSlaDate,
  type OrderSlaInput,
} from "@/lib/logistic/sla"
import { Info } from "lucide-react"

export function ExternalDelayPanel({
  order,
  externalStatusNote,
}: {
  order: OrderSlaInput
  externalStatusNote: string | null
}) {
  const delayStatus = getExternalDelayStatus(order)
  const eta = getExternalEta(order)
  const colorClass = EXTERNAL_DELAY_STATUS_COLORS[delayStatus]
  const label = EXTERNAL_DELAY_STATUS_LABELS[delayStatus]

  return (
    <div className="rounded-lg border bg-card p-5">
      <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
        <Info className="size-4 text-foreground" /> Delivery Status
      </h2>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Status</span>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${colorClass}`}>
            {label}
          </span>
        </div>

        {eta && (
          <div>
            <dt className="text-xs text-muted-foreground">Estimated Delivery</dt>
            <dd className="text-sm font-medium text-foreground">{formatSlaDate(eta)}</dd>
          </div>
        )}

        {externalStatusNote && (
          <div className="rounded-lg border bg-accent p-3">
            <p className="text-xs font-medium text-foreground">OEM Note</p>
            <p className="text-sm text-muted-foreground mt-1">{externalStatusNote}</p>
          </div>
        )}

        {delayStatus === "CONTACT_OEM" && (
          <p className="text-xs text-destructive">
            Please contact your OEM representative for more information about this order.
          </p>
        )}
      </div>
    </div>
  )
}