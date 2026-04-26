import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getActiveDueDate, isDefectOverdue } from "@/lib/sla"
import { hasRequiredSubmissionEvidence } from "@/lib/evidence"
import type { ActionOwner, EightDSection } from "@/generated/prisma/client"

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
  evidenceReady: boolean
  createdAt: Date
}

function getEvidenceReady(evidences: { section: EightDSection }[]) {
  const counts = evidences.reduce<Partial<Record<EightDSection, number>>>((acc, item) => {
    acc[item.section] = (acc[item.section] ?? 0) + 1
    return acc
  }, {})
  return hasRequiredSubmissionEvidence(counts)
}

export const PAGE_SIZE = 20

export async function getDefects(
  filter?: string,
  search?: string,
  page?: number,
): Promise<{ defects: DefectRow[]; totalCount: number }> {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") return { defects: [], totalCount: 0 }

  const where: Record<string, unknown> = { oemId: session.user.companyId }
  if (search) {
    where.OR = [
      { partNumber: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ]
  }

  const defects = await prisma.defect.findMany({
    where,
    include: {
      supplier: { select: { name: true } },
      oemOwner: { select: { name: true, email: true } },
      supplierAssignee: { select: { name: true, email: true } },
      evidences: { where: { deletedAt: null }, select: { section: true } },
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
    evidenceReady: getEvidenceReady(d.evidences),
    createdAt: d.createdAt,
  }))

  let filtered = rows
  if (filter === "open") filtered = rows.filter((d) => d.status === "OPEN")
  else if (filter === "waiting-approval") filtered = rows.filter((d) => d.status === "WAITING_APPROVAL")
  else if (filter === "in-progress") filtered = rows.filter((d) => d.status === "IN_PROGRESS")
  else if (filter === "overdue") filtered = rows.filter((d) => d.isOverdue)
  else if (filter === "supplier") filtered = rows.filter((d) => d.currentActionOwner === "SUPPLIER")
  else if (filter === "oem") filtered = rows.filter((d) => d.currentActionOwner === "OEM")
  else if (filter === "mine") filtered = rows.filter((d) => d.oemOwnerId === session.user.id)
  else if (filter === "evidence-ready") filtered = rows.filter((d) => d.evidenceReady)
  else if (filter === "evidence-missing") filtered = rows.filter((d) => !d.evidenceReady)
  else if (filter === "has-sla") filtered = rows.filter((d) => d.activeDueDate !== null)
  else if (filter === "due-soon") {
    const now = new Date()
    filtered = rows.filter((d) => {
      if (!d.activeDueDate || d.isOverdue) return false
      const diffMs = d.activeDueDate.getTime() - now.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)
      return diffHours > 0 && diffHours <= 48
    })
  }

  const totalCount = filtered.length
  const currentPage = Math.max(1, page ?? 1)
  const start = (currentPage - 1) * PAGE_SIZE
  const paginated = filtered.slice(start, start + PAGE_SIZE)

  return { defects: paginated, totalCount }
}

export async function getSuppliers() {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") return []

  const linkedSupplierIds = await prisma.defect.findMany({
    where: { oemId: session.user.companyId },
    select: { supplierId: true },
    distinct: ["supplierId"],
  })
  const fieldDefectSupplierIds = await prisma.fieldDefect.findMany({
    where: { oemId: session.user.companyId, supplierId: { not: null } },
    select: { supplierId: true },
    distinct: ["supplierId"],
  })
  const ppapSupplierIds = await prisma.ppapSubmission.findMany({
    where: { oemId: session.user.companyId },
    select: { supplierId: true },
    distinct: ["supplierId"],
  })
  const fmeaSupplierIds = await prisma.fmea.findMany({
    where: { oemId: session.user.companyId },
    select: { supplierId: true },
    distinct: ["supplierId"],
  })
  const iqcSupplierIds = await prisma.iqcReport.findMany({
    where: { oemId: session.user.companyId },
    select: { supplierId: true },
    distinct: ["supplierId"],
  })

  const supplierIds = new Set([
    ...linkedSupplierIds.map((d) => d.supplierId),
    ...fieldDefectSupplierIds.map((d) => d.supplierId!).filter(Boolean),
    ...ppapSupplierIds.map((d) => d.supplierId),
    ...fmeaSupplierIds.map((d) => d.supplierId),
    ...iqcSupplierIds.map((d) => d.supplierId),
  ])

  const suppliers = await prisma.company.findMany({
    where: { id: { in: Array.from(supplierIds) }, type: "SUPPLIER" },
    select: {
      id: true,
      name: true,
      users: { select: { id: true, name: true, email: true }, orderBy: { name: "asc" } },
    },
    orderBy: { name: "asc" },
  })

  return suppliers
}
