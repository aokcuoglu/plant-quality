"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { XIcon, FileIcon, UploadIcon } from "lucide-react"
import { softDeleteAttachment } from "@/app/(dashboard)/field/actions"
import { cn } from "@/lib/utils"

type Attachment = {
  id: string
  storageKey: string
  fileName: string
  mimeType: string
  fileSize: number
  createdAt: Date
}

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "video/quicktime",
])

const MAX_FILE_SIZE = 20 * 1024 * 1024

export function MediaUploader({
  fieldDefectId,
  existingAttachments,
}: {
  fieldDefectId: string
  existingAttachments: Attachment[]
}) {
  const router = useRouter()
  const [attachments, setAttachments] = useState(existingAttachments)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleUpload(files: FileList) {
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (!ALLOWED_TYPES.has(file.type)) {
          alert(`Unsupported file type: ${file.type}`)
          continue
        }
        if (file.size > MAX_FILE_SIZE) {
          alert(`File too large: ${file.name}. Maximum 20MB.`)
          continue
        }

        try {
          const formData = new FormData()
          formData.append("fieldDefectId", fieldDefectId)
          formData.append("file", file)

          const res = await fetch("/api/field/attachments", {
            method: "POST",
            body: formData,
          })

          if (!res.ok) {
            const err = await res.text()
            alert(`Upload failed for ${file.name}: ${err}`)
            continue
          }

          const result = await res.json()
          setAttachments((prev) => [
            ...prev,
            {
              id: result.id,
              storageKey: result.storageKey,
              fileName: result.fileName,
              mimeType: result.mimeType,
              fileSize: result.fileSize,
              createdAt: new Date(),
            },
          ])
        } catch (e) {
          console.error("Upload error:", e)
          alert(`Upload failed for ${file.name}`)
        }
      }
      router.refresh()
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(attachmentId: string) {
    setDeleting(attachmentId)
    const result = await softDeleteAttachment(attachmentId, fieldDefectId)
    if (result.success) {
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
      router.refresh()
    }
    setDeleting(null)
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      <div
        onClick={() => document.getElementById("field-attachment-upload")?.click()}
        className={cn(
          "flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-8 text-sm text-muted-foreground transition-colors",
          uploading ? "pointer-events-none opacity-50" : "hover:border-muted-foreground hover:bg-muted/50"
        )}
      >
        {uploading ? (
          <>Uploading...</>
        ) : (
          <>
            <UploadIcon className="h-4 w-4" />
            Click to upload files (PDF, PNG, JPG, WEBP, MP4, MOV — max 20MB each)
          </>
        )}
        <input
          id="field-attachment-upload"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.mp4,.mov"
          multiple
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleUpload(e.target.files)
            }
            e.target.value = ""
          }}
        />
      </div>

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <a
                href={`/api/field/attachments/${att.storageKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm text-foreground hover:underline truncate"
              >
                {att.fileName}
              </a>
              <span className="text-xs text-muted-foreground">{formatSize(att.fileSize)}</span>
              <button
                onClick={() => handleDelete(att.id)}
                disabled={deleting === att.id}
                className="text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}