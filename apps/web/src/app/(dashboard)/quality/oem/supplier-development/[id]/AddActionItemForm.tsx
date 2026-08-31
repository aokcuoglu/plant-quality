"use client"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

import { Input } from "@/components/ui/input"

import { Button } from "@/components/ui/button"

import { addActionItem } from "@/app/(dashboard)/quality/oem/supplier-development/actions/plan"
import type { DevActionOwnerType } from "@/lib/supplier-development/client"
import { PlusCircleIcon } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { DatePicker } from "@/components/ui/date-picker"

export function AddActionItemForm({ planId }: { planId: string }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [ownerType, setOwnerType] = useState<DevActionOwnerType>("OEM")
  const [dueDate, setDueDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.set("planId", planId)
    formData.set("title", title)
    formData.set("description", description)
    formData.set("ownerType", ownerType)
    formData.set("dueDate", dueDate)

    const result = await addActionItem(formData)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error ?? "Failed to add action item")
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="ghost" className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <PlusCircleIcon className="h-4 w-4" />
        Add action item
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-md border border-dashed border-border p-3 space-y-3">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          placeholder="Action item title *"
          required
        />
        <div className="flex gap-2">
          <NativeSelect
            value={ownerType}
            onChange={(e) => setOwnerType(e.target.value as DevActionOwnerType)}
          >
            <NativeSelectOption value="OEM">OEM</NativeSelectOption>
            <NativeSelectOption value="SUPPLIER">Supplier</NativeSelectOption>
          </NativeSelect>
          <DatePicker value={dueDate} onChange={setDueDate} placeholder="Due date" className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground" />
        </div>
        <Input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="sm:col-span-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          placeholder="Description (optional)"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting} className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-foreground/90 disabled:opacity-50">
          {isSubmitting ? "Adding..." : "Add"}
        </Button>
        <Button type="button" variant="outline" onClick={() => { setIsOpen(false); setTitle(""); setDescription(""); setDueDate(""); setError(null) }} className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted">
          Cancel
        </Button>
      </div>
    </form>
  )
}
