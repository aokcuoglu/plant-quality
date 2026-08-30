"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function getNotifications(page = 1, pageSize = 20) {
  const session = await auth()
  if (!session) return { notifications: [], unreadCount: 0, totalCount: 0 }

  const where = { userId: session.user.id, companyId: session.user.companyId }

  const [notifications, unreadCount, totalCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        entityType: true,
        entityId: true,
        link: true,
        isRead: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { ...where, isRead: false },
    }),
    prisma.notification.count({ where }),
  ])

  return { notifications, unreadCount, totalCount }
}

export async function markAsRead(notificationId: string) {
  const session = await auth()
  if (!session) return

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.user.id, companyId: session.user.companyId },
    data: { isRead: true, readAt: new Date() },
  })

  revalidatePath("/", "layout")
}

export async function markAllAsRead() {
  const session = await auth()
  if (!session) return

  await prisma.notification.updateMany({
    where: { userId: session.user.id, companyId: session.user.companyId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  })

  revalidatePath("/", "layout")
}