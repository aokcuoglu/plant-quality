"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import type { UpgradeRequestStatus } from "@/generated/prisma/client"

export async function createUpgradeRequest(data: {
  requestedPlan: string
  sourceFeature?: string
  message?: string
}) {
  const session = await auth()
  if (!session) return { success: false as const, error: "Unauthorized" }
  if (session.user.companyType !== "OEM") {
    return { success: false as const, error: "Upgrade requests are only available for OEM accounts" }
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { plan: true },
  })
  if (!company) return { success: false as const, error: "Company not found" }

  const validPlans = ["PRO", "ENTERPRISE"]
  if (!validPlans.includes(data.requestedPlan)) {
    return { success: false as const, error: "Invalid requested plan" }
  }

  const existingOpen = await prisma.upgradeRequest.findFirst({
    where: {
      companyId: session.user.companyId,
      requestedPlan: data.requestedPlan,
      status: "OPEN",
      ...(data.sourceFeature ? { sourceFeature: data.sourceFeature } : {}),
    },
  })

  if (existingOpen) {
    return {
      success: true as const,
      id: existingOpen.id,
      status: existingOpen.status,
      duplicate: true,
    }
  }

  const request = await prisma.upgradeRequest.create({
    data: {
      companyId: session.user.companyId,
      requestedById: session.user.id,
      currentPlan: company.plan,
      requestedPlan: data.requestedPlan,
      sourceFeature: data.sourceFeature ?? null,
      message: data.message ?? null,
    },
  })

  revalidatePath("/quality/oem/settings/plan")
  revalidatePath("/oem/settings/plan")

  return { success: true as const, id: request.id, status: request.status, duplicate: false }
}

export async function listUpgradeRequestsForCompany() {
  const session = await auth()
  if (!session) return []
  if (session.user.companyType !== "OEM") return []

  return prisma.upgradeRequest.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { name: true, email: true } },
      resolvedBy: { select: { name: true, email: true } },
    },
  })
}

export async function updateUpgradeRequestStatus(
  requestId: string,
  newStatus: UpgradeRequestStatus,
  adminNote?: string,
) {
  const session = await auth()
  if (!session) return { success: false as const, error: "Unauthorized" }
  if (session.user.companyType !== "OEM" || session.user.role !== "ADMIN") {
    return { success: false as const, error: "Only OEM admins can manage upgrade requests" }
  }

  const request = await prisma.upgradeRequest.findFirst({
    where: { id: requestId, companyId: session.user.companyId },
  })
  if (!request) return { success: false as const, error: "Request not found" }

  const validTransitions: Record<string, UpgradeRequestStatus[]> = {
    OPEN: ["CONTACTED", "APPROVED", "REJECTED", "CLOSED"],
    CONTACTED: ["APPROVED", "REJECTED", "CLOSED"],
    APPROVED: ["CLOSED"],
    REJECTED: ["CLOSED"],
    CLOSED: [],
  }

  const allowed = validTransitions[request.status] ?? []
  if (!allowed.includes(newStatus)) {
    return { success: false as const, error: `Cannot transition from ${request.status} to ${newStatus}` }
  }

  const updateData: Record<string, unknown> = { status: newStatus }
  if (adminNote !== undefined) updateData.adminNote = adminNote
  if (newStatus === "APPROVED" || newStatus === "REJECTED" || newStatus === "CLOSED") {
    updateData.resolvedAt = new Date()
    updateData.resolvedById = session.user.id
  }

  await prisma.upgradeRequest.update({
    where: { id: requestId },
    data: updateData,
  })

  revalidatePath("/quality/oem/settings/plan")
  revalidatePath("/oem/settings/plan")

  return { success: true as const }
}