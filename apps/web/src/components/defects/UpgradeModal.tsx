"use client"

import { useState } from "react"
import { SparklesIcon, CheckIcon, XIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { UpgradeRequestDialog } from "@/components/billing/UpgradeRequestDialog"

const PRO_FEATURES = [
  "AI Brainstorm for D2, D3, D4, D7 steps",
  "AI Vision — analyze defect photos",
  "Priority support",
  "Unlimited team members",
]

export function UpgradeModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [showRequest, setShowRequest] = useState(false)

  return (
    <>
      <Dialog open={open && !showRequest} onOpenChange={(v) => { if (!v) onOpenChange(false) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-destructive" />
              Upgrade to PRO
            </DialogTitle>
            <DialogDescription>
              Unlock AI-powered features to accelerate your 8D problem-solving process.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-2">
            <div className="rounded-lg border bg-card">
              <div className="grid grid-cols-3 gap-0 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
                <div className="p-3" />
                <div className="p-3 text-center">Basic</div>
                <div className="p-3 text-center">PRO</div>
              </div>
              <div className="divide-y">
                {[
                  { label: "8D Report Wizard", basic: true, pro: true },
                  { label: "AI Brainstorm", basic: false, pro: true },
                  { label: "AI Vision Analysis", basic: false, pro: true },
                  { label: "Priority Support", basic: false, pro: true },
                  { label: "Unlimited Team Members", basic: true, pro: true },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-3 gap-0 text-sm">
                    <div className="p-3 text-muted-foreground">{row.label}</div>
                    <div className="flex items-center justify-center p-3">
                      {row.basic ? <CheckIcon className="h-4 w-4 text-foreground" /> : <XIcon className="h-4 w-4 text-muted-foreground/50" />}
                    </div>
                    <div className="flex items-center justify-center p-3">
                      <CheckIcon className="h-4 w-4 text-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border bg-destructive/5 p-4 ">
              <h4 className="text-sm font-semibold">PRO Features</h4>
              <ul className="space-y-2">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <SparklesIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <Button className="w-full" onClick={() => setShowRequest(true)}>
              Request PRO Upgrade
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <UpgradeRequestDialog
        open={showRequest}
        onOpenChange={(v) => { setShowRequest(v); if (!v) onOpenChange(false) }}
        currentPlan="FREE"
        requestedPlan="PRO"
        sourceFeature="EIGHT_D"
      />
    </>
  )
}
