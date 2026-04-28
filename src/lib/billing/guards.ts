import type { Plan } from "@/generated/prisma/client"
import { normalizePlan, type PlanKey } from "./plans"
import type { FeatureKey } from "./features"
import { canUseFeature } from "./features"

export interface SessionPlanInfo {
  plan: PlanKey
  companyType: string
  companyId: string
}

export function getSessionPlanInfo(session: {
  user?: {
    plan?: Plan | string | null
    companyType?: string | null
    companyId?: string | null
  }
} | null): SessionPlanInfo {
  const plan = normalizePlan(session?.user?.plan ?? null)
  const companyType = session?.user?.companyType ?? "OEM"
  const companyId = session?.user?.companyId ?? ""
  return { plan, companyType, companyId }
}

export function requireFeature(
  session: { user?: { plan?: Plan | string | null; companyType?: string | null; companyId?: string | null } } | null,
  featureKey: FeatureKey
): { allowed: boolean; reason: string | null } {
  const { plan, companyType } = getSessionPlanInfo(session)
  const allowed = canUseFeature(plan, companyType, featureKey)
  if (allowed) return { allowed: true, reason: null }

  const featureLabel = featureKey.replace(/_/g, " ").toLowerCase()
  if (companyType === "SUPPLIER") {
    return {
      allowed: false,
      reason: `The ${featureLabel} feature is not available for supplier accounts.`,
    }
  }

  return {
    allowed: false,
    reason: `The ${featureLabel} feature requires a higher plan. Please upgrade to access this feature.`,
  }
}

export function isFeatureGatedNav(href: string): FeatureKey | null {
  const gatedNav: Record<string, FeatureKey> = {
    "/quality/oem/ppap": "PPAP",
    "/quality/oem/iqc": "IQC",
    "/quality/oem/fmea": "FMEA",
    "/quality/oem/escalations": "ESCALATION",
    "/quality/oem/war-room": "WAR_ROOM",
    "/quality/oem/quality-intelligence": "QUALITY_INTELLIGENCE",
  }
  return gatedNav[href] ?? null
}

export function isEnterpriseOnlyNav(href: string): boolean {
  const enterpriseRoutes = [
    "/quality/oem/settings/sso",
    "/quality/oem/settings/api",
  ]
  return enterpriseRoutes.includes(href)
}

export { canUseFeature }
export type { FeatureKey }