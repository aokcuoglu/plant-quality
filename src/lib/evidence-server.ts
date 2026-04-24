import type { Session } from "next-auth"
import type { DefectStatus, EightDSection } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { getMissingRequiredEvidenceSections } from "@/lib/evidence"

type AccessMode = "read" | "write"

const SUPPLIER_EDITABLE_STATUSES: DefectStatus[] = ["OPEN", "IN_PROGRESS", "REJECTED"]

export async function getEvidenceCountsBySection(defectId: string) {
  const rows = await prisma.defectEvidence.groupBy({
    by: ["section"],
    where: { defectId, deletedAt: null },
    _count: { _all: true },
  })

  const counts: Partial<Record<EightDSection, number>> = {}
  for (const row of rows) counts[row.section] = row._count._all
  return counts
}

export async function getMissingEvidenceForSubmission(defectId: string) {
  const counts = await getEvidenceCountsBySection(defectId)
  return getMissingRequiredEvidenceSections(counts)
}

export async function canUserAccessDefectEvidence(
  session: Session | null,
  defectId: string,
  mode: AccessMode,
) {
  if (!session?.user?.companyId || !session.user.companyType || !session.user.role) {
    return { ok: false as const, error: "Unauthorized" }
  }

  const where =
    session.user.companyType === "OEM"
      ? { id: defectId, oemId: session.user.companyId }
      : { id: defectId, supplierId: session.user.companyId }

  const defect = await prisma.defect.findFirst({
    where,
    select: { id: true, status: true, oemId: true, supplierId: true },
  })
  if (!defect) return { ok: false as const, error: "Defect not found" }

  if (mode === "read") return { ok: true as const, defect }

  if (
    session.user.companyType !== "SUPPLIER" ||
    !["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)
  ) {
    return { ok: false as const, error: "Unauthorized" }
  }

  if (!SUPPLIER_EDITABLE_STATUSES.includes(defect.status)) {
    return { ok: false as const, error: "Evidence is locked while awaiting customer review or after approval." }
  }

  return { ok: true as const, defect }
}
