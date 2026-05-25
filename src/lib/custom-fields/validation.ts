import { z } from "zod"
import type { ResolvedField } from "./types"
import type { CustomFieldType } from "./constants"

type ZodTypeMap = Record<CustomFieldType, () => z.ZodTypeAny>

function baseValidator(field: ResolvedField): z.ZodTypeAny {
  const baseMap: Record<string, () => z.ZodTypeAny> = {
    TEXT: () => z.string(),
    TEXTAREA: () => z.string(),
    NUMBER: () => {
      let schema = z.coerce.number()
      if (field.validation?.min !== undefined) schema = schema.min(field.validation.min)
      if (field.validation?.max !== undefined) schema = schema.max(field.validation.max)
      return schema
    },
    DATE: () => z.coerce.date().or(z.string()),
    SELECT: () => {
      if (field.options && field.options.length > 0) {
        const values = field.options.map((o) => o.value)
        return z.enum(values as [string, ...string[]])
      }
      return z.string()
    },
    MULTI_SELECT: () => {
      if (field.options && field.options.length > 0) {
        const values = field.options.map((o) => o.value)
        return z.array(z.enum(values as [string, ...string[]]))
      }
      return z.array(z.string())
    },
    CHECKBOX: () => z.boolean().or(z.literal("on").transform(() => true)).or(z.literal("off").transform(() => false)),
    URL: () => z.string().url().or(z.literal("")),
    EMAIL: () => z.string().email().or(z.literal("")),
    USER: () => z.string(),
  }

  const builder = baseMap[field.fieldType]
  if (!builder) return z.any()

  let schema = builder()

  if (field.fieldType === "TEXT" || field.fieldType === "TEXTAREA") {
    const strSchema = schema as z.ZodString
    if (field.validation?.minLength !== undefined) {
      schema = strSchema.min(field.validation.minLength)
    }
    if (field.validation?.maxLength !== undefined) {
      schema = strSchema.max(field.validation.maxLength)
    }
    if (field.validation?.pattern) {
      try {
        const regex = new RegExp(field.validation.pattern)
        schema = strSchema.regex(regex, field.validation.patternMessage ?? "Invalid format")
      } catch {
        // ignore invalid regex
      }
    }
  }

  if (!field.required) {
    schema = schema.optional().nullable()
  }

  return schema
}

export function buildCustomFieldsSchema(fields: ResolvedField[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const field of fields) {
    if (!field.isBuiltIn) {
      shape[field.fieldName] = baseValidator(field)
    }
  }

  return z.object(shape)
}

export function validateCustomFields(
  data: Record<string, unknown>,
  fields: ResolvedField[],
): { success: boolean; data?: Record<string, unknown>; error?: string } {
  const schema = buildCustomFieldsSchema(fields)
  const result = schema.safeParse(data)

  if (!result.success) {
    const firstIssue = result.error.issues[0]
    return {
      success: false,
      error: `${firstIssue.path.join(".")}: ${firstIssue.message}`,
    }
  }

  return { success: true, data: result.data }
}
