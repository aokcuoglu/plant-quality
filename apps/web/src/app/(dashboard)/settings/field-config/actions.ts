"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireFeature } from "@/lib/billing"
import { resolveFieldConfig } from "@/lib/custom-fields/resolver"
import { CUSTOM_FIELD_ENTITIES, FEATURE_KEY, type CustomFieldEntity } from "@/lib/custom-fields/constants"
import type { CreateCustomFieldInput, UpdateCustomFieldInput } from "@/lib/custom-fields/types"
import type { ResolvedFields } from "@/lib/custom-fields/resolver"
import type { Prisma } from "@plantx/db/client"

function jsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined
  return value as Prisma.InputJsonValue
}

export async function getFieldConfig(
  entity: CustomFieldEntity
): Promise<{ resolved: ResolvedFields | null; error?: string }> {
  const session = await auth()
  if (!session?.user) return { resolved: null, error: "Unauthorized" }

  const access = requireFeature(session, FEATURE_KEY)
  if (!access.allowed) {
    return { resolved: null, error: access.reason ?? "Custom fields require an ENTERPRISE plan" }
  }

  try {
    const resolved = await resolveFieldConfig(session.user.companyId, entity)
    return { resolved }
  } catch {
    return { resolved: null, error: "Failed to load field configuration" }
  }
}

export async function getAvailableEntities(): Promise<{ entity: CustomFieldEntity; label: string }[]> {
  return CUSTOM_FIELD_ENTITIES.map((entity) => ({
    entity,
    label: {
      DEFECT: "Defect",
      FIELD_DEFECT: "Field Defect",
      PPAP_SUBMISSION: "PPAP",
      IQC_REPORT: "IQC",
      FMEA: "FMEA",
      LOGISTIC_ORDER: "Logistic Order",
    }[entity],
  }))
}

export async function createCustomField(
  input: CreateCustomFieldInput
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user) return { success: false, error: "Unauthorized" }

  const access = requireFeature(session, FEATURE_KEY)
  if (!access.allowed) {
    return { success: false, error: access.reason ?? "Custom fields require an ENTERPRISE plan" }
  }

  if (!input.fieldName || !input.entity || !input.fieldType) {
    return { success: false, error: "Field name, entity, and type are required" }
  }

  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(input.fieldName)) {
    return { success: false, error: "Field name must start with a letter and contain only letters, numbers, and underscores" }
  }

  const existing = await prisma.customFieldDefinition.findUnique({
    where: {
      companyId_entity_fieldName: {
        companyId: session.user.companyId,
        entity: input.entity,
        fieldName: input.fieldName,
      },
    },
  })
  if (existing) {
    return { success: false, error: `A field named "${input.fieldName}" already exists for this entity` }
  }

  const maxOrder = await prisma.customFieldDefinition.aggregate({
    where: { companyId: session.user.companyId, entity: input.entity },
    _max: { order: true },
  })

  await prisma.customFieldDefinition.create({
    data: {
      companyId: session.user.companyId,
      entity: input.entity,
      fieldName: input.fieldName,
      label: input.label ?? undefined,
      fieldType: input.fieldType,
      section: input.section ?? undefined,
      required: input.required ?? false,
      placeholder: input.placeholder ?? undefined,
      options: jsonValue(input.options),
      defaultValue: jsonValue(input.defaultValue),
      validation: jsonValue(input.validation),
      visibleInList: input.visibleInList ?? false,
      order: input.order ?? ((maxOrder._max.order ?? -1) + 1),
      isBuiltIn: false,
      visible: true,
      active: true,
    },
  })

  revalidatePath("/settings/field-config")
  return { success: true }
}

export async function updateCustomField(
  id: string,
  input: UpdateCustomFieldInput
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user) return { success: false, error: "Unauthorized" }

  const access = requireFeature(session, FEATURE_KEY)
  if (!access.allowed) {
    return { success: false, error: access.reason ?? "Custom fields require an ENTERPRISE plan" }
  }

  const existing = await prisma.customFieldDefinition.findFirst({
    where: { id, companyId: session.user.companyId },
  })
  if (!existing) {
    return { success: false, error: "Field definition not found" }
  }

  const data: Record<string, unknown> = {}

  if (input.label !== undefined) data.label = input.label
  if (input.placeholder !== undefined) data.placeholder = input.placeholder
  if (input.section !== undefined) data.section = input.section
  if (input.visible !== undefined) data.visible = input.visible
  if (input.required !== undefined) data.required = input.required
  if (input.options !== undefined) data.options = jsonValue(input.options)
  if (input.defaultValue !== undefined) data.defaultValue = jsonValue(input.defaultValue)
  if (input.validation !== undefined) data.validation = jsonValue(input.validation)
  if (input.visibleInList !== undefined) data.visibleInList = input.visibleInList
  if (input.order !== undefined) data.order = input.order
  if (input.active !== undefined) data.active = input.active

  await prisma.customFieldDefinition.update({
    where: { id },
    data,
  })

  revalidatePath("/settings/field-config")
  return { success: true }
}

export async function deleteCustomField(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user) return { success: false, error: "Unauthorized" }

  const access = requireFeature(session, FEATURE_KEY)
  if (!access.allowed) {
    return { success: false, error: access.reason ?? "Custom fields require an ENTERPRISE plan" }
  }

  const existing = await prisma.customFieldDefinition.findFirst({
    where: { id, companyId: session.user.companyId },
  })
  if (!existing) {
    return { success: false, error: "Field definition not found" }
  }

  if (existing.isBuiltIn) {
    return { success: false, error: "Built-in fields cannot be deleted. You can hide them instead." }
  }

  await prisma.customFieldDefinition.update({
    where: { id },
    data: { active: false },
  })

  revalidatePath("/settings/field-config")
  return { success: true }
}

export async function reorderCustomFields(
  entity: CustomFieldEntity,
  items: { id: string; order: number }[]
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user) return { success: false, error: "Unauthorized" }

  const access = requireFeature(session, FEATURE_KEY)
  if (!access.allowed) {
    return { success: false, error: access.reason ?? "Custom fields require an ENTERPRISE plan" }
  }

  await prisma.$transaction(
    items.map((item) =>
      prisma.customFieldDefinition.updateMany({
        where: { id: item.id, companyId: session.user.companyId },
        data: { order: item.order },
      })
    )
  )

  revalidatePath("/settings/field-config")
  return { success: true }
}
