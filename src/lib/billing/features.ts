import type { PlanKey } from "./plans"
import { isPlanAtLeast, isSupplierPlan } from "./plans"

export type ModuleKey = "PLANT_QUALITY_MODULE" | "PLANT_LOGISTIC_MODULE"

export type ModuleStatus = "ACTIVE" | "LIVE" | "LOCKED" | "SOON"

export type ModuleCatalogEntry = {
  id: string
  name: string
  description: string
  status: "live" | "soon"
  moduleKey: ModuleKey | null
  supplierAccess: boolean
  href: string | null
}

export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  {
    id: "quality",
    name: "PlantQuality",
    description: "AI-Powered 8D & Quality Management",
    status: "live",
    moduleKey: "PLANT_QUALITY_MODULE",
    supplierAccess: true,
    href: "/quality/oem",
  },
  {
    id: "logistic",
    name: "PlantLogistic",
    description: "Vehicle Order & Delivery Control Tower",
    status: "live",
    moduleKey: "PLANT_LOGISTIC_MODULE",
    supplierAccess: false,
    href: "/logistic",
  },
  {
    id: "dock",
    name: "PlantDock",
    description: "Warehouse Gate & Logistics",
    status: "soon",
    moduleKey: null,
    supplierAccess: false,
    href: null,
  },
  {
    id: "quote",
    name: "PlantQuote",
    description: "RFQ & Supplier Bidding",
    status: "soon",
    moduleKey: null,
    supplierAccess: false,
    href: null,
  },
  {
    id: "trace",
    name: "PlantTrace",
    description: "Traceability & Carbon Footprint",
    status: "soon",
    moduleKey: null,
    supplierAccess: false,
    href: null,
  },
  {
    id: "audit",
    name: "PlantAudit",
    description: "Digital Auditing (LPA, VDA)",
    status: "soon",
    moduleKey: null,
    supplierAccess: false,
    href: null,
  },
  {
    id: "asset",
    name: "PlantAsset",
    description: "Machinery Maintenance & OEE",
    status: "soon",
    moduleKey: null,
    supplierAccess: false,
    href: null,
  },
  {
    id: "flow",
    name: "PlantFlow",
    description: "Internal Material Flow & RFID",
    status: "soon",
    moduleKey: null,
    supplierAccess: false,
    href: null,
  },
  {
    id: "staff",
    name: "PlantStaff",
    description: "Skill Matrix & HSE Compliance",
    status: "soon",
    moduleKey: null,
    supplierAccess: false,
    href: null,
  },
]

export function getModuleStatus(
  entry: ModuleCatalogEntry,
  companyId: string,
  companyType: string,
  currentModule: "quality" | "logistic" | null,
): ModuleStatus {
  if (entry.moduleKey && currentModule && entry.id === currentModule) {
    return "ACTIVE"
  }
  if (entry.status === "soon") {
    return "SOON"
  }
  if (entry.moduleKey) {
    const hasAccess = checkModuleAccess(entry.moduleKey, companyId, companyType)
    return hasAccess ? "LIVE" : "LOCKED"
  }
  return "SOON"
}

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
  | "EXECUTIVE_COCKPIT"
  | "SUPPLIER_DEVELOPMENT"
  | "PLANT_LOGISTIC"
  | "CUSTOM_FIELDS"

export type ModuleEntitlement = {
  key: ModuleKey
  label: string
  description: string
  supplierAccess: boolean
  featureGate?: FeatureKey
}

export const MODULE_ENTITLEMENTS: Record<ModuleKey, ModuleEntitlement> = {
  PLANT_QUALITY_MODULE: {
    key: "PLANT_QUALITY_MODULE",
    label: "PlantQuality",
    description: "AI-Powered 8D & Quality Management",
    supplierAccess: true,
  },
  PLANT_LOGISTIC_MODULE: {
    key: "PLANT_LOGISTIC_MODULE",
    label: "PlantLogistic",
    description: "Vehicle Order & Delivery Control Tower",
    supplierAccess: false,
    featureGate: "PLANT_LOGISTIC",
  },
}

export const MODULE_ORDER: ModuleKey[] = [
  "PLANT_QUALITY_MODULE",
  "PLANT_LOGISTIC_MODULE",
]

export function isModuleEntitled(moduleKey: ModuleKey, companyType: string): boolean {
  const entitlement = MODULE_ENTITLEMENTS[moduleKey]
  if (!entitlement) return false
  return entitlement.supplierAccess || companyType !== "SUPPLIER"
}

export interface FeatureGate {
  key: FeatureKey
  label: string
  description: string
  minPlan: PlanKey
  supplierAccess: boolean
  module?: ModuleKey
}

export const FEATURE_GATES: Record<FeatureKey, FeatureGate> = {
  DEFECTS: {
    key: "DEFECTS",
    label: "Defects",
    description: "Defect creation and management",
    minPlan: "FREE",
    supplierAccess: true,
    module: "PLANT_QUALITY_MODULE",
  },
  FIELD_QUALITY: {
    key: "FIELD_QUALITY",
    label: "Field Quality",
    description: "Field defect tracking and management",
    minPlan: "FREE",
    supplierAccess: true,
    module: "PLANT_QUALITY_MODULE",
  },
  EIGHT_D: {
    key: "EIGHT_D",
    label: "8D Workflow",
    description: "8D problem-solving workflow",
    minPlan: "FREE",
    supplierAccess: true,
    module: "PLANT_QUALITY_MODULE",
  },
  SUPPLIER_PORTAL: {
    key: "SUPPLIER_PORTAL",
    label: "Supplier Portal",
    description: "Supplier collaboration and assigned records",
    minPlan: "FREE",
    supplierAccess: true,
    module: "PLANT_QUALITY_MODULE",
  },
  PPAP: {
    key: "PPAP",
    label: "PPAP",
    description: "Production Part Approval Process",
    minPlan: "PRO",
    supplierAccess: true,
    module: "PLANT_QUALITY_MODULE",
  },
  IQC: {
    key: "IQC",
    label: "IQC",
    description: "Incoming Quality Control",
    minPlan: "PRO",
    supplierAccess: true,
    module: "PLANT_QUALITY_MODULE",
  },
  FMEA: {
    key: "FMEA",
    label: "FMEA",
    description: "Failure Mode and Effects Analysis",
    minPlan: "PRO",
    supplierAccess: true,
    module: "PLANT_QUALITY_MODULE",
  },
  SLA: {
    key: "SLA",
    label: "SLA Tracking",
    description: "Service Level Agreement tracking and alerts",
    minPlan: "PRO",
    supplierAccess: false,
    module: "PLANT_QUALITY_MODULE",
  },
  ESCALATION: {
    key: "ESCALATION",
    label: "Escalation",
    description: "Escalation workflows",
    minPlan: "PRO",
    supplierAccess: true,
    module: "PLANT_QUALITY_MODULE",
  },
  WAR_ROOM: {
    key: "WAR_ROOM",
    label: "War Room",
    description: "Critical defect management",
    minPlan: "PRO",
    supplierAccess: false,
    module: "PLANT_QUALITY_MODULE",
  },
  NOTIFICATIONS: {
    key: "NOTIFICATIONS",
    label: "Notifications",
    description: "In-app notification system",
    minPlan: "FREE",
    supplierAccess: true,
    module: "PLANT_QUALITY_MODULE",
  },
  SIMILAR_ISSUES: {
    key: "SIMILAR_ISSUES",
    label: "Similar Issues",
    description: "AI-powered similar issue detection",
    minPlan: "PRO",
    supplierAccess: false,
    module: "PLANT_QUALITY_MODULE",
  },
  AI_CLASSIFICATION: {
    key: "AI_CLASSIFICATION",
    label: "AI Classification",
    description: "AI defect classification",
    minPlan: "PRO",
    supplierAccess: false,
    module: "PLANT_QUALITY_MODULE",
  },
  AI_8D_REVIEW: {
    key: "AI_8D_REVIEW",
    label: "AI 8D Review",
    description: "AI expert review of 8D reports",
    minPlan: "ENTERPRISE",
    supplierAccess: false,
    module: "PLANT_QUALITY_MODULE",
  },
  ROOT_CAUSE_SUGGESTION: {
    key: "ROOT_CAUSE_SUGGESTION",
    label: "Root Cause Suggestion",
    description: "AI-driven root cause analysis",
    minPlan: "ENTERPRISE",
    supplierAccess: false,
    module: "PLANT_QUALITY_MODULE",
  },
  CATEGORY_INTELLIGENCE: {
    key: "CATEGORY_INTELLIGENCE",
    label: "Category Intelligence",
    description: "Category-level AI insights",
    minPlan: "PRO",
    supplierAccess: false,
    module: "PLANT_QUALITY_MODULE",
  },
  QUALITY_INTELLIGENCE: {
    key: "QUALITY_INTELLIGENCE",
    label: "Quality Intelligence",
    description: "Quality intelligence dashboard",
    minPlan: "PRO",
    supplierAccess: false,
    module: "PLANT_QUALITY_MODULE",
  },
  API_ACCESS: {
    key: "API_ACCESS",
    label: "API Access",
    description: "REST/GraphQL API access",
    minPlan: "ENTERPRISE",
    supplierAccess: false,
    module: "PLANT_QUALITY_MODULE",
  },
  WEBHOOKS: {
    key: "WEBHOOKS",
    label: "Webhooks",
    description: "Outbound event webhooks",
    minPlan: "ENTERPRISE",
    supplierAccess: false,
    module: "PLANT_QUALITY_MODULE",
  },
  SSO: {
    key: "SSO",
    label: "SSO",
    description: "SAML/OIDC single sign-on",
    minPlan: "ENTERPRISE",
    supplierAccess: false,
    module: "PLANT_QUALITY_MODULE",
  },
  MULTI_PLANT: {
    key: "MULTI_PLANT",
    label: "Multi-Plant",
    description: "Multi-plant organization support",
    minPlan: "ENTERPRISE",
    supplierAccess: false,
    module: "PLANT_QUALITY_MODULE",
  },
  ADVANCED_AUDIT_LOG: {
    key: "ADVANCED_AUDIT_LOG",
    label: "Advanced Audit Log",
    description: "Detailed audit trail",
    minPlan: "ENTERPRISE",
    supplierAccess: false,
    module: "PLANT_QUALITY_MODULE",
  },
  EMAIL_NOTIFICATIONS: {
    key: "EMAIL_NOTIFICATIONS",
    label: "Email Notifications",
    description: "Email delivery of critical alerts",
    minPlan: "ENTERPRISE",
    supplierAccess: false,
    module: "PLANT_QUALITY_MODULE",
  },
  SUPPLIER_SCORECARD: {
    key: "SUPPLIER_SCORECARD",
    label: "Supplier Scorecard",
    description: "Supplier quality scorecard with deterministic scoring, risk grading, and drill-down signals",
    minPlan: "ENTERPRISE",
    supplierAccess: true,
    module: "PLANT_QUALITY_MODULE",
  },
  QUALITY_LINKAGE: {
    key: "QUALITY_LINKAGE",
    label: "Quality Linkage",
    description: "Cross-module related records and quality linkage",
    minPlan: "PRO",
    supplierAccess: true,
    module: "PLANT_QUALITY_MODULE",
  },
  EXECUTIVE_COCKPIT: {
    key: "EXECUTIVE_COCKPIT",
    label: "Executive Cockpit",
    description: "Executive quality dashboard with KPIs, risk signals, and action items",
    minPlan: "ENTERPRISE",
    supplierAccess: false,
    module: "PLANT_QUALITY_MODULE",
  },
  SUPPLIER_DEVELOPMENT: {
    key: "SUPPLIER_DEVELOPMENT",
    label: "Supplier Development",
    description: "Supplier development action plans for managing supplier improvement",
    minPlan: "ENTERPRISE",
    supplierAccess: true,
    module: "PLANT_QUALITY_MODULE",
  },
  PLANT_LOGISTIC: {
    key: "PLANT_LOGISTIC",
    label: "PlantLogistic",
    description: "Vehicle order tracking, production planning, and delivery control tower",
    minPlan: "FREE",
    supplierAccess: false,
    module: "PLANT_LOGISTIC_MODULE",
  },
  CUSTOM_FIELDS: {
    key: "CUSTOM_FIELDS",
    label: "Custom Fields",
    description: "Configure form fields and add custom fields per entity",
    minPlan: "ENTERPRISE",
    supplierAccess: true,
    module: "PLANT_QUALITY_MODULE",
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

const DEMO_MODULE_ENTITLEMENTS: Record<string, ModuleKey[]> = {
  "oem-free-company": ["PLANT_QUALITY_MODULE"],
  "oem-company": ["PLANT_QUALITY_MODULE", "PLANT_LOGISTIC_MODULE"],
  "oem-enterprise-company": ["PLANT_QUALITY_MODULE", "PLANT_LOGISTIC_MODULE"],
  "supplier-company": ["PLANT_QUALITY_MODULE"],
  "supplier-company-2": ["PLANT_QUALITY_MODULE"],
}

function getCompanyModules(companyId: string, companyType: string): ModuleKey[] {
  if (companyType === "SUPPLIER") {
    return ["PLANT_QUALITY_MODULE"]
  }
  if (companyType === "DEALER" || companyType === "DISTRIBUTOR") {
    return []
  }
  const entitlements = DEMO_MODULE_ENTITLEMENTS[companyId]
  if (entitlements) return entitlements
  return ["PLANT_QUALITY_MODULE", "PLANT_LOGISTIC_MODULE"]
}

export function checkModuleAccess(moduleKey: ModuleKey, companyId: string, companyType: string): boolean {
  if (moduleKey === "PLANT_QUALITY_MODULE") return true
  if (companyType === "DEALER" || companyType === "DISTRIBUTOR") return false
  const entitlement = MODULE_ENTITLEMENTS[moduleKey]
  if (!entitlement) return false
  if (companyType === "SUPPLIER" && !entitlement.supplierAccess) return false
  const modules = getCompanyModules(companyId, companyType)
  return modules.includes(moduleKey)
}

export function checkFeatureAccess(
  plan: PlanKey,
  companyType: string,
  featureKey: FeatureKey,
  companyId?: string
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

  if (gate.module) {
    const entitlement = MODULE_ENTITLEMENTS[gate.module]
    const hasModuleAccess = companyId
      ? checkModuleAccess(gate.module, companyId, companyType)
      : isModuleEntitled(gate.module, companyType)

    if (!hasModuleAccess) {
      return {
        allowed: false,
        reason: entitlement
          ? `The ${entitlement.label} module is not included in your current subscription. Contact sales to add it.`
          : "This module is not available for your account.",
        minPlan: gate.minPlan,
        currentPlan: plan,
      }
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
  featureKey: FeatureKey,
  companyId?: string
): boolean {
  return checkFeatureAccess(plan, companyType, featureKey, companyId).allowed
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
  "/quality/oem/executive": "EXECUTIVE_COCKPIT",
  "/quality/oem/scorecard": "SUPPLIER_SCORECARD",
  "/quality/oem/supplier-development": "SUPPLIER_DEVELOPMENT",
  "/quality/oem/notifications": "NOTIFICATIONS",
  "/logistic": "PLANT_LOGISTIC",
  "/logistic/orders": "PLANT_LOGISTIC",
  "/logistic/orders/new": "PLANT_LOGISTIC",
}