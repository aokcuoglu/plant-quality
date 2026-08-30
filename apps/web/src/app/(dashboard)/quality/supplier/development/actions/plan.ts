"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireFeature } from "@/lib/billing"
import type { DevActionStatus } from "@plantx/db/client"
import { revalidatePath } from "next/cache"

const SUPPLIER_ALLOWED_TRANSITIONS: Record<DevActionStatus, DevActionStatus[]> = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["SUBMITTED"],
  SUBMITTED: [],
  ACCEPTED: [],
  REJECTED: ["IN_PROGRESS"],
  COMPLETED: [],
  CANCELLED: [],
}

export async function updateSupplierActionItem(formData: FormData) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false as const, error: "Not authenticated" }
  if (session.user.companyType !== "SUPPLIER") return { success: false as const, error: "Only suppliers can update their action items" }

  const featureGate = requireFeature(session, "SUPPLIER_DEVELOPMENT")
  if (!featureGate.allowed) return { success: false as const, error: featureGate.reason ?? "Requires higher plan" }

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

  if (plan.status !== "SUPPLIER_ACTION_REQUIRED" && plan.status !== "REVISION_REQUIRED") {
    return { success: false as const, error: "Plan is not in a state that allows supplier action" }
  }

  if (item.status === "COMPLETED" || item.status === "CANCELLED" || item.status === "ACCEPTED") {
    return { success: false as const, error: "Cannot update a completed, cancelled, or accepted action item" }
  }

  if (status) {
    const allowed = (SUPPLIER_ALLOWED_TRANSITIONS[item.status] ?? [])
    if (!allowed.includes(status)) {
      return { success: false as const, error: `Invalid status transition from ${item.status} to ${status}` }
    }
    await prisma.supplierDevelopmentActionItem.update({
      where: { id: itemId },
      data: { status, supplierResponse: supplierResponse ?? undefined },
    })

    await prisma.supplierDevelopmentEvent.create({
      data: {
        planId,
        actorId: session.user.id,
        type: "ACTION_ITEM_STATUS_CHANGED",
        message: `Supplier updated action item "${item.title}" to ${status}`,
        metadata: { actionItemId: itemId, fromStatus: item.status, toStatus: status },
      },
    })
  } else if (supplierResponse !== null) {
    await prisma.supplierDevelopmentActionItem.update({
      where: { id: itemId },
      data: { supplierResponse },
    })

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

  const featureGate = requireFeature(session, "SUPPLIER_DEVELOPMENT")
  if (!featureGate.allowed) return { success: false as const, error: featureGate.reason ?? "Requires higher plan" }

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