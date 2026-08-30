import { prisma } from "@/lib/prisma"

export interface SimilarIssue {
  id: string
  title: string
  status: string
  severity: string
  supplierName: string | null
  vehicleModel: string | null
  partNumber: string | null
  partName: string | null
  similarityReasons: string[]
  similarityScore: number
  sourceType: "field_defect" | "defect"
  category: string | null
  subcategory: string | null
}

const SCORE_VIN_EXACT = 40
const SCORE_PART_NUMBER_CONTAINS = 25
const SCORE_SAME_SUPPLIER = 15
const SCORE_VEHICLE_MODEL = 10
const SCORE_TITLE_KEYWORDS = 10
const SCORE_DESC_KEYWORDS = 5
const SCORE_SAME_CATEGORY = 10
const SCORE_SAME_SUBCATEGORY = 15
const SCORE_SAME_PROBABLE_AREA = 5

export async function findSimilarIssues(
  companyId: string,
  fieldDefectId: string,
  input: {
    title: string
    description?: string | null
    partNumber?: string | null
    partName?: string | null
    vehicleModel?: string | null
    vin?: string | null
    supplierId?: string | null
    category?: string | null
    subcategory?: string | null
    probableArea?: string | null
  },
  limit = 10,
): Promise<SimilarIssue[]> {
  const orConditions: Record<string, unknown>[] = [
    { title: { contains: input.title, mode: "insensitive" } },
  ]

  if (input.description) {
    const words = input.description
      .split(/\s+/)
      .filter((w) => w.length >= 4)
      .slice(0, 8)
    for (const word of words) {
      orConditions.push({ description: { contains: word, mode: "insensitive" } })
    }
  }

  if (input.partNumber) {
    orConditions.push({ partNumber: { contains: input.partNumber, mode: "insensitive" } })
  }
  if (input.vehicleModel) {
    orConditions.push({ vehicleModel: { contains: input.vehicleModel, mode: "insensitive" } })
  }
  if (input.vin) {
    orConditions.push({ vin: { equals: input.vin, mode: "insensitive" } })
  }
  if (input.supplierId) {
    orConditions.push({ supplierId: input.supplierId })
  }
  if (input.category) {
    orConditions.push({ category: { equals: input.category, mode: "insensitive" } })
  }
  if (input.subcategory) {
    orConditions.push({ subcategory: { equals: input.subcategory, mode: "insensitive" } })
  }

  const fieldDefects = await prisma.fieldDefect.findMany({
    where: {
      oemId: companyId,
      id: { not: fieldDefectId },
      deletedAt: null,
      OR: orConditions,
    },
    select: {
      id: true,
      title: true,
      status: true,
      severity: true,
      vehicleModel: true,
      partNumber: true,
      partName: true,
      supplierId: true,
      supplier: { select: { name: true } },
      description: true,
      vin: true,
      category: true,
      subcategory: true,
      probableArea: true,
    },
    take: 50,
    orderBy: { createdAt: "desc" },
  })

  const scored: SimilarIssue[] = fieldDefects
    .map((fd) => {
      let score = 0
      const reasons: string[] = []

      if (input.vin && fd.vin?.toLowerCase() === input.vin.toLowerCase()) {
        score += SCORE_VIN_EXACT
        reasons.push("Same VIN")
      }
      if (input.partNumber && fd.partNumber?.toLowerCase().includes(input.partNumber.toLowerCase())) {
        score += SCORE_PART_NUMBER_CONTAINS
        reasons.push("Same part number")
      }
      if (input.supplierId && fd.supplierId === input.supplierId) {
        score += SCORE_SAME_SUPPLIER
        reasons.push("Same supplier")
      }
      if (input.vehicleModel && fd.vehicleModel?.toLowerCase().includes(input.vehicleModel.toLowerCase())) {
        score += SCORE_VEHICLE_MODEL
        reasons.push("Same vehicle model")
      }
      if (input.category && fd.category?.toLowerCase() === input.category.toLowerCase()) {
        score += SCORE_SAME_CATEGORY
        reasons.push("Same category")
      }
      if (input.subcategory && fd.subcategory?.toLowerCase() === input.subcategory.toLowerCase()) {
        score += SCORE_SAME_SUBCATEGORY
        reasons.push("Same subcategory")
      }
      if (input.probableArea && fd.probableArea?.toLowerCase() === input.probableArea.toLowerCase()) {
        score += SCORE_SAME_PROBABLE_AREA
        reasons.push("Same probable area")
      }
      const titleWords = input.title.toLowerCase().split(/\s+/).filter((w) => w.length >= 4)
      const matchingTitleWords = titleWords.filter((w) => fd.title.toLowerCase().includes(w))
      if (matchingTitleWords.length >= 2) {
        score += SCORE_TITLE_KEYWORDS
        reasons.push(`Similar title (${matchingTitleWords.length} keywords)`)
      }
      if (input.description) {
        const descWords = input.description
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length >= 4)
          .slice(0, 8)
        const matchingDescWords = descWords.filter(
          (w) => fd.description?.toLowerCase().includes(w),
        )
        if (matchingDescWords.length >= 2) {
          score += SCORE_DESC_KEYWORDS
          reasons.push("Similar description")
        }
      }

      if (reasons.length === 0) {
        reasons.push("Partial text match")
        score += 1
      }

      return {
        id: fd.id,
        title: fd.title,
        status: fd.status,
        severity: fd.severity,
        supplierName: fd.supplier?.name ?? null,
        vehicleModel: fd.vehicleModel,
        partNumber: fd.partNumber,
        partName: fd.partName,
        similarityReasons: reasons,
        similarityScore: score,
        sourceType: "field_defect" as const,
        category: fd.category,
        subcategory: fd.subcategory,
      }
    })
    .filter((r) => r.similarityScore > 0)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit)

  return scored
}