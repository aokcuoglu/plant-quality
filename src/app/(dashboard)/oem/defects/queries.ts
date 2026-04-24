import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getActiveDueDate, isDefectOverdue } from "@/lib/sla"
import type { ActionOwner } from "@/generated/prisma/client"

export interface DefectRow {
  id: string
  partNumber: string
  description: string
  status: string
  supplierName: string
  oemOwnerId: string | null
  oemOwnerName: string | null
  supplierAssigneeName: string | null
  currentActionOwner: ActionOwner
  activeDueDate: Date | null
  isOverdue: boolean
  createdAt: Date
}

export async function getDefects(filter?: string): Promise<DefectRow[]> {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") return []

  const defects = await prisma.defect.findMany({
    where: { oemId: session.user.companyId },
    include: {
      supplier: { select: { name: true } },
      oemOwner: { select: { name: true, email: true } },
      supplierAssignee: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const rows = defects.map((d) => ({
    id: d.id,
    partNumber: d.partNumber,
    description: d.description,
    status: d.status,
    supplierName: d.supplier.name,
    oemOwnerId: d.oemOwnerId,
    oemOwnerName: d.oemOwner?.name ?? d.oemOwner?.email ?? null,
    supplierAssigneeName: d.supplierAssignee?.name ?? d.supplierAssignee?.email ?? null,
    currentActionOwner: d.currentActionOwner,
    activeDueDate: getActiveDueDate(d),
    isOverdue: isDefectOverdue(d),
    createdAt: d.createdAt,
  }))

  if (filter === "overdue") return rows.filter((d) => d.isOverdue)
  if (filter === "supplier") return rows.filter((d) => d.currentActionOwner === "SUPPLIER")
  if (filter === "oem") return rows.filter((d) => d.currentActionOwner === "OEM")
  if (filter === "mine") return rows.filter((d) => d.oemOwnerId === session.user.id)
  return rows
}

export async function getSuppliers() {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") return []

  const suppliers = await prisma.company.findMany({
    where: { type: "SUPPLIER" },
    select: {
      id: true,
      name: true,
      users: { select: { id: true, name: true, email: true }, orderBy: { name: "asc" } },
    },
    orderBy: { name: "asc" },
  })

  return suppliers
}
