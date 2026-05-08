"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { DevActionStatus } from "@/generated/prisma/client"
import { revalidatePath } from "next/cache"

export async function updateSupplierActionItem(formData: FormData) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false as const, error: "Not authenticated" }
  if (session.user.companyType !== "SUPPLIER") return { success: false as const, error: "Only suppliers can update their action items" }

  const itemId = formData.get("itemId") as string
  const planId = formData.get("planId") as string
  const status = formData.get("status") as DevActionStatus | null
  const supplierResponse = formData.get("supplierResponse") as string | null

  if (!itemId || !planId) return { success: false as const, error: "Item ID and Plan ID required" }

  const plan = await prisma.supplierDevelopmentPlan.findFirst({
    where: { id: planId, supplierId: session.user.companyId },
  })
  if (!plan) return { success: false as const, error: "Plan not found" }

  const item = await prisma.supplierDevelopmentActionItem.findFirst({
    where: { id: itemId, planId, ownerType: "SUPPLIER" },
  })
  if (!item) return { success: false as const, error: "Action item not found or not owned by supplier" }

  if (plan.status === "COMPLETED" || plan.status === "CANCELLED") {
    return { success: false as const, error: "Cannot update items on completed or cancelled plan" }
  }

  const updateData: Record<string, unknown> = {}
  if (status) {
    const allowedStatuses: DevActionStatus[] = ["IN_PROGRESS", "SUBMITTED"]
    if (!allowedStatuses.includes(status as DevActionStatus) && status !== "COMPLETED") {
      return { success: false as const, error: "Invalid status transition" }
    }
    updateData.status = status
    if (status === "COMPLETED") updateData.completedAt = new Date()
  }
  if (supplierResponse !== null) updateData.supplierResponse = supplierResponse

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
        message: `Supplier updated action item "${item.title}" to ${status}`,
        metadata: { actionItemId: itemId, toStatus: status },
      },
    })
  }

  if (supplierResponse) {
    await prisma.supplierDevelopmentEvent.create({
      data: {
        planId,
        actorId: session.user.id,
        type: "ACTION_ITEM_RESPONSE_ADDED",
        message: `Supplier response added to "${item.title}"`,
        metadata: { actionItemId: itemId },
      },
    })
  }

  revalidatePath(`/quality/supplier/development/${planId}`)
  revalidatePath("/quality/supplier/development")
  revalidatePath(`/quality/oem/supplier-development/${planId}`)
  revalidatePath("/quality/oem/supplier-development")

  return { success: true as const }
}

export async function submitPlanForReview(formData: FormData) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false as const, error: "Not authenticated" }
  if (session.user.companyType !== "SUPPLIER") return { success: false as const, error: "Only suppliers can submit for review" }

  const planId = formData.get("planId") as string
  if (!planId) return { success: false as const, error: "Plan ID required" }

  const plan = await prisma.supplierDevelopmentPlan.findFirst({
    where: { id: planId, supplierId: session.user.companyId },
  })
  if (!plan) return { success: false as const, error: "Plan not found" }

  if (plan.status !== "SUPPLIER_ACTION_REQUIRED" && plan.status !== "REVISION_REQUIRED") {
    return { success: false as const, error: "Plan is not in a state that allows supplier submission" }
  }

  await prisma.supplierDevelopmentPlan.update({
    where: { id: planId },
    data: { status: "OEM_REVIEW" },
  })

  await prisma.supplierDevelopmentEvent.create({
    data: {
      planId,
      actorId: session.user.id,
      type: "PLAN_SUBMITTED_FOR_REVIEW",
      message: "Supplier submitted plan for OEM review",
    },
  })

  const oemUsers = await prisma.user.findMany({
    where: { companyId: plan.oemId },
    select: { id: true },
  })

  if (oemUsers.length > 0) {
    await prisma.notification.createMany({
      data: oemUsers.map((u) => ({
        userId: u.id,
        companyId: plan.oemId,
        type: "DEV_PLAN_ACTION_REQUIRED",
        title: "Development Plan Submitted for Review",
        message: `Supplier has submitted development plan "${plan.title}" for your review.`,
        entityType: "DEV_PLAN",
        entityId: planId,
        link: `/quality/oem/supplier-development/${planId}`,
      })),
    })
  }

  revalidatePath(`/quality/supplier/development/${planId}`)
  revalidatePath("/quality/supplier/development")
  revalidatePath(`/quality/oem/supplier-development/${planId}`)
  revalidatePath("/quality/oem/supplier-development")

  return { success: true as const }
}