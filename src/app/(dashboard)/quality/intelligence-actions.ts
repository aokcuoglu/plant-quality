"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/billing"

export async function getQualityIntelligenceSummary() {
  const session = await auth()
  if (!session?.user?.companyId || session.user.companyType !== "OEM") {
    return null
  }

  const featureGate = requireFeature(session, "QUALITY_INTELLIGENCE")
  if (!featureGate.allowed) {
    return null
  }

  const companyId = session.user.companyId

  const [
    totalDefects,
    openDefects,
    overdueDefects,
    criticalDefects,
    categoryCounts,
    subcategoryCounts,
    vehicleModelCounts,
    supplierCounts,
    partNumberCounts,
    totalClassificationSuggestions,
    acceptedClassificationSuggestions,
  ] = await Promise.all([
    prisma.fieldDefect.count({
      where: { oemId: companyId, deletedAt: null },
    }),
    prisma.fieldDefect.count({
      where: {
        oemId: companyId,
        deletedAt: null,
        status: { in: ["OPEN", "UNDER_REVIEW", "SUPPLIER_ASSIGNED"] },
      },
    }),
    prisma.fieldDefect.count({
      where: {
        oemId: companyId,
        deletedAt: null,
        status: { in: ["OPEN", "UNDER_REVIEW", "SUPPLIER_ASSIGNED"] },
        OR: [
          { responseDueAt: { lt: new Date() } },
          { resolutionDueAt: { lt: new Date() } },
        ],
      },
    }),
    prisma.fieldDefect.count({
      where: {
        oemId: companyId,
        deletedAt: null,
        severity: "CRITICAL",
      },
    }),
    prisma.fieldDefect.groupBy({
      by: ["category"],
      where: {
        oemId: companyId,
        deletedAt: null,
        category: { not: null },
      },
      _count: { category: true },
      orderBy: { _count: { category: "desc" } },
      take: 10,
    }),
    prisma.fieldDefect.groupBy({
      by: ["subcategory"],
      where: {
        oemId: companyId,
        deletedAt: null,
        subcategory: { not: null },
      },
      _count: { subcategory: true },
      orderBy: { _count: { subcategory: "desc" } },
      take: 10,
    }),
    prisma.fieldDefect.groupBy({
      by: ["vehicleModel"],
      where: {
        oemId: companyId,
        deletedAt: null,
        vehicleModel: { not: null },
      },
      _count: { vehicleModel: true },
      orderBy: { _count: { vehicleModel: "desc" } },
      take: 10,
    }),
    prisma.fieldDefect.groupBy({
      by: ["supplierId"],
      where: {
        oemId: companyId,
        deletedAt: null,
        supplierId: { not: null },
      },
      _count: { supplierId: true },
      orderBy: { _count: { supplierId: "desc" } },
      take: 10,
    }),
    prisma.fieldDefect.groupBy({
      by: ["partNumber"],
      where: {
        oemId: companyId,
        deletedAt: null,
        partNumber: { not: null },
      },
      _count: { partNumber: true },
      orderBy: { _count: { partNumber: "desc" } },
      take: 10,
    }),
    prisma.aiSuggestion.count({
      where: {
        companyId,
        suggestionType: "CLASSIFICATION",
      },
    }),
    prisma.aiSuggestion.count({
      where: {
        companyId,
        suggestionType: "CLASSIFICATION",
        status: "ACCEPTED",
      },
    }),
  ])

  const supplierIds = supplierCounts
    .map((s) => s.supplierId)
    .filter((id): id is string => id !== null)

  const suppliers = await prisma.company.findMany({
    where: { id: { in: supplierIds } },
    select: { id: true, name: true },
  })

  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]))

  const topCategories = categoryCounts
    .filter((c) => c.category !== null)
    .map((c) => ({
      name: c.category ?? "Unknown",
      count: c._count.category,
    }))

  const topSubcategories = subcategoryCounts
    .filter((c) => c.subcategory !== null)
    .map((c) => ({
      name: c.subcategory ?? "Unknown",
      count: c._count.subcategory,
    }))

  const topVehicleModels = vehicleModelCounts
    .filter((c) => c.vehicleModel !== null)
    .map((c) => ({
      name: c.vehicleModel ?? "Unknown",
      count: c._count.vehicleModel,
    }))

  const topSuppliers = supplierCounts
    .filter((c) => c.supplierId !== null)
    .map((c) => ({
      id: c.supplierId ?? "",
      name: supplierMap.get(c.supplierId!) ?? "Unknown",
      count: c._count.supplierId,
    }))

  const topPartNumbers = partNumberCounts
    .filter((c) => c.partNumber !== null)
    .map((c) => ({
      name: c.partNumber ?? "Unknown",
      count: c._count.partNumber,
    }))

  const aiAcceptanceRate = totalClassificationSuggestions > 0
    ? Math.round((acceptedClassificationSuggestions / totalClassificationSuggestions) * 100)
    : null

  return {
    totalDefects,
    openDefects,
    overdueDefects,
    criticalDefects,
    topCategories,
    topSubcategories,
    topVehicleModels,
    topSuppliers,
    topPartNumbers,
    totalClassificationSuggestions,
    acceptedClassificationSuggestions,
    aiAcceptanceRate,
  }
}