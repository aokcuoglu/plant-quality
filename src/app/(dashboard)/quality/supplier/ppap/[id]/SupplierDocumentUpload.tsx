"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { uploadPpapDocument } from "../actions/submit"
import { PPAP_DOCUMENT_STATUS_LABELS, getDocumentStatusColor } from "@/lib/ppap"

export function SupplierDocumentUpload({
  evidence,
  ppapId,
  canUpload,
  requirementLabel,
}: {
  evidence: {
    id: string
    requirement: string
    status: string
    fileName: string | null
    sizeBytes: number | null
    supplierComment: string | null
    oemComment: string | null
  }
  ppapId: string
  canUpload: boolean
  requirementLabel: string
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [supplierComment, setSupplierComment] = useState("")
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isMissing = evidence.status === "MISSING"
  const needsRevision = evidence.status === "REVISION_REQUIRED"
  const canUploadThis = canUpload && (isMissing || needsRevision)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setError(null)
  }

  async function handleUpload() {
    if (!selectedFile) return
    setUploading(true)
    setError(null)

    try {
      const res = await fetch("/api/ppap/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ppapId,
          requirement: evidence.requirement,
          fileName: selectedFile.name,
          contentType: selectedFile.type || "application/octet-stream",
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.key || !data.uploadUrl) {
        throw new Error(data.error || "Failed to get upload URL")
      }

      const uploadRes = await fetch(data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type || "application/octet-stream" },
        body: selectedFile,
      })
      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to storage")
      }

      const formData = new FormData()
      formData.set("supplierComment", supplierComment)

      const result = await uploadPpapDocument(ppapId, evidence.requirement, formData)
      if (!result.success) {
        throw new Error(result.error ?? "Failed to update document record")
      }

      if (result.evidenceId) {
        const putRes = await fetch("/api/ppap/upload", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            evidenceId: result.evidenceId,
            storageKey: data.key,
            fileName: selectedFile.name,
            mimeType: selectedFile.type || "application/octet-stream",
            sizeBytes: selectedFile.size,
            supplierComment: supplierComment || null,
          }),
        })
        if (!putRes.ok) {
          const putData = await putRes.json().catch(() => null)
          throw new Error(putData?.error || "Failed to save file metadata")
        }
      }

      setSelectedFile(null)
      setSupplierComment("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-lg border bg-background p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{requirementLabel}</p>
          {evidence.fileName && (
            <p className="text-xs text-muted-foreground truncate">
              {evidence.fileName} {evidence.sizeBytes ? `(${(evidence.sizeBytes / 1024).toFixed(1)} KB)` : ""}
            </p>
          )}
        </div>
        <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getDocumentStatusColor(evidence.status)}`}>
          {PPAP_DOCUMENT_STATUS_LABELS[evidence.status] ?? evidence.status}
        </span>
      </div>

      {evidence.oemComment && (
        <div className="rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-xs text-amber-400">
          OEM: {evidence.oemComment}
        </div>
      )}

      {error && (
        <div className="rounded border border-red-500/20 bg-red-500/5 px-2 py-1 text-xs text-red-400">
          {error}
        </div>
      )}

      {canUploadThis && (
        <div className="border-t border-border pt-2 space-y-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
              className="block w-full text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted/80 disabled:opacity-50"
            />
          </div>
          {selectedFile && (
            <div className="space-y-2">
              <input
                type="text"
                value={supplierComment}
                onChange={(e) => setSupplierComment(e.target.value)}
                placeholder="Optional comment..."
                disabled={uploading}
                className="flex w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              />
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          )}
        </div>
      )}

      {evidence.status === "APPROVED" && (
        <div className="text-xs text-emerald-400">Document approved by OEM</div>
      )}
      {evidence.status === "REJECTED" && (
        <div className="text-xs text-red-400">Document rejected by OEM{evidence.oemComment ? `: ${evidence.oemComment}` : ""}</div>
      )}
      {evidence.status === "UPLOADED" && !canUploadThis && (
        <div className="text-xs text-muted-foreground">Awaiting OEM review</div>
      )}
      {evidence.status === "UNDER_REVIEW" && (
        <div className="text-xs text-muted-foreground">Under OEM review</div>
      )}
    </div>
  )
}