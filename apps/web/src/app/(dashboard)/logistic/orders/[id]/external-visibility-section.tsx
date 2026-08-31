"use client"

import { Label } from "@/components/ui/label"

import { Textarea } from "@/components/ui/textarea"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

import { Switch } from "@/components/ui/switch"

import { Button } from "@/components/ui/button"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateOrderExternalVisibility } from "../../portal/actions"
import type { ExternalOrderStatus } from "@/lib/logistic/external-status"
import { EXTERNAL_STATUS_LABELS } from "@/lib/logistic/external-status"

interface ExternalVisibilitySectionProps {
  orderId: string
  externalVisible: boolean
  externalStatus: ExternalOrderStatus | null
  externalStatusNote: string | null
  dealerCompanyId: string | null
  distributorCompanyId: string | null
  dealerCompanies: { id: string; name: string }[]
  distributorCompanies: { id: string; name: string }[]
}

const EXTERNAL_STATUS_OPTIONS = Object.entries(EXTERNAL_STATUS_LABELS).map(([value, label]) => ({ value, label }))

export function ExternalVisibilitySection({
  orderId,
  externalVisible: initialVisible,
  externalStatus: initialStatus,
  externalStatusNote: initialNote,
  dealerCompanyId: initialDealerId,
  distributorCompanyId: initialDistributorId,
  dealerCompanies,
  distributorCompanies,
}: ExternalVisibilitySectionProps) {
  const router = useRouter()
  const [externalVisible, setExternalVisible] = useState(initialVisible)
  const [externalStatus, setExternalStatus] = useState<ExternalOrderStatus | null>(initialStatus)
  const [externalStatusNote, setExternalStatusNote] = useState(initialNote ?? "")
  const [dealerCompanyId, setDealerCompanyId] = useState(initialDealerId ?? "")
  const [distributorCompanyId, setDistributorCompanyId] = useState(initialDistributorId ?? "")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    const result = await updateOrderExternalVisibility(orderId, {
      externalVisible,
      dealerCompanyId: dealerCompanyId || null,
      distributorCompanyId: distributorCompanyId || null,
      externalStatus: externalStatus,
      externalStatusNote: externalStatusNote || null,
    })
    setSaving(false)
    if ("error" in result) {
      setMessage({ type: "error", text: result.error ?? "Failed to update visibility" })
    } else {
      setMessage({ type: "success", text: "External visibility updated." })
      router.refresh()
    }
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 text-sm font-medium text-foreground">External Visibility</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Control what dealer/distributor users can see in their portal. When enabled, assigned external users can view order status, delivery ETA, and dispatch information.
      </p>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch
            id="external-visible"
            checked={externalVisible}
            onCheckedChange={setExternalVisible}
          />
          <Label htmlFor="external-visible" className="text-sm text-foreground">
            {externalVisible ? "Visible to external users" : "Not visible externally"}
          </Label>
        </div>

        {externalVisible && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-xs font-medium text-muted-foreground">Assign to Dealer</Label>
                <NativeSelect
                  value={dealerCompanyId}
                  onChange={(e) => setDealerCompanyId(e.target.value)} className="w-full"
                >
                  <NativeSelectOption value="">None</NativeSelectOption>
                  {dealerCompanies.map((c) => (
                    <NativeSelectOption key={c.id} value={c.id}>{c.name}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <Label className="mb-1 block text-xs font-medium text-muted-foreground">Assign to Distributor</Label>
                <NativeSelect
                  value={distributorCompanyId}
                  onChange={(e) => setDistributorCompanyId(e.target.value)} className="w-full"
                >
                  <NativeSelectOption value="">None</NativeSelectOption>
                  {distributorCompanies.map((c) => (
                    <NativeSelectOption key={c.id} value={c.id}>{c.name}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-xs font-medium text-muted-foreground">External Status Override</Label>
              <NativeSelect
                value={externalStatus ?? ""}
                onChange={(e) => setExternalStatus(e.target.value as ExternalOrderStatus || null)} className="w-full"
              >
                <NativeSelectOption value="">Auto (derived from internal status)</NativeSelectOption>
                {EXTERNAL_STATUS_OPTIONS.map((o) => (
                  <NativeSelectOption key={o.value} value={o.value}>{o.label}</NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div>
              <Label className="mb-1 block text-xs font-medium text-muted-foreground">Note to External User</Label>
              <Textarea
                value={externalStatusNote}
                onChange={(e) => setExternalStatusNote(e.target.value)}
                placeholder="Optional message visible to dealer/distributor..."
                rows={2}
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand placeholder:text-muted-foreground"
              />
            </div>
          </>
        )}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-foreground/80 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Visibility Settings"}
        </Button>

        {message && (
          <p className={`text-xs ${message.type === "success" ? "text-foreground" : "text-destructive"}`}>
            {message.text}
          </p>
        )}
      </div>
    </section>
  )
}
