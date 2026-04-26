import { prisma } from "@/lib/prisma"
import { formatDueDate } from "@/lib/sla"
import { getFieldDefectSlaStatus } from "@/lib/sla-field-defect"
import type { DefectStatus, NotificationType, FieldDefectStatus } from "@/generated/prisma/client"

type UserRow = {
  id: string
  companyId: string | null
  company: { type: string } | null
}

function getCompanyForUser(userId: string, defect: { oemId: string; supplierId: string | null; oemOwnerId: string | null; supplierAssigneeId: string | null }, userMap: Map<string, UserRow>): string {
  if (userId === defect.oemOwnerId) return defect.oemId
  if (userId === defect.supplierAssigneeId && defect.supplierId) return defect.supplierId
  const user = userMap.get(userId)
  return user?.companyId ?? ""
}

export async function generateSlaNotifications(): Promise<{ dueSoon: number; escalated: number; fieldDueSoon: number; fieldEscalated: number }> {
  const now = new Date()
  const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const activeStatuses: DefectStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_APPROVAL", "REJECTED"]
  const activeFieldStatuses: FieldDefectStatus[] = ["OPEN", "UNDER_REVIEW", "SUPPLIER_ASSIGNED"]

  // --- 8D Defects ---
  const defects = await prisma.defect.findMany({
    where: {
      status: { in: activeStatuses },
    },
    select: {
      id: true,
      partNumber: true,
      status: true,
      currentActionOwner: true,
      supplierResponseDueAt: true,
      eightDSubmissionDueAt: true,
      oemReviewDueAt: true,
      revisionDueAt: true,
      oemOwnerId: true,
      supplierAssigneeId: true,
      oemId: true,
      supplierId: true,
    },
  })

  const dueDateFields = [
    "supplierResponseDueAt",
    "eightDSubmissionDueAt",
    "oemReviewDueAt",
    "revisionDueAt",
  ] as const

  const userIds = new Set<string>()
  for (const d of defects) {
    if (d.oemOwnerId) userIds.add(d.oemOwnerId)
    if (d.supplierAssigneeId) userIds.add(d.supplierAssigneeId)
  }

  const fieldDefects = await prisma.fieldDefect.findMany({
    where: {
      status: { in: activeFieldStatuses },
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      status: true,
      responseDueAt: true,
      resolutionDueAt: true,
      escalationLevel: true,
      oemId: true,
      supplierId: true,
      createdById: true,
    },
  })

  // Field defect notifications are handled per-defect below

  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: {
      id: true,
      companyId: true,
      company: { select: { type: true } },
    },
  })

  const userMap = new Map<string, UserRow>()
  for (const u of users) {
    userMap.set(u.id, u)
  }

  let dueSoon = 0
  let escalated = 0

  for (const defect of defects) {
    const dueDates: { date: Date; field: string }[] = []

    for (const field of dueDateFields) {
      const val = defect[field]
      if (val) {
        dueDates.push({ date: val, field })
      }
    }

    if (dueDates.length === 0) continue

    const hasDueSoon = dueDates.some(
      (d) => d.date > now && d.date <= fortyEightHoursFromNow
    )
    const hasEscalation = dueDates.some((d) => d.date < now)

    if (!hasDueSoon && !hasEscalation) continue

    const linkForUser = (userId: string): string => {
      const user = userMap.get(userId)
      if (user?.company?.type === "SUPPLIER") {
        return `/quality/supplier/defects/${defect.id}`
      }
      return `/quality/oem/defects/${defect.id}`
    }

    if (hasDueSoon) {
      const soonestDueSoon = dueDates
        .filter((d) => d.date > now && d.date <= fortyEightHoursFromNow)
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0]

      const targets: string[] = []
      if (defect.currentActionOwner === "SUPPLIER" && defect.supplierAssigneeId) {
        targets.push(defect.supplierAssigneeId)
      } else if (defect.currentActionOwner === "OEM" && defect.oemOwnerId) {
        targets.push(defect.oemOwnerId)
      }

      for (const userId of targets) {
        const userCompanyId = getCompanyForUser(userId, defect, userMap)
        const existing = await prisma.notification.findFirst({
          where: {
            userId,
            companyId: userCompanyId,
            type: "SLA_DUE_SOON" as NotificationType,
            link: linkForUser(userId),
            createdAt: { gte: twentyFourHoursAgo },
          },
        })
        if (existing) continue

        await prisma.notification.create({
          data: {
            userId,
            companyId: userCompanyId,
            type: "SLA_DUE_SOON" as NotificationType,
            message: `SLA deadline approaching: ${defect.partNumber} — due ${formatDueDate(soonestDueSoon.date)}`,
            link: linkForUser(userId),
          },
        })
        dueSoon++
      }
    }

    if (hasEscalation) {
      const soonestOverdue = dueDates
        .filter((d) => d.date < now)
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0]

      const targets: string[] = []
      if (defect.oemOwnerId) targets.push(defect.oemOwnerId)
      if (defect.supplierAssigneeId) targets.push(defect.supplierAssigneeId)

      for (const userId of targets) {
        const userCompanyId = getCompanyForUser(userId, defect, userMap)
        const existing = await prisma.notification.findFirst({
          where: {
            userId,
            companyId: userCompanyId,
            type: "SLA_ESCALATION" as NotificationType,
            link: linkForUser(userId),
            createdAt: { gte: twentyFourHoursAgo },
          },
        })
        if (existing) continue

        await prisma.notification.create({
          data: {
            userId,
            companyId: getCompanyForUser(userId, defect, userMap),
            type: "SLA_ESCALATION" as NotificationType,
            message: `SLA overdue: ${defect.partNumber} — was due ${formatDueDate(soonestOverdue.date)}`,
            link: linkForUser(userId),
          },
        })
        escalated++
      }
    }
  }

  // --- Field Defects ---
  let fieldDueSoon = 0
  let fieldEscalated = 0

  for (const fd of fieldDefects) {
    const slaStatus = getFieldDefectSlaStatus(fd, now)
    if (slaStatus !== "overdue" && slaStatus !== "due-soon") continue

    const linkForOem = `/quality/oem/field/${fd.id}`
    const linkForSupplier = `/quality/supplier/field/${fd.id}`

    const dueDates: Date[] = []
    if (fd.responseDueAt) dueDates.push(fd.responseDueAt)
    if (fd.resolutionDueAt) dueDates.push(fd.resolutionDueAt)
    if (dueDates.length === 0) continue

    const soonestDue = dueDates.sort((a, b) => a.getTime() - b.getTime())[0]

    if (slaStatus === "due-soon") {
      // Notify OEM owner
      const oemUsers = await prisma.user.findMany({
        where: { companyId: fd.oemId, role: { in: ["ADMIN", "QUALITY_ENGINEER"] } },
        select: { id: true },
      })
      for (const user of oemUsers) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            companyId: fd.oemId,
            type: "SLA_DUE_SOON" as NotificationType,
            link: linkForOem,
            createdAt: { gte: twentyFourHoursAgo },
          },
        })
        if (existing) continue
        await prisma.notification.create({
          data: {
            userId: user.id,
            companyId: fd.oemId,
            type: "SLA_DUE_SOON" as NotificationType,
            message: `Field defect SLA deadline approaching: ${fd.title} — due ${formatDueDate(soonestDue)}`,
            link: linkForOem,
          },
        })
        fieldDueSoon++
      }

      // Notify supplier users if assigned
      if (fd.supplierId) {
        const supplierUsers = await prisma.user.findMany({
          where: { companyId: fd.supplierId, role: { in: ["ADMIN", "QUALITY_ENGINEER"] } },
          select: { id: true },
        })
        for (const user of supplierUsers) {
          const existing = await prisma.notification.findFirst({
            where: {
              userId: user.id,
              companyId: fd.supplierId,
              type: "SLA_DUE_SOON" as NotificationType,
              link: linkForSupplier,
              createdAt: { gte: twentyFourHoursAgo },
            },
          })
          if (existing) continue
          await prisma.notification.create({
            data: {
              userId: user.id,
              companyId: fd.supplierId,
              type: "SLA_DUE_SOON" as NotificationType,
              message: `Field defect SLA deadline approaching: ${fd.title} — due ${formatDueDate(soonestDue)}`,
              link: linkForSupplier,
            },
          })
          fieldDueSoon++
        }
      }
    }

    if (slaStatus === "overdue") {
      // Notify OEM users
      const oemUsers = await prisma.user.findMany({
        where: { companyId: fd.oemId, role: { in: ["ADMIN", "QUALITY_ENGINEER"] } },
        select: { id: true },
      })
      for (const user of oemUsers) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            companyId: fd.oemId,
            type: "SLA_ESCALATION" as NotificationType,
            link: linkForOem,
            createdAt: { gte: twentyFourHoursAgo },
          },
        })
        if (existing) continue
        await prisma.notification.create({
          data: {
            userId: user.id,
            companyId: fd.oemId,
            type: "SLA_ESCALATION" as NotificationType,
            message: `Field defect SLA overdue: ${fd.title} — was due ${formatDueDate(soonestDue)}`,
            link: linkForOem,
          },
        })
        fieldEscalated++
      }

      // Notify supplier users
      if (fd.supplierId) {
        const supplierUsers = await prisma.user.findMany({
          where: { companyId: fd.supplierId, role: { in: ["ADMIN", "QUALITY_ENGINEER"] } },
          select: { id: true },
        })
        for (const user of supplierUsers) {
          const existing = await prisma.notification.findFirst({
            where: {
              userId: user.id,
              companyId: fd.supplierId,
              type: "SLA_ESCALATION" as NotificationType,
              link: linkForSupplier,
              createdAt: { gte: twentyFourHoursAgo },
            },
          })
          if (existing) continue
          await prisma.notification.create({
            data: {
              userId: user.id,
              companyId: fd.supplierId,
              type: "SLA_ESCALATION" as NotificationType,
              message: `Field defect SLA overdue: ${fd.title} — was due ${formatDueDate(soonestDue)}`,
              link: linkForSupplier,
            },
          })
          fieldEscalated++
        }
      }
    }
  }

  return { dueSoon, escalated, fieldDueSoon, fieldEscalated }
}