import { prisma } from "@/lib/prisma"
import { formatDueDate } from "@/lib/sla"
import type { DefectStatus, ActionOwner, NotificationType } from "@/generated/prisma/client"

type UserRow = {
  id: string
  companyId: string | null
  company: { type: string } | null
}

export async function generateSlaNotifications(): Promise<{ dueSoon: number; escalated: number }> {
  const now = new Date()
  const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const activeStatuses: DefectStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_APPROVAL", "REJECTED"]

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
        return `/supplier/defects/${defect.id}`
      }
      return `/oem/defects/${defect.id}`
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
        const existing = await prisma.notification.findFirst({
          where: {
            userId,
            type: "SLA_DUE_SOON" as NotificationType,
            link: linkForUser(userId),
            createdAt: { gte: twentyFourHoursAgo },
          },
        })
        if (existing) continue

        await prisma.notification.create({
          data: {
            userId,
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
        const existing = await prisma.notification.findFirst({
          where: {
            userId,
            type: "SLA_ESCALATION" as NotificationType,
            link: linkForUser(userId),
            createdAt: { gte: twentyFourHoursAgo },
          },
        })
        if (existing) continue

        await prisma.notification.create({
          data: {
            userId,
            type: "SLA_ESCALATION" as NotificationType,
            message: `SLA overdue: ${defect.partNumber} — was due ${formatDueDate(soonestOverdue.date)}`,
            link: linkForUser(userId),
          },
        })
        escalated++
      }
    }
  }

  return { dueSoon, escalated }
}