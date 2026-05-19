"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import type { UpgradeRequestStatus } from "@/generated/prisma/client"

type ModuleRequestResult =
  | { success: true; id: string; status: UpgradeRequestStatus; duplicate: boolean }
  | { success: false; error: string }

export async function createModuleAccessRequest(data: {
  moduleKey: string
  message?: string
}): Promise<ModuleRequestResult> {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }
  if (session.user.companyType !== "OEM") {
    return { success: false, error: "Module access requests are only available for OEM accounts" }
  }

  const VALID_MODULES = ["PLANT_QUALITY_MODULE", "PLANT_LOGISTIC_MODULE"]
  if (!VALID_MODULES.includes(data.moduleKey)) {
    return { success: false, error: "Invalid module" }
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { plan: true },
  })
  if (!company) return { success: false, error: "Company not found" }

  const existingOpen = await prisma.upgradeRequest.findFirst({
    where: {
      companyId: session.user.companyId,
      sourceFeature: `MODULE_ACCESS:${data.moduleKey}`,
      status: "OPEN",
    },
  })

  if (existingOpen) {
    return {
      success: true,
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
      requestedPlan: company.plan,
      sourceFeature: `MODULE_ACCESS:${data.moduleKey}`,
      message: data.message
        ? `[Module Access Request: ${data.moduleKey}] ${data.message}`
        : `Request access to ${data.moduleKey}`,
    },
  })

  revalidatePath("/settings/plan")
  revalidatePath("/logistic/settings/plan")
  revalidatePath("/quality/oem/settings/plan")
  revalidatePath("/oem/settings/plan")

  return { success: true, id: request.id, status: request.status, duplicate: false }
}