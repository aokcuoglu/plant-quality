import type { CustomFieldEntity, CustomFieldType } from "./constants"

export type { CustomFieldEntity, CustomFieldType }

export interface SelectOption {
  label: string
  value: string
}

export interface FieldValidation {
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  patternMessage?: string
}

export interface CustomFieldDefinition {
  id: string
  companyId: string
  entity: CustomFieldEntity
  fieldName: string
  label: string | null
  placeholder: string | null
  fieldType: CustomFieldType
  section: string | null
  isBuiltIn: boolean
  visible: boolean
  required: boolean
  options: SelectOption[] | null
  defaultValue: unknown | null
  validation: FieldValidation | null
  visibleInList: boolean
  order: number
  active: boolean
}

export type CustomFieldsData = Record<string, unknown>

export interface BuiltInFieldConfig {
  fieldName: string
  label: string
  fieldType: CustomFieldType
  required: boolean
  section: string
  options?: SelectOption[]
  placeholder?: string
}

export interface ResolvedField {
  id?: string | null
  fieldName: string
  label: string
  fieldType: CustomFieldType
  section: string | null
  isBuiltIn: boolean
  visible: boolean
  required: boolean
  options: SelectOption[] | null
  placeholder: string | null
  defaultValue: unknown | null
  validation: FieldValidation | null
  visibleInList: boolean
  order: number
}

export interface CreateCustomFieldInput {
  entity: CustomFieldEntity
  fieldName: string
  label?: string | null
  fieldType: CustomFieldType
  section?: string | null
  required?: boolean
  placeholder?: string | null
  description?: string | null
  options?: SelectOption[] | null
  defaultValue?: unknown | null
  validation?: FieldValidation | null
  visibleInList?: boolean
  order?: number
}

export interface UpdateCustomFieldInput {
  label?: string | null
  placeholder?: string | null
  section?: string | null
  visible?: boolean
  required?: boolean
  options?: SelectOption[] | null
  defaultValue?: unknown | null
  validation?: FieldValidation | null
  visibleInList?: boolean
  order?: number
  active?: boolean
}

export interface FieldConfigOverride {
  entity: CustomFieldEntity
  fieldName: string
  visible?: boolean
  required?: boolean
  label?: string
  options?: SelectOption[]
}

export interface IndustryTemplate {
  id: string
  name: string
  description: string
  icon: string
  configs: Record<CustomFieldEntity, {
    builtInOverrides: FieldConfigOverride[]
    customFields: CreateCustomFieldInput[]
  }>
}
