"use server"

import { isEditorRole } from "@/lib/roles"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireFeature } from "@/lib/billing"
import { revalidatePath } from "next/cache"
import type { DevPlanPriority, DevPlanSourceType, DevPlanStatus, DevActionOwnerType, DevActionStatus, DevPlanEventType } from "@plantx/db/client"

function canManage(session: { user: { companyType: string; role: string } } | null): boolean {
  if (!session) return false
  if (session.user.companyType !== "OEM") return false
  return isEditorRole(session.user.role)
}

const VALID_PLAN_TRANSITIONS: Record<DevPlanStatus, DevPlanStatus[]> = {
  DRAFT: ["OPEN", "CANCELLED"],
  OPEN: ["SUPPLIER_ACTION_REQUIRED", "CANCELLED"],
  SUPPLIER_ACTION_REQUIRED: ["OEM_REVIEW", "REVISION_REQUIRED", "CANCELLED"],
  OEM_REVIEW: ["COMPLETED", "REVISION_REQUIRED", "CANCELLED"],
  REVISION_REQUIRED: ["SUPPLIER_ACTION_REQUIRED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
}

const OEM_ALLOWED_ACTION_TRANSITIONS: Record<DevActionStatus, DevActionStatus[]> = {
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  SUBMITTED: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: [],
  REJECTED: ["CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
}

function revalidateDevPlanPages(planId: string) {
  revalidatePath("/quality/oem/supplier-development")
  revalidatePath(`/quality/oem/supplier-development/${planId}`)
  revalidatePath("/quality/supplier/development")
  revalidatePath(`/quality/supplier/development/${planId}`)
}

export async function createDevPlan(formData: FormData) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false as const, error: "Not authenticated" }
  if (!canManage(session)) return { success: false as const, error: "Insufficient role" }

  const featureGate = requireFeature(session, "SUPPLIER_DEVELOPMENT")
  if (!featureGate.allowed) return { success: false as const, error: featureGate.reason ?? "Requires higher plan" }

  const title = formData.get("title") as string
  const description = (formData.get("description") as string) || null
  const supplierId = formData.get("supplierId") as string
  const priority = (formData.get("priority") as DevPlanPriority) || "MEDIUM"
  const sourceType = (formData.get("sourceType") as DevPlanSourceType) || null
  const sourceId = (formData.get("sourceId") as string) || null
  const dueDateStr = formData.get("dueDate") as string | null
  const ownerId = (formData.get("ownerId") as string) || null
  const status = (formData.get("status") as DevPlanStatus) || "DRAFT"

  if (!title || !supplierId) {
    return { success: false as const, error: "Title and supplier are required" }
  }

  if (status !== "DRAFT" && status !== "OPEN") {
    return { success: false as const, error: "Initial status must be DRAFT or OPEN" }
  }

  const supplier = await prisma.company.findFirst({
    where: { id: supplierId, type: "SUPPLIER" },
  })
  if (!supplier) return { success: false as const, error: "Invalid supplier" }

  const isAssociated = await prisma.company.findFirst({
    where: {
      id: supplierId,
      type: "SUPPLIER",
      OR: [
        { primaryOemId: session.user.companyId },
        { defectsAsSup: { some: { oemId: session.user.companyId } } },
        { ppapAsSup: { some: { oemId: session.user.companyId } } },
        { iqcAsSup: { some: { oemId: session.user.companyId } } },
        { fmeaAsSup: { some: { oemId: session.user.companyId } } },
        { fieldDefectsAsSup: { some: { oemId: session.user.companyId } } },
        { devPlansAsSupplier: { some: { oemId: session.user.companyId } } },
      ],
    },
    select: { id: true },
  })
  if (!isAssociated) return { success: false as const, error: "Supplier is not associated with your company" }

  const dueDate = dueDateStr ? new Date(dueDateStr) : null

  const plan = await prisma.supplierDevelopmentPlan.create({
    data: {
      oemId: session.user.companyId,
      supplierId,
      title,
      description,
      priority,
      sourceType,
      sourceId,
      dueDate,
      ownerId,
      createdById: session.user.id,
      status,
    },
  })

  const actionItemData = formData.get("actionItems") as string | null
  if (actionItemData) {
    try {
      const items = JSON.parse(actionItemData) as Array<{
        title: string
        description?: string
        ownerType?: DevActionOwnerType
        ownerId?: string
        dueDate?: string
      }>
      for (const item of items) {
        if (!item.title) continue
        await prisma.supplierDevelopmentActionItem.create({
          data: {
            planId: plan.id,
            title: item.title,
            description: item.description || null,
            ownerType: item.ownerType || "OEM",
            ownerId: item.ownerId || null,
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
          },
        })
      }
    } catch {
      // ignore malformed action items
    }
  }

  await prisma.supplierDevelopmentEvent.create({
    data: {
      planId: plan.id,
      actorId: session.user.id,
      type: "PLAN_CREATED",
      message: status === "OPEN" ? "Plan created and opened" : "Plan created as draft",
      metadata: { priority, sourceType, supplierId },
    },
  })

  if (status === "OPEN") {
    const supplierUsers = await prisma.user.findMany({
      where: { companyId: supplierId },
      select: { id: true },
    })
    if (supplierUsers.length > 0) {
      await prisma.notification.createMany({
        data: supplierUsers.map((u) => ({
          userId: u.id,
          companyId: supplierId,
          type: "DEV_PLAN_CREATED",
          title: "New Development Plan",
          message: `A supplier development plan "${title}" has been created for your company.`,
          entityType: "DEV_PLAN",
          entityId: plan.id,
          link: `/quality/supplier/development/${plan.id}`,
        })),
      })
    }
  }

  revalidatePath("/quality/oem/supplier-development")
  revalidatePath(`/quality/oem/supplier-development/${plan.id}`)
  revalidatePath("/quality/supplier/development")

  return { success: true as const, id: plan.id }
}

export async function updateDevPlanStatus(formData: FormData) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false as const, error: "Not authenticated" }
  if (!canManage(session)) return { success: false as const, error: "Insufficient role" }

  const featureGate = requireFeature(session, "SUPPLIER_DEVELOPMENT")
  if (!featureGate.allowed) return { success: false as const, error: featureGate.reason ?? "Requires higher plan" }

  const planId = formData.get("planId") as string
  const newStatus = formData.get("status") as DevPlanStatus
  if (!planId || !newStatus) return { success: false as const, error: "Plan ID and status required" }

  const plan = await prisma.supplierDevelopmentPlan.findFirst({
    where: { id: planId, oemId: session.user.companyId },
  })
  if (!plan) return { success: false as const, error: "Plan not found" }

  if (plan.status === "COMPLETED" || plan.status === "CANCELLED") {
    return { success: false as const, error: "Cannot update completed or cancelled plan" }
  }

  const allowedTransitions = VALID_PLAN_TRANSITIONS[plan.status as DevPlanStatus] ?? []
  if (!allowedTransitions.includes(newStatus)) {
    return { success: false as const, error: `Cannot transition plan from ${plan.status} to ${newStatus}` }
  }

  const eventTypeMap: Record<string, DevPlanEventType> = {
    OPEN: "PLAN_OPENED",
    SUPPLIER_ACTION_REQUIRED: "PLAN_SENT_TO_SUPPLIER",
    OEM_REVIEW: "PLAN_SUBMITTED_FOR_REVIEW",
    REVISION_REQUIRED: "PLAN_REVISION_REQUESTED",
    COMPLETED: "PLAN_COMPLETED",
    CANCELLED: "PLAN_CANCELLED",
  }

  const statusMessages: Record<string, string> = {
    OPEN: "Plan opened",
    SUPPLIER_ACTION_REQUIRED: "Plan sent to supplier for action",
    OEM_REVIEW: "Plan moved to OEM review",
    REVISION_REQUIRED: "Revision requested",
    COMPLETED: "Plan completed",
    CANCELLED: "Plan cancelled",
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
  }

  if (newStatus === "COMPLETED") {
    updateData.completedAt = new Date()
    updateData.completedById = session.user.id
  }

  await prisma.supplierDevelopmentPlan.update({
    where: { id: planId },
    data: updateData,
  })

  await prisma.supplierDevelopmentEvent.create({
    data: {
      planId,
      actorId: session.user.id,
      type: eventTypeMap[newStatus] ?? "PLAN_OPENED",
      message: statusMessages[newStatus] ?? `Status changed to ${newStatus}`,
      metadata: { fromStatus: plan.status, toStatus: newStatus },
    },
  })

  if (newStatus === "SUPPLIER_ACTION_REQUIRED" || newStatus === "REVISION_REQUIRED") {
    const supplierUsers = await prisma.user.findMany({
      where: { companyId: plan.supplierId },
      select: { id: true },
    })
    const notifType = newStatus === "SUPPLIER_ACTION_REQUIRED" ? "DEV_PLAN_ACTION_REQUIRED" as const : "DEV_PLAN_REVISION_REQUESTED" as const
    const notifMsg = newStatus === "SUPPLIER_ACTION_REQUIRED"
      ? `Development plan "${plan.title}" requires your action.`
      : `Revision requested for development plan "${plan.title}".`

    if (supplierUsers.length > 0) {
      await prisma.notification.createMany({
        data: supplierUsers.map((u) => ({
          userId: u.id,
          companyId: plan.supplierId,
          type: notifType,
          title: newStatus === "SUPPLIER_ACTION_REQUIRED" ? "Action Required" : "Revision Requested",
          message: notifMsg,
          entityType: "DEV_PLAN",
          entityId: planId,
          link: `/quality/supplier/development/${planId}`,
        })),
      })
    }
  }

  if (newStatus === "COMPLETED" || newStatus === "CANCELLED") {
    const supplierUsers = await prisma.user.findMany({
      where: { companyId: plan.supplierId },
      select: { id: true },
    })
    const notifType = newStatus === "COMPLETED" ? "DEV_PLAN_COMPLETED" as const : "DEV_PLAN_CANCELLED" as const
    const notifMsg = newStatus === "COMPLETED"
      ? `Development plan "${plan.title}" has been completed.`
      : `Development plan "${plan.title}" has been cancelled.`

    if (supplierUsers.length > 0) {
      await prisma.notification.createMany({
        data: supplierUsers.map((u) => ({
          userId: u.id,
          companyId: plan.supplierId,
          type: notifType,
          title: newStatus === "COMPLETED" ? "Plan Completed" : "Plan Cancelled",
          message: notifMsg,
          entityType: "DEV_PLAN",
          entityId: planId,
          link: `/quality/supplier/development/${planId}`,
        })),
      })
    }
  }

  revalidateDevPlanPages(planId)

  return { success: true as const }
}

export async function addActionItem(formData: FormData) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false as const, error: "Not authenticated" }
  if (!canManage(session)) return { success: false as const, error: "Insufficient role" }

  const featureGate = requireFeature(session, "SUPPLIER_DEVELOPMENT")
  if (!featureGate.allowed) return { success: false as const, error: featureGate.reason ?? "Requires higher plan" }

  const planId = formData.get("planId") as string
  const title = formData.get("title") as string
  const description = (formData.get("description") as string) || null
  const ownerType = (formData.get("ownerType") as DevActionOwnerType) || "OEM"
  const ownerId = (formData.get("ownerId") as string) || null
  const dueDateStr = formData.get("dueDate") as string | null
  const dueDate = dueDateStr ? new Date(dueDateStr) : null

  if (!planId || !title) return { success: false as const, error: "Plan ID and title required" }

  const plan = await prisma.supplierDevelopmentPlan.findFirst({
    where: { id: planId, oemId: session.user.companyId },
  })
  if (!plan) return { success: false as const, error: "Plan not found" }

  if (plan.status === "COMPLETED" || plan.status === "CANCELLED") {
    return { success: false as const, error: "Cannot add items to completed or cancelled plan" }
  }

  const item = await prisma.supplierDevelopmentActionItem.create({
    data: {
      planId,
      title,
      description,
      ownerType,
      ownerId,
      dueDate,
    },
  })

  await prisma.supplierDevelopmentEvent.create({
    data: {
      planId,
      actorId: session.user.id,
      type: "ACTION_ITEM_ADDED",
      message: `Action item added: "${title}"`,
      metadata: { actionItemId: item.id, ownerType },
    },
  })

  revalidateDevPlanPages(planId)

  return { success: true as const, id: item.id }
}

export async function updateActionItem(formData: FormData) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false as const, error: "Not authenticated" }
  if (!canManage(session)) return { success: false as const, error: "Insufficient role" }

  const featureGate = requireFeature(session, "SUPPLIER_DEVELOPMENT")
  if (!featureGate.allowed) return { success: false as const, error: featureGate.reason ?? "Requires higher plan" }

  const itemId = formData.get("itemId") as string
  const planId = formData.get("planId") as string
  const status = formData.get("status") as DevActionStatus | null
  const oemComment = formData.get("oemComment") as string | null
  const dueDateStr = formData.get("dueDate") as string | null
  const title = formData.get("title") as string | null
  const description = formData.get("description") as string | null

  if (!itemId || !planId) return { success: false as const, error: "Item ID and Plan ID required" }

  const plan = await prisma.supplierDevelopmentPlan.findFirst({
    where: { id: planId, oemId: session.user.companyId },
  })
  if (!plan) return { success: false as const, error: "Plan not found" }

  if (plan.status === "COMPLETED" || plan.status === "CANCELLED") {
    return { success: false as const, error: "Cannot update items on completed or cancelled plan" }
  }

  const item = await prisma.supplierDevelopmentActionItem.findFirst({
    where: { id: itemId, planId },
  })
  if (!item) return { success: false as const, error: "Action item not found" }

  if (status) {
    const allowed = OEM_ALLOWED_ACTION_TRANSITIONS[item.status as DevActionStatus] ?? []
    if (!allowed.includes(status)) {
      return { success: false as const, error: `Cannot transition action item from ${item.status} to ${status}` }
    }
  }

  const updateData: Record<string, unknown> = {}
  if (title) updateData.title = title
  if (formData.has("description")) updateData.description = description || null
  if (status) {
    updateData.status = status
    if (status === "COMPLETED" || status === "ACCEPTED") {
      updateData.completedAt = new Date()
    } else {
      updateData.completedAt = null
    }
  }
  if (formData.has("oemComment") && oemComment !== null) updateData.oemComment = oemComment
  if (formData.has("dueDate")) updateData.dueDate = dueDateStr ? new Date(dueDateStr) : null

  await prisma.supplierDevelopmentActionItem.update({
    where: { id: itemId },
    data: updateData,
  })

  if (status) {
    await prisma.supplierDevelopmentEvent.create({
      data: {
        planId,
        actorId: session.user.id,
        type: "ACTION_ITEM_STATUS_CHANGED",
        message: `Action item "${item.title}" status changed to ${status}`,
        metadata: { actionItemId: itemId, fromStatus: item.status, toStatus: status },
      },
    })
  }

  revalidateDevPlanPages(planId)

  return { success: true as const }
}

export async function addDevPlanComment(formData: FormData) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false as const, error: "Not authenticated" }
  if (!canManage(session)) return { success: false as const, error: "Insufficient role" }

  const featureGate = requireFeature(session, "SUPPLIER_DEVELOPMENT")
  if (!featureGate.allowed) return { success: false as const, error: featureGate.reason ?? "Requires higher plan" }

  const planId = formData.get("planId") as string
  const message = formData.get("message") as string

  if (!planId || !message?.trim()) return { success: false as const, error: "Plan ID and message required" }

  const plan = await prisma.supplierDevelopmentPlan.findFirst({
    where: { id: planId, oemId: session.user.companyId },
  })
  if (!plan) return { success: false as const, error: "Plan not found" }

  await prisma.supplierDevelopmentEvent.create({
    data: {
      planId,
      actorId: session.user.id,
      type: "COMMENT_ADDED",
      message: message.trim(),
    },
  })

  revalidateDevPlanPages(planId)

  return { success: true as const }
}