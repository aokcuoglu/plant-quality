import type { PlanKey } from "./plans"
import { isPlanAtLeast, isSupplierPlan } from "./plans"

export type FeatureKey =
  | "DEFECTS"
  | "FIELD_QUALITY"
  | "EIGHT_D"
  | "SUPPLIER_PORTAL"
  | "PPAP"
  | "IQC"
  | "FMEA"
  | "SLA"
  | "ESCALATION"
  | "WAR_ROOM"
  | "NOTIFICATIONS"
  | "SIMILAR_ISSUES"
  | "AI_CLASSIFICATION"
  | "AI_8D_REVIEW"
  | "ROOT_CAUSE_SUGGESTION"
  | "CATEGORY_INTELLIGENCE"
  | "QUALITY_INTELLIGENCE"
  | "API_ACCESS"
  | "WEBHOOKS"
  | "SSO"
  | "MULTI_PLANT"
  | "ADVANCED_AUDIT_LOG"
  | "EMAIL_NOTIFICATIONS"
  | "SUPPLIER_SCORECARD"
  | "QUALITY_LINKAGE"

export interface FeatureGate {
  key: FeatureKey
  label: string
  description: string
  minPlan: PlanKey
  supplierAccess: boolean
}

export const FEATURE_GATES: Record<FeatureKey, FeatureGate> = {
  DEFECTS: {
    key: "DEFECTS",
    label: "Defects",
    description: "Defect creation and management",
    minPlan: "FREE",
    supplierAccess: true,
  },
  FIELD_QUALITY: {
    key: "FIELD_QUALITY",
    label: "Field Quality",
    description: "Field defect tracking and management",
    minPlan: "FREE",
    supplierAccess: true,
  },
  EIGHT_D: {
    key: "EIGHT_D",
    label: "8D Workflow",
    description: "8D problem-solving workflow",
    minPlan: "FREE",
    supplierAccess: true,
  },
  SUPPLIER_PORTAL: {
    key: "SUPPLIER_PORTAL",
    label: "Supplier Portal",
    description: "Supplier collaboration and assigned records",
    minPlan: "FREE",
    supplierAccess: true,
  },
  PPAP: {
    key: "PPAP",
    label: "PPAP",
    description: "Production Part Approval Process",
    minPlan: "PRO",
    supplierAccess: true,
  },
  IQC: {
    key: "IQC",
    label: "IQC",
    description: "Incoming Quality Control",
    minPlan: "PRO",
    supplierAccess: true,
  },
  FMEA: {
    key: "FMEA",
    label: "FMEA",
    description: "Failure Mode and Effects Analysis",
    minPlan: "PRO",
    supplierAccess: true,
  },
  SLA: {
    key: "SLA",
    label: "SLA Tracking",
    description: "Service Level Agreement tracking and alerts",
    minPlan: "PRO",
    supplierAccess: false,
  },
  ESCALATION: {
    key: "ESCALATION",
    label: "Escalation",
    description: "Escalation workflows",
    minPlan: "PRO",
    supplierAccess: true,
  },
  WAR_ROOM: {
    key: "WAR_ROOM",
    label: "War Room",
    description: "Critical defect management",
    minPlan: "PRO",
    supplierAccess: false,
  },
  NOTIFICATIONS: {
    key: "NOTIFICATIONS",
    label: "Notifications",
    description: "In-app notification system",
    minPlan: "FREE",
    supplierAccess: true,
  },
  SIMILAR_ISSUES: {
    key: "SIMILAR_ISSUES",
    label: "Similar Issues",
    description: "AI-powered similar issue detection",
    minPlan: "PRO",
    supplierAccess: false,
  },
  AI_CLASSIFICATION: {
    key: "AI_CLASSIFICATION",
    label: "AI Classification",
    description: "AI defect classification",
    minPlan: "PRO",
    supplierAccess: false,
  },
  AI_8D_REVIEW: {
    key: "AI_8D_REVIEW",
    label: "AI 8D Review",
    description: "AI expert review of 8D reports",
    minPlan: "ENTERPRISE",
    supplierAccess: false,
  },
  ROOT_CAUSE_SUGGESTION: {
    key: "ROOT_CAUSE_SUGGESTION",
    label: "Root Cause Suggestion",
    description: "AI-driven root cause analysis",
    minPlan: "ENTERPRISE",
    supplierAccess: false,
  },
  CATEGORY_INTELLIGENCE: {
    key: "CATEGORY_INTELLIGENCE",
    label: "Category Intelligence",
    description: "Category-level AI insights",
    minPlan: "PRO",
    supplierAccess: false,
  },
  QUALITY_INTELLIGENCE: {
    key: "QUALITY_INTELLIGENCE",
    label: "Quality Intelligence",
    description: "Quality intelligence dashboard",
    minPlan: "PRO",
    supplierAccess: false,
  },
  API_ACCESS: {
    key: "API_ACCESS",
    label: "API Access",
    description: "REST/GraphQL API access",
    minPlan: "ENTERPRISE",
    supplierAccess: false,
  },
  WEBHOOKS: {
    key: "WEBHOOKS",
    label: "Webhooks",
    description: "Outbound event webhooks",
    minPlan: "ENTERPRISE",
    supplierAccess: false,
  },
  SSO: {
    key: "SSO",
    label: "SSO",
    description: "SAML/OIDC single sign-on",
    minPlan: "ENTERPRISE",
    supplierAccess: false,
  },
  MULTI_PLANT: {
    key: "MULTI_PLANT",
    label: "Multi-Plant",
    description: "Multi-plant organization support",
    minPlan: "ENTERPRISE",
    supplierAccess: false,
  },
  ADVANCED_AUDIT_LOG: {
    key: "ADVANCED_AUDIT_LOG",
    label: "Advanced Audit Log",
    description: "Detailed audit trail",
    minPlan: "ENTERPRISE",
    supplierAccess: false,
  },
  EMAIL_NOTIFICATIONS: {
    key: "EMAIL_NOTIFICATIONS",
    label: "Email Notifications",
    description: "Email delivery of critical alerts",
    minPlan: "ENTERPRISE",
    supplierAccess: false,
  },
  SUPPLIER_SCORECARD: {
    key: "SUPPLIER_SCORECARD",
    label: "Supplier Scorecard",
    description: "Comprehensive supplier scoring",
    minPlan: "ENTERPRISE",
    supplierAccess: false,
  },
  QUALITY_LINKAGE: {
    key: "QUALITY_LINKAGE",
    label: "Quality Linkage",
    description: "Cross-module related records and quality linkage",
    minPlan: "PRO",
    supplierAccess: true,
  },
}

export function getFeatureGate(key: FeatureKey): FeatureGate {
  return FEATURE_GATES[key]
}

export function getAllFeatures(): FeatureGate[] {
  return Object.values(FEATURE_GATES)
}

export interface FeatureAccessResult {
  allowed: boolean
  reason: string | null
  minPlan: PlanKey
  currentPlan: PlanKey
}

export function checkFeatureAccess(
  plan: PlanKey,
  companyType: string,
  featureKey: FeatureKey
): FeatureAccessResult {
  const gate = FEATURE_GATES[featureKey]
  if (!gate) {
    return {
      allowed: false,
      reason: "Unknown feature",
      minPlan: "ENTERPRISE",
      currentPlan: plan,
    }
  }

  if (isSupplierPlan(plan, companyType)) {
    if (gate.supplierAccess) {
      return {
        allowed: true,
        reason: null,
        minPlan: gate.minPlan,
        currentPlan: plan,
      }
    }
    return {
      allowed: false,
      reason: "This feature is not available for supplier accounts",
      minPlan: gate.minPlan,
      currentPlan: plan,
    }
  }

  if (isPlanAtLeast(plan, gate.minPlan)) {
    return {
      allowed: true,
      reason: null,
      minPlan: gate.minPlan,
      currentPlan: plan,
    }
  }

  return {
    allowed: false,
    reason: `This feature requires the ${gate.minPlan} plan or higher. Your current plan is ${plan}.`,
    minPlan: gate.minPlan,
    currentPlan: plan,
  }
}

export function canUseFeature(
  plan: PlanKey,
  companyType: string,
  featureKey: FeatureKey
): boolean {
  return checkFeatureAccess(plan, companyType, featureKey).allowed
}

export const OEM_NAV_FEATURE_GATES: Record<string, FeatureKey> = {
  "/quality/oem/defects": "DEFECTS",
  "/quality/oem/field": "FIELD_QUALITY",
  "/quality/oem/ppap": "PPAP",
  "/quality/oem/iqc": "IQC",
  "/quality/oem/fmea": "FMEA",
  "/quality/oem/escalations": "ESCALATION",
  "/quality/oem/war-room": "WAR_ROOM",
  "/quality/oem/quality-intelligence": "QUALITY_INTELLIGENCE",
  "/quality/oem/notifications": "NOTIFICATIONS",
}