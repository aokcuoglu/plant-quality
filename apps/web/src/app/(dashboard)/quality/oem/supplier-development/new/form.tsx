"use client"

import { Label } from "@/components/ui/label"

import { Textarea } from "@/components/ui/textarea"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeftIcon, PlusCircleIcon, TrashIcon } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { createDevPlan } from "@/app/(dashboard)/quality/oem/supplier-development/actions/plan"
import type { DevPlanSourceType, DevPlanPriority, DevActionOwnerType } from "@/lib/supplier-development/client"
import { DatePicker } from "@/components/ui/date-picker"

interface Supplier { id: string; name: string }
interface OemUser { id: string; name: string | null }

interface CreateDevPlanFormProps {
  suppliers: Supplier[]
  oemUsers: OemUser[]
  prefillSupplierId: string | null
  prefillSourceType: string | null
  prefillSourceId: string | null
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  SCORECARD: "Scorecard",
  FIELD_DEFECT: "Field Defect",
  DEFECT_8D: "8D Report",
  IQC: "IQC",
  PPAP: "PPAP",
  FMEA: "FMEA",
  EXECUTIVE_COCKPIT: "Executive Cockpit",
  MANUAL: "Manual",
}

export function CreateDevPlanForm({ suppliers, oemUsers, prefillSupplierId, prefillSourceType, prefillSourceId }: CreateDevPlanFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [supplierId, setSupplierId] = useState(prefillSupplierId || "")
  const [priority, setPriority] = useState<DevPlanPriority>("MEDIUM")
  const [sourceType, setSourceType] = useState<DevPlanSourceType | "">((prefillSourceType as DevPlanSourceType) || "")
  const [dueDate, setDueDate] = useState("")
  const [ownerId, setOwnerId] = useState("")
  const [status, setStatus] = useState<"DRAFT" | "OPEN">("DRAFT")

  const [actionItems, setActionItems] = useState<Array<{
    id: string
    title: string
    description: string
    ownerType: DevActionOwnerType
    ownerId: string
    dueDate: string
  }>>([])

  const addActionItem = () => {
    setActionItems([...actionItems, {
      id: crypto.randomUUID(),
      title: "",
      description: "",
      ownerType: "OEM",
      ownerId: "",
      dueDate: "",
    }])
  }

  const removeActionItem = (id: string) => {
    setActionItems(actionItems.filter((item) => item.id !== id))
  }

  const updateActionItem = (id: string, field: string, value: string) => {
    setActionItems(actionItems.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.set("title", title)
    formData.set("description", description)
    formData.set("supplierId", supplierId)
    formData.set("priority", priority)
    formData.set("status", status)
    if (sourceType) formData.set("sourceType", sourceType)
    if (prefillSourceId) formData.set("sourceId", prefillSourceId)
    if (dueDate) formData.set("dueDate", dueDate)
    if (ownerId) formData.set("ownerId", ownerId)

    const validItems = actionItems.filter((item) => item.title.trim())
    if (validItems.length > 0) {
      formData.set("actionItems", JSON.stringify(validItems.map(({ id: _id, ...rest }) => rest)))
    }

    const result = await createDevPlan(formData)
    if (result.success) {
      router.push(`/quality/oem/supplier-development/${result.id}`)
    } else {
      setError(result.error)
    }
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/quality/oem/supplier-development" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <PageHeader title="Create Development Plan" description="Start a new supplier development action plan" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Plan Details</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title *</Label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground"
                placeholder="e.g. Quality Improvement Plan Q2 2026"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Supplier *</Label>
              <NativeSelect
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)} className="w-full"
                required
              >
                <NativeSelectOption value="">Select supplier</NativeSelectOption>
                {suppliers.map((s) => (
                  <NativeSelectOption key={s.id} value={s.id}>{s.name}</NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</Label>
              <NativeSelect
                value={priority}
                onChange={(e) => setPriority(e.target.value as DevPlanPriority)} className="w-full"
              >
                <NativeSelectOption value="LOW">Low</NativeSelectOption>
                <NativeSelectOption value="MEDIUM">Medium</NativeSelectOption>
                <NativeSelectOption value="HIGH">High</NativeSelectOption>
                <NativeSelectOption value="CRITICAL">Critical</NativeSelectOption>
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</Label>
              <DatePicker value={dueDate} onChange={setDueDate} placeholder="mm / dd / yyyy" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Source Type</Label>
              <NativeSelect
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as DevPlanSourceType | "")} className="w-full"
              >
                <NativeSelectOption value="">None</NativeSelectOption>
                {Object.entries(SOURCE_TYPE_LABELS).map(([key, label]) => (
                  <NativeSelectOption key={key} value={key}>{label}</NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Owner</Label>
              <NativeSelect
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)} className="w-full"
              >
                <NativeSelectOption value="">Unassigned</NativeSelectOption>
                {oemUsers.map((u) => (
                  <NativeSelectOption key={u.id} value={u.id}>{u.name || u.id}</NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground"
                placeholder="Describe the improvement goals and context for this plan..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Initial Status</Label>
            <RadioGroup
              name="initialStatus"
              value={status}
              onValueChange={(value) => setStatus(value as "DRAFT" | "OPEN")}
              className="flex gap-3"
            >
              <Label className="flex items-center gap-2 text-sm text-foreground">
                <RadioGroupItem value="DRAFT" />
                Draft
              </Label>
              <Label className="flex items-center gap-2 text-sm text-foreground">
                <RadioGroupItem value="OPEN" />
                Open (visible to supplier immediately)
              </Label>
            </RadioGroup>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Action Items</h2>
            <Button type="button" variant="outline" size="sm" onClick={addActionItem}>
              <PlusCircleIcon className="mr-1.5 h-3.5 w-3.5" />Add Item
            </Button>
          </div>

          {actionItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No action items yet. You can add items now or after creating the plan.</p>
          ) : (
            <div className="space-y-3">
              {actionItems.map((item, idx) => (
                <div key={item.id} className="rounded-md border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
                    <Button type="button" onClick={() => removeActionItem(item.id)} variant="destructive" className="text-muted-foreground hover:text-destructive transition-colors">
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateActionItem(item.id, "title", e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                        placeholder="Action item title"
                      />
                    </div>
                    <div className="flex gap-3">
                      <NativeSelect
                        value={item.ownerType}
                        onChange={(e) => updateActionItem(item.id, "ownerType", e.target.value)}
                      >
                        <NativeSelectOption value="OEM">OEM</NativeSelectOption>
                        <NativeSelectOption value="SUPPLIER">Supplier</NativeSelectOption>
                      </NativeSelect>
                      <DatePicker value={item.dueDate} onChange={(d) => updateActionItem(item.id, "dueDate", d)} placeholder="mm / dd / yyyy" />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateActionItem(item.id, "description", e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                        placeholder="Description (optional)"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : status === "DRAFT" ? "Save as Draft" : "Create & Open Plan"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/quality/oem/supplier-development")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
