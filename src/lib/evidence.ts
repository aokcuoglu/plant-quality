import { randomUUID } from "crypto"
import type { EightDSection } from "@/generated/prisma/client"

export const EVIDENCE_SECTIONS: EightDSection[] = ["D3", "D5", "D6", "D7"]
export const REQUIRED_EVIDENCE_SECTIONS: EightDSection[] = ["D5", "D6", "D7"]

export const MAX_EVIDENCE_FILE_SIZE_BYTES = 20 * 1024 * 1024
export const MAX_EVIDENCE_FILES_PER_SECTION = 15

export const ALLOWED_EVIDENCE_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
])

export function sanitizeFileName(fileName: string) {
  const normalized = fileName.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "")
  if (!normalized) return "evidence.bin"
  return normalized.toLowerCase()
}

export function buildEvidenceStorageKey(defectId: string, section: EightDSection, fileName: string) {
  return `defects/${defectId}/evidence/${section}/${randomUUID()}-${sanitizeFileName(fileName)}`
}

export function formatEvidenceSectionLabel(section: EightDSection) {
  switch (section) {
    case "D3":
      return "D3 Containment"
    case "D5":
      return "D5 Corrective Action"
    case "D6":
      return "D6 Validation"
    case "D7":
      return "D7 Preventive Action"
    default:
      return section
  }
}

export function validateEvidenceFile(file: File) {
  if (!ALLOWED_EVIDENCE_MIME_TYPES.has(file.type)) {
    return { ok: false as const, error: "Unsupported file type. Allowed: PDF, PNG, JPG, WEBP." }
  }
  if (file.size > MAX_EVIDENCE_FILE_SIZE_BYTES) {
    return { ok: false as const, error: "File is too large. Maximum size is 20 MB." }
  }
  return { ok: true as const }
}

export function getMissingRequiredEvidenceSections(
  counts: Partial<Record<EightDSection, number>>,
) {
  return REQUIRED_EVIDENCE_SECTIONS.filter((section) => (counts[section] ?? 0) < 1)
}

export function hasRequiredSubmissionEvidence(
  counts: Partial<Record<EightDSection, number>>,
) {
  return getMissingRequiredEvidenceSections(counts).length === 0
}
