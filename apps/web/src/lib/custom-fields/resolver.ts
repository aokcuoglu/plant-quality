import { prisma } from "@/lib/prisma"
import { getBuiltInFields } from "./registry"
import type { CustomFieldEntity } from "./constants"
import type { BuiltInFieldConfig, ResolvedField, SelectOption } from "./types"
import type { CustomFieldDefinition as PrismaFieldDef } from "@plantx/db/client"

function castOptions(json: unknown): SelectOption[] | null {
  if (!json || typeof json !== "object") return null
  const arr = json as Array<Record<string, unknown>>
  if (!Array.isArray(arr)) return null
  return arr.map((item) => ({
    label: String(item.label ?? ""),
    value: String(item.value ?? ""),
  }))
}

function castValidation(json: unknown): ResolvedField["validation"] {
  if (!json || typeof json !== "object") return null
  return json as ResolvedField["validation"]
}

function mergeField(builtIn: BuiltInFieldConfig, override: PrismaFieldDef): ResolvedField {
  return {
    id: override.id,
    fieldName: override.fieldName,
    label: override.label ?? builtIn.label,
    fieldType: builtIn.fieldType,
    section: override.section ?? builtIn.section,
    isBuiltIn: true,
    visible: override.visible,
    required: override.required,
    options: castOptions(override.options) ?? builtIn.options ?? null,
    placeholder: override.placeholder ?? builtIn.placeholder ?? null,
    defaultValue: override.defaultValue ?? null,
    validation: castValidation(override.validation),
    visibleInList: override.visibleInList,
    order: override.order,
  }
}

function mapCustomField(cf: PrismaFieldDef): ResolvedField {
  return {
    id: cf.id,
    fieldName: cf.fieldName,
    label: cf.label ?? cf.fieldName,
    fieldType: cf.fieldType,
    section: cf.section,
    isBuiltIn: false,
    visible: cf.visible,
    required: cf.required,
    options: castOptions(cf.options),
    placeholder: cf.placeholder,
    defaultValue: cf.defaultValue ?? null,
    validation: castValidation(cf.validation),
    visibleInList: cf.visibleInList,
    order: cf.order,
  }
}

export class NoOpResolver {
  buildInFields: BuiltInFieldConfig[]

  constructor(entity: CustomFieldEntity) {
    this.buildInFields = getBuiltInFields(entity)
  }

  resolve(): ResolvedField[] {
    return this.buildInFields.map((bf): ResolvedField => ({
      fieldName: bf.fieldName,
      label: bf.label,
      fieldType: bf.fieldType,
      section: bf.section,
      isBuiltIn: true,
      visible: true,
      required: bf.required,
      options: bf.options ?? null,
      placeholder: bf.placeholder ?? null,
      defaultValue: null,
      validation: null,
      visibleInList: false,
      order: 0,
    }))
  }

  get visible(): ResolvedField[] {
    return this.resolve().filter((f) => f.visible)
  }

  get builtIn(): ResolvedField[] {
    return this.resolve().filter((f) => f.isBuiltIn)
  }

  get custom(): ResolvedField[] {
    return []
  }
}

export interface ResolvedFields {
  all: ResolvedField[]
  visible: ResolvedField[]
  builtIn: ResolvedField[]
  custom: ResolvedField[]
}

export async function resolveFieldConfig(
  companyId: string,
  entity: CustomFieldEntity,
): Promise<ResolvedFields> {
  const builtInFields = getBuiltInFields(entity)

  const overrides = await prisma.customFieldDefinition.findMany({
    where: { companyId, entity, active: true },
    orderBy: { order: "asc" },
  })

  const overrideMap = new Map(
    overrides.filter((o) => o.isBuiltIn).map((o) => [o.fieldName, o]),
  )

  const builtIn: ResolvedField[] = builtInFields.map((bf) => {
    const override = overrideMap.get(bf.fieldName)
    return override ? mergeField(bf, override) : {
      fieldName: bf.fieldName,
      label: bf.label,
      fieldType: bf.fieldType,
      section: bf.section,
      isBuiltIn: true,
      visible: true,
      required: bf.required,
      options: bf.options ?? null,
      placeholder: bf.placeholder ?? null,
      defaultValue: null,
      validation: null,
      visibleInList: false,
      order: 0,
    }
  })

  const custom: ResolvedField[] = overrides
    .filter((o) => !o.isBuiltIn)
    .map(mapCustomField)

  const all = [...builtIn, ...custom].sort((a, b) => a.order - b.order)
  const visible = all.filter((f) => f.visible)

  return { all, visible, builtIn, custom }
}

export function resolveFieldConfigSync(
  entity: CustomFieldEntity,
): NoOpResolver {
  return new NoOpResolver(entity)
}
