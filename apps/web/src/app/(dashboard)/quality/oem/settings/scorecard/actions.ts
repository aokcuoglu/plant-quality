"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getScorecardConfig, defaultScorecardConfig, type ScorecardConfigData } from "@/lib/supplier-scorecard/config"

export async function loadScorecardConfig(): Promise<ScorecardConfigData | { error: string }> {
  const session = await auth()
  if (!session?.user?.companyId) return { error: "Unauthorized" }
  if (session.user.companyType !== "OEM") return { error: "Forbidden" }
  if (session.user.role !== "ADMIN") return { error: "Admin only" }

  return getScorecardConfig(session.user.companyId)
}

export async function saveScorecardConfig(formData: FormData) {
  const session = await auth()
  if (!session?.user?.companyId) return { error: "Unauthorized" }
  if (session.user.companyType !== "OEM") return { error: "Forbidden" }
  if (session.user.role !== "ADMIN") return { error: "Admin only" }

  const companyId = session.user.companyId

  const getInt = (key: string, fallback: number): number => {
    const v = formData.get(key)
    if (!v || typeof v !== "string") return fallback
    const n = parseInt(v, 10)
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : fallback
  }

  const data = {
    fieldDefectPerItem: getInt("fieldDefectPerItem", 10),
    fieldDefectCap: getInt("fieldDefectCap", 30),
    repeatIssuePerItem: getInt("repeatIssuePerItem", 15),
    repeatIssueCap: getInt("repeatIssueCap", 30),
    iqcRejectedPerItem: getInt("iqcRejectedPerItem", 8),
    iqcRejectedCap: getInt("iqcRejectedCap", 25),
    openOverdue8dPerItem: getInt("openOverdue8dPerItem", 10),
    openOverdue8dCap: getInt("openOverdue8dCap", 30),
    slaBreachPerItem: getInt("slaBreachPerItem", 10),
    slaBreachCap: getInt("slaBreachCap", 25),
    ppapWithIssuesPerItem: getInt("ppapWithIssuesPerItem", 8),
    ppapWithIssuesCap: getInt("ppapWithIssuesCap", 20),
    fmeaGapPerItem: getInt("fmeaGapPerItem", 8),
    fmeaGapCap: getInt("fmeaGapCap", 20),
    execRiskPerItem: getInt("execRiskPerItem", 5),
    execRiskCap: getInt("execRiskCap", 15),
  }

  await prisma.supplierScorecardConfig.upsert({
    where: { companyId },
    create: { companyId, ...data },
    update: data,
  })

  revalidatePath("/quality/oem/settings/scorecard")
  revalidatePath("/quality/oem/scorecard")

  return { success: true as const, data }
}

export async function resetScorecardConfig() {
  const session = await auth()
  if (!session?.user?.companyId) return { error: "Unauthorized" }
  if (session.user.companyType !== "OEM") return { error: "Forbidden" }
  if (session.user.role !== "ADMIN") return { error: "Admin only" }

  const companyId = session.user.companyId
  const defaults = defaultScorecardConfig()

  await prisma.supplierScorecardConfig.upsert({
    where: { companyId },
    create: { companyId, ...defaults },
    update: defaults,
  })

  revalidatePath("/quality/oem/settings/scorecard")
  revalidatePath("/quality/oem/scorecard")

  return { success: true as const, data: defaults }
}
