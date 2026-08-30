"use client"

import { useCallback, useState, useRef, type DragEvent } from "react"
import { ImageIcon, Loader2, XIcon, UploadIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadedImage {
  key: string
  publicUrl: string
}

export function ImageUploader({
  onImagesChange,
  existingImages,
}: {
  onImagesChange: (images: UploadedImage[]) => void
  existingImages?: UploadedImage[]
}) {
  const [images, setImages] = useState<UploadedImage[]>(existingImages ?? [])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return

      setUploading(true)
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, contentType: file.type }),
        })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text)
        }

        const { key, uploadUrl } = await res.json()

        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        })
        if (!putRes.ok) {
          const text = await putRes.text()
          throw new Error(text)
        }

        const publicUrl = `/api/image?key=${encodeURIComponent(key)}&t=${Date.now()}`
        const next = [...images, { key, publicUrl }]
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

  const handleFiles = useCallback(
    (files: FileList) => {
      for (const file of Array.from(files)) {
        if (file.type.startsWith("image/")) {
          handleFile(file)
        }
      }
    },
    [handleFile],
  )

  const removeImage = useCallback(
    (key: string) => {
      const next = images.filter((img) => img.key !== key)
      setImages(next)
      onImagesChange(next)
    },
    [images, onImagesChange],
  )

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles],
  )

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

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

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-8 text-sm text-muted-foreground transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-input hover:border-muted-foreground",
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            {dragOver ? <UploadIcon className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
            {dragOver ? "Drop images here" : "Click or drag & drop images"}
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files)
            }
            e.target.value = ""
          }}
        />
      </div>
    </div>
  )
}

export type { UploadedImage }
