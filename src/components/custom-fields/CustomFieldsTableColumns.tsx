import type { ResolvedField } from "@/lib/custom-fields/types"
import type { CustomFieldType } from "@/lib/custom-fields/constants"

export function getListVisibleFields(allFields: ResolvedField[]): ResolvedField[] {
  return allFields.filter((f) => f.visibleInList && f.visible)
}

export function CustomFieldsTableHeaders({ fields }: { fields: ResolvedField[] }) {
  if (fields.length === 0) return null

  return (
    <>
      {fields.map((field) => (
        <th
          key={field.fieldName}
          className="h-11 px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          {field.label}
        </th>
      ))}
    </>
  )
}

export function CustomFieldsTableCells({
  fields,
  customFields,
}: {
  fields: ResolvedField[]
  customFields: Record<string, unknown> | null
}) {
  if (fields.length === 0) return null

  return (
    <>
      {fields.map((field) => (
        <td key={field.fieldName} className="p-3 align-middle text-sm">
          {formatValue(field.fieldType, customFields?.[field.fieldName])}
        </td>
      ))}
    </>
  )
}

function formatValue(fieldType: CustomFieldType, value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (fieldType === "CHECKBOX") return value ? "Yes" : "No"
  if (fieldType === "MULTI_SELECT" && Array.isArray(value)) return value.join(", ")
  if (fieldType === "DATE" && typeof value === "string") {
    try {
      return new Date(value).toLocaleDateString()
    } catch {
      return String(value)
    }
  }
  return String(value)
}
