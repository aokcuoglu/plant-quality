"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { createDefect } from "../actions"
import { Button } from "@/components/ui/button"
import { ImageUploader, type UploadedImage } from "@/components/ImageUploader"
import { XIcon } from "lucide-react"

export function NewDefectForm({ suppliers }: { suppliers: { id: string; name: string }[] }) {
  const [images, setImages] = useState<UploadedImage[]>([])
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        formData.set("imageUrls", JSON.stringify(images.map((i) => i.publicUrl)))
        await createDefect(formData)
      }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <label htmlFor="supplierId" className="text-sm font-medium">
          Supplier
        </label>
        <select
          id="supplierId"
          name="supplierId"
          required
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">Select a supplier...</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="partNumber" className="text-sm font-medium">
          Part Number
        </label>
        <input
          id="partNumber"
          name="partNumber"
          type="text"
          required
          placeholder="e.g. AX-7420-B"
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Defect Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          placeholder="Describe the defect in detail..."
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <ImageUploader onImagesChange={setImages} />

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit">Create Defect</Button>
        <Link
          href="/oem/defects"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
