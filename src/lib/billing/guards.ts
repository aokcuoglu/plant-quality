import type { Plan } from "@/generated/prisma/client"
import { normalizePlan, type PlanKey } from "./plans"
import type { FeatureKey, ModuleKey } from "./features"
import { canUseFeature, checkModuleAccess, isModuleEntitled } from "./features"

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

export function requireModule(
  session: { user?: { plan?: Plan | string | null; companyType?: string | null; companyId?: string | null } } | null,
  moduleKey: ModuleKey
): { allowed: boolean; reason: string | null } {
  const { companyId, companyType } = getSessionPlanInfo(session)
  const hasAccess = checkModuleAccess(moduleKey, companyId, companyType)
  if (hasAccess) return { allowed: true, reason: null }
  return { allowed: false, reason: `The ${moduleKey.replace("_MODULE", "").replace(/_/g, " ")} module is not included in your current subscription.` }
}

export function requireFeature(
  session: { user?: { plan?: Plan | string | null; companyType?: string | null; companyId?: string | null } } | null,
  featureKey: FeatureKey
): { allowed: boolean; reason: string | null } {
  const { plan, companyType, companyId } = getSessionPlanInfo(session)
  const allowed = canUseFeature(plan, companyType, featureKey, companyId)
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
    "/quality/oem/executive": "EXECUTIVE_COCKPIT",
    "/quality/oem/scorecard": "SUPPLIER_SCORECARD",
    "/quality/oem/supplier-development": "SUPPLIER_DEVELOPMENT",
    "/settings/field-config": "CUSTOM_FIELDS",
    "/logistic": "PLANT_LOGISTIC",
    "/logistic/orders": "PLANT_LOGISTIC",
    "/logistic/orders/new": "PLANT_LOGISTIC",
    "/logistic/delay-intelligence": "PLANT_LOGISTIC",
  }
  return gatedNav[href] ?? null
}

export function isEnterpriseOnlyNav(href: string): boolean {
  const enterpriseRoutes = [
    "/quality/oem/settings/sso",
    "/quality/oem/settings/api",
    "/quality/oem/scorecard",
    "/quality/oem/supplier-development",
    "/settings/field-config",
  ]
  return enterpriseRoutes.includes(href)
}

export { canUseFeature, checkModuleAccess, isModuleEntitled }
export type { FeatureKey, ModuleKey }