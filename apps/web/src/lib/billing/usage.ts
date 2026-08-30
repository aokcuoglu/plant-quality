import type { PlanKey } from "./plans"
import { getPlanLimits, normalizePlan } from "./plans"
import type { FeatureKey } from "./features"
import { checkFeatureAccess } from "./features"
import { prisma } from "@/lib/prisma"

export type UsageKey =
  | "MONTHLY_DEFECTS"
  | "MONTHLY_FIELD_DEFECTS"
  | "SUPPLIERS"
  | "USERS"
  | "STORAGE_MB"
  | "AI_CLASSIFICATION_RUNS"
  | "AI_8D_REVIEW_RUNS"
  | "SIMILAR_ISSUE_SEARCHES"
  | "WAR_ROOM_ITEMS"
  | "PPAP_PACKAGES"
  | "IQC_INSPECTIONS"
  | "FMEA_RECORDS"

export const USAGE_KEY_TO_LIMIT_FIELD: Record<UsageKey, keyof ReturnType<typeof getPlanLimits>> = {
  MONTHLY_DEFECTS: "monthlyDefects",
  MONTHLY_FIELD_DEFECTS: "monthlyFieldDefects",
  SUPPLIERS: "suppliers",
  USERS: "users",
  STORAGE_MB: "storageMb",
  AI_CLASSIFICATION_RUNS: "aiClassificationRuns",
  AI_8D_REVIEW_RUNS: "ai8dReviewRuns",
  SIMILAR_ISSUE_SEARCHES: "similarIssueSearches",
  WAR_ROOM_ITEMS: "warRoomItems",
  PPAP_PACKAGES: "ppapPackages",
  IQC_INSPECTIONS: "iqcInspections",
  FMEA_RECORDS: "fmeaRecords",
}

export const FEATURE_TO_USAGE_KEY: Partial<Record<FeatureKey, UsageKey>> = {
  AI_CLASSIFICATION: "AI_CLASSIFICATION_RUNS",
  AI_8D_REVIEW: "AI_8D_REVIEW_RUNS",
  SIMILAR_ISSUES: "SIMILAR_ISSUE_SEARCHES",
}

function getCurrentPeriod(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function isMonthlyKey(key: UsageKey): boolean {
  return key.startsWith("MONTHLY_") || key === "AI_CLASSIFICATION_RUNS" || key === "AI_8D_REVIEW_RUNS" || key === "SIMILAR_ISSUE_SEARCHES" || key === "IQC_INSPECTIONS"
}

export async function getUsage(
  companyId: string,
  usageKey: UsageKey
): Promise<number> {
  const { start, end } = getCurrentPeriod()

  if (isMonthlyKey(usageKey)) {
    const counter = await prisma.usageCounter.findFirst({
      where: {
        companyId,
        usageKey,
        periodStart: start,
        periodEnd: end,
      },
    })
    return counter?.count ?? 0
  }

  const counter = await prisma.usageCounter.findFirst({
    where: {
      companyId,
      usageKey,
    },
    orderBy: { createdAt: "desc" },
  })
  return counter?.count ?? 0
}

export function getUsageLimit(plan: PlanKey, usageKey: UsageKey): number | null {
  const limits = getPlanLimits(plan)
  const field = USAGE_KEY_TO_LIMIT_FIELD[usageKey]
  return limits[field] ?? null
}

export async function canConsumeUsage(
  companyId: string,
  usageKey: UsageKey,
  amount: number = 1
): Promise<boolean> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { plan: true },
  })
  if (!company) return false

  const plan = normalizePlan(company.plan)
  const limit = getUsageLimit(plan, usageKey)

  if (limit === null) return true
  if (limit === 0) return false

  const current = await getUsage(companyId, usageKey)
  return current + amount <= limit
}

export async function consumeUsage(
  companyId: string,
  usageKey: UsageKey,
  amount: number = 1
): Promise<void> {
  const { start, end } = getCurrentPeriod()

  if (isMonthlyKey(usageKey)) {
    const existing = await prisma.usageCounter.findFirst({
      where: {
        companyId,
        usageKey,
        periodStart: start,
        periodEnd: end,
      },
    })

    if (existing) {
      await prisma.usageCounter.update({
        where: { id: existing.id },
        data: { count: existing.count + amount },
      })
    } else {
      await prisma.usageCounter.create({
        data: {
          companyId,
          usageKey,
          periodStart: start,
          periodEnd: end,
          count: amount,
        },
      })
    }
  } else {
    const existing = await prisma.usageCounter.findFirst({
      where: {
        companyId,
        usageKey,
      },
      orderBy: { createdAt: "desc" },
    })

    if (existing) {
      await prisma.usageCounter.update({
        where: { id: existing.id },
        data: { count: existing.count + amount },
      })
    } else {
      await prisma.usageCounter.create({
        data: {
          companyId,
          usageKey,
          periodStart: start,
          periodEnd: end,
          count: amount,
        },
      })
    }
  }
}

export interface UsageLimitStatus {
  current: number
  limit: number | null
  remaining: number | null
  percentage: number | null
  isOver: boolean
  isNear: boolean
}

export async function getUsageLimitStatus(
  companyId: string,
  usageKey: UsageKey
): Promise<UsageLimitStatus> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { plan: true },
  })
  if (!company) {
    return { current: 0, limit: 0, remaining: 0, percentage: 0, isOver: true, isNear: true }
  }

  const plan = normalizePlan(company.plan)
  const limit = getUsageLimit(plan, usageKey)
  const current = await getUsage(companyId, usageKey)

  if (limit === null) {
    return { current, limit: null, remaining: null, percentage: null, isOver: false, isNear: false }
  }

  if (limit === 0) {
    return { current, limit: 0, remaining: 0, percentage: 100, isOver: true, isNear: true }
  }

  const remaining = Math.max(0, limit - current)
  const percentage = Math.round((current / limit) * 100)
  const isOver = current >= limit
  const isNear = percentage >= 80

  return { current, limit, remaining, percentage, isOver, isNear }
}

export interface FeatureGateUsageResult {
  featureAllowed: boolean
  usageAllowed: boolean
  featureReason: string | null
  usageReason: string | null
}

export async function checkFeatureAndUsage(
  plan: PlanKey,
  companyType: string,
  companyId: string,
  featureKey: FeatureKey
): Promise<FeatureGateUsageResult> {
  const featureAccess = checkFeatureAccess(plan, companyType, featureKey)

  if (!featureAccess.allowed) {
    return {
      featureAllowed: false,
      usageAllowed: false,
      featureReason: featureAccess.reason,
      usageReason: null,
    }
  }

  const usageKey = FEATURE_TO_USAGE_KEY[featureKey]
  if (!usageKey) {
    return {
      featureAllowed: true,
      usageAllowed: true,
      featureReason: null,
      usageReason: null,
    }
  }

  const canUse = await canConsumeUsage(companyId, usageKey)
  if (!canUse) {
    return {
      featureAllowed: true,
      usageAllowed: false,
      featureReason: null,
      usageReason: "Usage limit exceeded for this feature. Please upgrade your plan.",
    }
  }

  return {
    featureAllowed: true,
    usageAllowed: true,
    featureReason: null,
    usageReason: null,
  }
}