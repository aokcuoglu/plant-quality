import { prisma } from "@/lib/prisma"

export async function assertSupplierBelongsToOem(
  supplierId: string,
  oemCompanyId: string,
): Promise<boolean> {
  const supplier = await prisma.company.findFirst({
    where: { id: supplierId, type: "SUPPLIER" },
    select: { id: true },
  })
  if (!supplier) return false

  const isAssociated = await prisma.company.findFirst({
    where: {
      id: supplierId,
      type: "SUPPLIER",
      OR: [
        { defectsAsSup: { some: { oemId: oemCompanyId } } },
        { ppapAsSup: { some: { oemId: oemCompanyId } } },
        { iqcAsSup: { some: { oemId: oemCompanyId } } },
        { fmeaAsSup: { some: { oemId: oemCompanyId } } },
        { fieldDefectsAsSup: { some: { oemId: oemCompanyId } } },
        { devPlansAsSupplier: { some: { oemId: oemCompanyId } } },
      ],
    },
    select: { id: true },
  })

  return !!isAssociated
}