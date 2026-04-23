"use client"

import { useCallback, useState } from "react"
import { ImageIcon, Loader2, XIcon } from "lucide-react"

interface UploadedImage {
  key: string
  publicUrl: string
}

export function ImageUploader({
  onImagesChange,
}: {
  onImagesChange: (images: UploadedImage[]) => void
}) {
  const [images, setImages] = useState<UploadedImage[]>([])
  const [uploading, setUploading] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return

      setUploading(true)
      try {
        const body = new FormData()
        body.set("file", file)

        const res = await fetch("/api/upload", { method: "POST", body })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text)
        }

        const data = await res.json()

        const next = [...images, { key: data.key, publicUrl: `/api/image?key=${encodeURIComponent(data.key)}&t=${Date.now()}` }]
        setImages(next)
        onImagesChange(next)
      } catch (e) {
        console.error("Upload error:", e)
      } finally {
        setUploading(false)
      }
    },
    [images, onImagesChange],
  )

  const removeImage = useCallback(
    (key: string) => {
      const next = images.filter((img) => img.key !== key)
      setImages(next)
      onImagesChange(next)
    },
    [images, onImagesChange],
  )

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Images</label>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <div key={img.key} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.publicUrl}
                alt=""
                className="h-20 w-20 rounded-md border object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(img.key)}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 py-6 text-sm text-muted-foreground transition-colors hover:border-muted-foreground">
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <ImageIcon className="h-4 w-4" />
            Click to add images (optional)
          </>
        )}
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ""
          }}
        />
      </label>
    </div>
  )
}

export type { UploadedImage }
