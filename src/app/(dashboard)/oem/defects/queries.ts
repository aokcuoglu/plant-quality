import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export interface DefectRow {
  id: string
  partNumber: string
  description: string
  status: string
  supplierName: string
  createdAt: Date
}

export async function getDefects(): Promise<DefectRow[]> {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") return []

  const defects = await prisma.defect.findMany({
    where: { oemId: session.user.companyId },
    include: { supplier: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })

  return defects.map((d) => ({
    id: d.id,
    partNumber: d.partNumber,
    description: d.description,
    status: d.status,
    supplierName: d.supplier.name,
    createdAt: d.createdAt,
  }))
}

export async function getSuppliers() {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") return []

  const suppliers = await prisma.company.findMany({
    where: { type: "SUPPLIER" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return suppliers
}
