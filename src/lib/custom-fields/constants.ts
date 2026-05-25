export const CUSTOM_FIELD_ENTITIES = [
  "DEFECT",
  "FIELD_DEFECT",
  "PPAP_SUBMISSION",
  "IQC_REPORT",
  "FMEA",
  "LOGISTIC_ORDER",
] as const

export type CustomFieldEntity = (typeof CUSTOM_FIELD_ENTITIES)[number]

export const CUSTOM_FIELD_TYPES = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "DATE",
  "SELECT",
  "MULTI_SELECT",
  "CHECKBOX",
  "URL",
  "EMAIL",
  "USER",
] as const

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number]

export const ENTITY_LABELS: Record<CustomFieldEntity, string> = {
  DEFECT: "Defect",
  FIELD_DEFECT: "Field Defect",
  PPAP_SUBMISSION: "PPAP Submission",
  IQC_REPORT: "IQC Report",
  FMEA: "FMEA",
  LOGISTIC_ORDER: "Logistic Order",
}

export const ENTITY_DESCRIPTIONS: Record<CustomFieldEntity, string> = {
  DEFECT: "Configure fields for defect creation and management",
  FIELD_DEFECT: "Configure fields for field defect reporting",
  PPAP_SUBMISSION: "Configure fields for PPAP submissions",
  IQC_REPORT: "Configure fields for incoming quality control inspections",
  FMEA: "Configure fields for FMEA records",
  LOGISTIC_ORDER: "Configure fields for logistic orders",
}

export const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  TEXT: "Text",
  TEXTAREA: "Long Text",
  NUMBER: "Number",
  DATE: "Date",
  SELECT: "Dropdown (Single)",
  MULTI_SELECT: "Dropdown (Multi)",
  CHECKBOX: "Checkbox",
  URL: "URL",
  EMAIL: "Email",
  USER: "User Reference",
}

export const FEATURE_KEY = "CUSTOM_FIELDS" as const

export const CUSTOM_FIELDS_CACHE_TAG = "custom-fields-config"
