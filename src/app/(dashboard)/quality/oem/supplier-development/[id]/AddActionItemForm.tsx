"use client"

import { addActionItem } from "@/app/(dashboard)/quality/oem/supplier-development/actions/plan"
import type { DevActionOwnerType } from "@/lib/supplier-development/client"
import { PlusCircleIcon } from "lucide-react"
import { useState } from "react"

export function AddActionItemForm({ planId }: { planId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [ownerType, setOwnerType] = useState<DevActionOwnerType>("OEM")
  const [dueDate, setDueDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setIsSubmitting(true)

    const formData = new FormData()
    formData.set("planId", planId)
    formData.set("title", title)
    formData.set("description", description)
    formData.set("ownerType", ownerType)
    formData.set("dueDate", dueDate)

    await addActionItem(formData)
    setTitle("")
    setDescription("")
    setDueDate("")
    setIsOpen(false)
    setIsSubmitting(false)
    window.location.reload()
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <PlusCircleIcon className="h-4 w-4" />
        Add action item
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-md border border-dashed border-border p-3 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          placeholder="Action item title *"
          required
        />
        <div className="flex gap-2">
          <select
            value={ownerType}
            onChange={(e) => setOwnerType(e.target.value as DevActionOwnerType)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          >
            <option value="OEM">OEM</option>
            <option value="SUPPLIER">Supplier</option>
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          />
        </div>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="sm:col-span-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          placeholder="Description (optional)"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={isSubmitting} className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-emerald-600 disabled:opacity-50">
          {isSubmitting ? "Adding..." : "Add"}
        </button>
        <button type="button" onClick={() => setIsOpen(false)} className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted">
          Cancel
        </button>
      </div>
    </form>
  )
}