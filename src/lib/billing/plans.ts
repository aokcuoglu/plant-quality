import type { Plan } from "@/generated/prisma/client"

export type PlanKey = "FREE" | "PRO" | "ENTERPRISE"

export const PLAN_LABELS: Record<PlanKey, string> = {
  FREE: "Free",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
}

export const PLAN_BADGE_COLORS: Record<PlanKey, string> = {
  FREE: "bg-muted text-muted-foreground border-border",
  PRO: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  ENTERPRISE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
}

export function normalizePlan(plan: Plan | string | null | undefined): PlanKey {
  if (!plan) return "FREE"
  const upper = plan.toUpperCase()
  if (upper === "BASIC") return "FREE"
  if (upper === "FREE") return "FREE"
  if (upper === "PRO") return "PRO"
  if (upper === "ENTERPRISE") return "ENTERPRISE"
  return "FREE"
}

export function getPlanLabel(plan: PlanKey): string {
  return PLAN_LABELS[plan] ?? "Free"
}

export function getPlanBadgeClasses(plan: PlanKey): string {
  return PLAN_BADGE_COLORS[plan] ?? PLAN_BADGE_COLORS.FREE
}

export const PLAN_ORDER: PlanKey[] = ["FREE", "PRO", "ENTERPRISE"]

export function isPlanAtLeast(plan: PlanKey, minimum: PlanKey): boolean {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(minimum)
}

export function isSupplierPlan(plan: PlanKey, companyType: string): boolean {
  return companyType === "SUPPLIER"
}

export interface PlanLimit {
  monthlyDefects: number | null
  monthlyFieldDefects: number | null
  suppliers: number | null
  users: number | null
  storageMb: number | null
  aiClassificationRuns: number | null
  ai8dReviewRuns: number | null
  similarIssueSearches: number | null
  warRoomItems: number | null
  ppapPackages: number | null
  iqcInspections: number | null
  fmeaRecords: number | null
}

export const PLAN_LIMITS: Record<PlanKey, PlanLimit> = {
  FREE: {
    monthlyDefects: 25,
    monthlyFieldDefects: 10,
    suppliers: 3,
    users: 3,
    storageMb: 1024,
    aiClassificationRuns: 0,
    ai8dReviewRuns: 0,
    similarIssueSearches: 0,
    warRoomItems: 0,
    ppapPackages: 0,
    iqcInspections: 0,
    fmeaRecords: 0,
  },
  PRO: {
    monthlyDefects: null,
    monthlyFieldDefects: null,
    suppliers: 25,
    users: 30,
    storageMb: 204800,
    aiClassificationRuns: 2000,
    ai8dReviewRuns: 0,
    similarIssueSearches: 2500,
    warRoomItems: 50,
    ppapPackages: 25,
    iqcInspections: null,
    fmeaRecords: 50,
  },
  ENTERPRISE: {
    monthlyDefects: null,
    monthlyFieldDefects: null,
    suppliers: null,
    users: null,
    storageMb: null,
    aiClassificationRuns: null,
    ai8dReviewRuns: null,
    similarIssueSearches: null,
    warRoomItems: null,
    ppapPackages: null,
    iqcInspections: null,
    fmeaRecords: null,
  },
}

export function getPlanLimits(plan: PlanKey): PlanLimit {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE
}

export function formatLimit(value: number | null): string {
  if (value === null) return "Unlimited"
  if (value === 0) return "—"
  return value.toLocaleString()
}