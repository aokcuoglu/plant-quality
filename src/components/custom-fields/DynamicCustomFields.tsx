"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { ResolvedField } from "@/lib/custom-fields/types"
import type { CustomFieldType, CustomFieldEntity } from "@/lib/custom-fields/constants"

interface DynamicCustomFieldsProps {
  entity: CustomFieldEntity
  fields: ResolvedField[]
  values: Record<string, unknown>
  onChange: (fieldName: string, value: unknown) => void
  errors?: Record<string, string>
  mode?: "create" | "edit" | "view"
}

export function DynamicCustomFields({
  entity: _entity,
  fields,
  values,
  onChange,
  errors,
  mode = "create",
}: DynamicCustomFieldsProps) {
  const customFields = fields.filter((f) => !f.isBuiltIn)

  if (customFields.length === 0) return null

  if (mode === "view") {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Additional Information</h3>
        <div className="rounded-lg border bg-card">
          {customFields.map((field) => (
            <div
              key={field.fieldName}
              className="flex items-center justify-between border-b border-border px-4 py-2.5 last:border-b-0"
            >
              <span className="text-sm text-muted-foreground">{field.label}</span>
              <span className="text-sm font-medium">{formatValue(field.fieldType, values[field.fieldName])}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Additional Information</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {customFields.map((field) => (
          <div key={field.fieldName} className={field.fieldType === "TEXTAREA" ? "sm:col-span-2" : ""}>
            <FieldInput
              field={field}
              value={values[field.fieldName]}
              onChange={(val) => onChange(field.fieldName, val)}
              error={errors?.[field.fieldName]}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function FieldInput({
  field,
  value,
  onChange,
  error,
}: {
  field: ResolvedField
  value: unknown
  onChange: (value: unknown) => void
  error?: string
}) {
  const label = field.label
  const required = field.required
  const placeholder = field.placeholder ?? undefined

  switch (field.fieldType as CustomFieldType) {
    case "TEXT":
    case "URL":
    case "EMAIL":
      return (
        <div className="space-y-1.5">
          <Label>
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            type={field.fieldType === "EMAIL" ? "email" : field.fieldType === "URL" ? "url" : "text"}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={placeholder}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )

    case "TEXTAREA":
      return (
        <div className="space-y-1.5">
          <Label>
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={placeholder}
            rows={3}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )

    case "NUMBER":
      return (
        <div className="space-y-1.5">
          <Label>
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            type="number"
            value={value != null ? String(value) : ""}
            onChange={(e) => {
              const val = e.target.value
              onChange(val === "" ? null : Number(val))
            }}
            placeholder={placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )

    case "DATE":
      return (
        <div className="space-y-1.5">
          <Label>
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )

    case "SELECT":
      return (
        <div className="space-y-1.5">
          <Label>
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <select
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
          >
            <option value="">{placeholder ?? "Select..."}</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )

    case "MULTI_SELECT":
      return (
        <div className="space-y-1.5">
          <Label>
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <div className="space-y-1">
            {field.options?.map((opt) => {
              const selected = Array.isArray(value) ? value.includes(opt.value) : false
              return (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => {
                      const current = Array.isArray(value) ? [...value] : []
                      if (e.target.checked) {
                        onChange([...current, opt.value])
                      } else {
                        onChange(current.filter((v: string) => v !== opt.value))
                      }
                    }}
                    className="rounded border-input"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              )
            })}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )

    case "CHECKBOX":
      return (
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={Boolean(value)}
              onCheckedChange={(checked) => onChange(checked === true ? true : null)}
            />
            <span className="text-sm">
              {label} {required && <span className="text-destructive">*</span>}
            </span>
          </label>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )

    case "USER":
      return (
        <div className="space-y-1.5">
          <Label>
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={placeholder ?? "User ID"}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )

    default:
      return (
        <div className="space-y-1.5">
          <Label>
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={placeholder}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )
  }
}

function formatValue(fieldType: CustomFieldType, value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (fieldType === "CHECKBOX") return value ? "Yes" : "No"
  if (fieldType === "MULTI_SELECT" && Array.isArray(value)) return value.join(", ")
  return String(value)
}
