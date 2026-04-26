"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getFieldDefectSlaStatus } from "@/lib/sla-field-defect"
import type { EscalationLevel, FieldDefectStatus } from "@/generated/prisma/client"

export interface EscalationRow {
  id: string
  entityType: string
  entityId: string
  title: string
  previousLevel: EscalationLevel
  newLevel: EscalationLevel
  reason: string
  createdAt: Date
  createdByName: string | null
  fieldDefectTitle?: string
  fieldDefectStatus?: string
  partNumber?: string
  supplierName?: string
}

export async function getEscalations(
  filter?: string,
  page = 1,
  pageSize = 20,
): Promise<{ escalations: EscalationRow[]; totalCount: number }> {
  const session = await auth()
  if (!session) return { escalations: [], totalCount: 0 }

  const isOem = session.user.companyType === "OEM"
  const companyId = session.user.companyId

  let where: Record<string, unknown>
  let fdFilter: Record<string, unknown>

  if (isOem) {
    where = {
      companyId: companyId,
      entityType: "FIELD_DEFECT" as const,
    }
    fdFilter = { oemId: companyId }
  } else {
    fdFilter = { supplierId: companyId }
    const supplierFieldDefectIds = await prisma.fieldDefect.findMany({
      where: { supplierId: companyId, deletedAt: null },
      select: { id: true },
    })
    const ids = supplierFieldDefectIds.map((fd) => fd.id)
    where = {
      entityId: { in: ids },
      entityType: "FIELD_DEFECT" as const,
    }
  }

  const [histories, totalCount] = await Promise.all([
    prisma.escalationHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
    }),
    prisma.escalationHistory.count({ where }),
  ])

  const fieldDefectIds = histories.map((h) => h.entityId)

  const fieldDefects = fieldDefectIds.length > 0
    ? await prisma.fieldDefect.findMany({
        where: {
          id: { in: fieldDefectIds },
          ...fdFilter,
        },
        select: {
          id: true,
          title: true,
          status: true,
          partNumber: true,
          supplier: { select: { name: true } },
          escalationLevel: true,
        },
      })
    : []

  const fdMap = new Map(fieldDefects.map((fd) => [fd.id, fd]))

  let escalations: EscalationRow[] = histories
    .filter((h) => fdMap.has(h.entityId))
    .map((h) => {
      const fd = fdMap.get(h.entityId)!
      return {
        id: h.id,
        entityType: h.entityType,
        entityId: h.entityId,
        title: `Escalation: ${fd.title}`,
        previousLevel: h.previousLevel,
        newLevel: h.newLevel,
        reason: h.reason,
        createdAt: h.createdAt,
        createdByName: h.createdBy?.name ?? h.createdBy?.email ?? "System",
        fieldDefectTitle: fd.title,
        fieldDefectStatus: fd.status,
        partNumber: fd.partNumber ?? undefined,
        supplierName: fd.supplier?.name ?? undefined,
      }
    })

  if (filter === "level-1") {
    escalations = escalations.filter((e) => e.newLevel === "LEVEL_1")
  } else if (filter === "level-2") {
    escalations = escalations.filter((e) => e.newLevel === "LEVEL_2")
  } else if (filter === "level-3") {
    escalations = escalations.filter((e) => e.newLevel === "LEVEL_3")
  }

  const start = (page - 1) * pageSize
  return {
    escalations: escalations.slice(start, start + pageSize),
    totalCount: filter ? escalations.length : totalCount,
  }
}

export async function getActiveEscalations(): Promise<{
  escalated: {
    id: string
    title: string
    status: string
    severity: string
    escalationLevel: EscalationLevel
    escalatedAt: Date | null
    escalationReason: string | null
    supplierName: string | null
    responseDueAt: Date | null
    resolutionDueAt: Date | null
    partNumber: string | null
  }[]
  overdue: {
    id: string
    title: string
    status: string
    severity: string
    slaStatus: string
    responseDueAt: Date | null
    resolutionDueAt: Date | null
    supplierName: string | null
    partNumber: string | null
  }[]
  totalCount: number
}> {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") return { escalated: [], overdue: [], totalCount: 0 }

  const companyId = session.user.companyId

  const activeStatuses: FieldDefectStatus[] = ["OPEN", "UNDER_REVIEW", "SUPPLIER_ASSIGNED"]

  const escalatedWhere = {
    oemId: companyId,
    escalationLevel: { not: "NONE" as EscalationLevel },
    status: { in: activeStatuses },
    deletedAt: null,
  }

  const [escalatedFieldDefects, allActiveFieldDefects] = await Promise.all([
    prisma.fieldDefect.findMany({
      where: escalatedWhere,
      orderBy: [
        { escalationLevel: "desc" },
        { escalatedAt: "desc" },
      ],
      select: {
        id: true,
        title: true,
        status: true,
        severity: true,
        escalationLevel: true,
        escalatedAt: true,
        escalationReason: true,
        supplier: { select: { name: true } },
        responseDueAt: true,
        resolutionDueAt: true,
        partNumber: true,
      },
    }),
    prisma.fieldDefect.findMany({
      where: {
        oemId: companyId,
        status: { in: activeStatuses },
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        severity: true,
        responseDueAt: true,
        resolutionDueAt: true,
        escalationLevel: true,
        supplier: { select: { name: true } },
        partNumber: true,
      },
    }),
  ])

  const escalatedIds = new Set(escalatedFieldDefects.map((fd) => fd.id))

  const overdueFieldDefects = allActiveFieldDefects.filter((fd) => {
    if (escalatedIds.has(fd.id)) return false
    const slaStatus = getFieldDefectSlaStatus(fd)
    return slaStatus === "overdue" || slaStatus === "due-soon"
  }).map((fd) => {
    const slaStatus = getFieldDefectSlaStatus(fd)
    return {
      id: fd.id,
      title: fd.title,
      status: fd.status,
      severity: fd.severity,
      slaStatus,
      responseDueAt: fd.responseDueAt,
      resolutionDueAt: fd.resolutionDueAt,
      supplierName: fd.supplier?.name ?? null,
      partNumber: fd.partNumber,
    }
  })

  return {
    escalated: escalatedFieldDefects.map((fd) => ({
      id: fd.id,
      title: fd.title,
      status: fd.status,
      severity: fd.severity,
      escalationLevel: fd.escalationLevel,
      escalatedAt: fd.escalatedAt,
      escalationReason: fd.escalationReason,
      supplierName: fd.supplier?.name ?? null,
      responseDueAt: fd.responseDueAt,
      resolutionDueAt: fd.resolutionDueAt,
      partNumber: fd.partNumber,
    })),
    overdue: overdueFieldDefects,
    totalCount: escalatedFieldDefects.length + overdueFieldDefects.length,
  }
}