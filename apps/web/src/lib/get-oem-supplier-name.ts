import { prisma } from "@/lib/prisma"

export async function getOemSupplierName(
  oemId: string,
  supplierId: string
): Promise<string | null> {
  const supplier = await prisma.company.findFirst({
    where: { id: supplierId, type: "SUPPLIER" },
    select: { id: true, name: true, primaryOemId: true },
  })
  if (!supplier) return null

  if (supplier.primaryOemId === oemId) return supplier.name

  const hasRelation = await prisma.defect.findFirst({
    where: { oemId, supplierId },
    select: { id: true },
  })
  if (hasRelation) return supplier.name

  const hasFieldDefect = await prisma.fieldDefect.findFirst({
    where: { oemId, supplierId, deletedAt: null },
    select: { id: true },
  })
  if (hasFieldDefect) return supplier.name

  const hasPpap = await prisma.ppapSubmission.findFirst({
    where: { oemId, supplierId },
    select: { id: true },
  })
  if (hasPpap) return supplier.name

  const hasIqc = await prisma.iqcReport.findFirst({
    where: { oemId, supplierId },
    select: { id: true },
  })
  if (hasIqc) return supplier.name

  const hasFmea = await prisma.fmea.findFirst({
    where: { oemId, supplierId },
    select: { id: true },
  })
  if (hasFmea) return supplier.name

  return null
}