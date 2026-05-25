"use client"

import { useState, useEffect, useCallback } from "react"
import { CUSTOM_FIELD_ENTITIES, ENTITY_LABELS, ENTITY_DESCRIPTIONS, FIELD_TYPE_LABELS, type CustomFieldEntity, type CustomFieldType } from "@/lib/custom-fields/constants"
import { INDUSTRY_TEMPLATES } from "@/lib/custom-fields/templates"
import type { ResolvedFields } from "@/lib/custom-fields/resolver"
import type { ResolvedField, SelectOption, CreateCustomFieldInput, IndustryTemplate } from "@/lib/custom-fields/types"
import { getFieldConfig, createCustomField, updateCustomField, deleteCustomField } from "./actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2, Settings, Eye, EyeOff, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"

type SectionGroup = { name: string; fields: ResolvedField[] }

function groupBySection(fields: ResolvedField[]): SectionGroup[] {
  const map = new Map<string, ResolvedField[]>()
  for (const f of fields) {
    const key = f.section ?? "default"
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(f)
  }
  return Array.from(map.entries()).map(([name, fields]) => ({ name: name === "default" ? "General" : name, fields }))
}

const sectionLabels: Record<string, string> = {
  general: "General",
  vehicle: "Vehicle Information",
  customer: "Customer Information",
  part: "Part & Supplier",
  classification: "Classification",
  details: "Details",
  timeline: "Timeline",
  default: "General",
}

function sectionLabel(name: string): string {
  return sectionLabels[name] ?? name.charAt(0).toUpperCase() + name.slice(1)
}

export function FieldConfigPageClient({ companyId }: { companyId: string }) {
  const [selectedEntity, setSelectedEntity] = useState<CustomFieldEntity>("FIELD_DEFECT")
  const [resolved, setResolved] = useState<ResolvedFields | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<ResolvedField | null>(null)
  const [editVisible, setEditVisible] = useState(true)
  const [editRequired, setEditRequired] = useState(false)
  const [editLabel, setEditLabel] = useState("")
  const [editPlaceholder, setEditPlaceholder] = useState("")
  const [editOptions, setEditOptions] = useState<SelectOption[]>([])

  const loadConfig = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await getFieldConfig(selectedEntity)
    if (result.error) {
      setError(result.error)
      setResolved(null)
    } else {
      setResolved(result.resolved)
    }
    setLoading(false)
  }, [selectedEntity])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 3000)
  }

  const handleToggleVisible = async (field: ResolvedField) => {
    if (!field.isBuiltIn && !field.id) return
    const id = field.isBuiltIn ? await getOrCreateOverride(field) : field.id
    if (!id) return
    await updateCustomField(id, { visible: !field.visible })
    showMessage(`"${field.label}" ${!field.visible ? "shown" : "hidden"}`)
    loadConfig()
  }

  const handleToggleRequired = async (field: ResolvedField) => {
    if (!field.id) return
    await updateCustomField(field.id, { required: !field.required })
    showMessage(`"${field.label}" ${field.required ? "optional" : "required"}`)
    loadConfig()
  }

  const getOrCreateOverride = async (field: ResolvedField): Promise<string | null> => {
    const existing = resolved?.all.find(
      (f) => f.isBuiltIn && f.fieldName === field.fieldName && f.label !== field.label
    )

    try {
      const overrideField: CreateCustomFieldInput = {
        entity: selectedEntity,
        fieldName: field.fieldName,
        label: field.label,
        fieldType: field.fieldType,
        section: field.section,
        required: field.required,
        placeholder: field.placeholder,
        options: field.options,
        visibleInList: field.visibleInList,
        order: field.order,
      }
      const result = await createCustomField(overrideField)
      return null
    } catch {
      return null
    }
  }

  const openEditDialog = (field: ResolvedField) => {
    setEditingField(field)
    setEditVisible(field.visible)
    setEditRequired(field.required)
    setEditLabel(field.label)
    setEditPlaceholder(field.placeholder ?? "")
    setEditOptions(field.options ?? [])
  }

  const handleSaveEdit = async () => {
    if (!editingField) return
    if (editingField.isBuiltIn && !editingField.id) {
      const overrideField: CreateCustomFieldInput = {
        entity: selectedEntity,
        fieldName: editingField.fieldName,
        label: editLabel || editingField.label,
        fieldType: editingField.fieldType,
        section: editingField.section,
        required: editRequired,
        placeholder: editPlaceholder || null,
        options: editOptions.length > 0 ? editOptions : null,
        visibleInList: editingField.visibleInList,
        order: editingField.order,
      }
      await updateCreateOverrideSafe(overrideField, {
        visible: editVisible,
        required: editRequired,
        label: editLabel || null,
        placeholder: editPlaceholder || null,
        options: editOptions.length > 0 ? editOptions : null,
      })
    } else if (editingField.id) {
      await updateCustomField(editingField.id, {
        label: editLabel || null,
        placeholder: editPlaceholder || null,
        required: editRequired,
        visible: editVisible,
        options: editOptions.length > 0 ? editOptions : null,
      })
    }
    setEditingField(null)
    showMessage(`"${editLabel || editingField.label}" updated`)
    loadConfig()
  }

  const updateCreateOverrideSafe = async (
    create: CreateCustomFieldInput,
    update: { visible: boolean; required: boolean; label: string | null; placeholder: string | null; options: SelectOption[] | null }
  ) => {
    try {
      const createResult = await createCustomField(create)
      if (createResult.success) {
        loadConfig()
        return
      }
    } catch {
      // field already exists, just update
    }

    const result = await getFieldConfig(selectedEntity)
    if (result.resolved) {
      const field = result.resolved.all.find(
        (f) => f.fieldName === create.fieldName && f.section === create.section
      )
      if (field?.id) {
        await updateCustomField(field.id, update)
      }
    }
  }

  const handleDelete = async (field: ResolvedField) => {
    if (!field.id || field.isBuiltIn) return
    if (!confirm(`Delete "${field.label}" custom field? This will deactivate it. Existing data will be preserved.`)) return
    await deleteCustomField(field.id)
    showMessage(`"${field.label}" deleted`)
    loadConfig()
  }

  const handleAddOption = () => {
    setEditOptions([...editOptions, { label: "", value: "" }])
  }

  const handleRemoveOption = (index: number) => {
    setEditOptions(editOptions.filter((_, i) => i !== index))
  }

  const handleUpdateOption = (index: number, key: "label" | "value", val: string) => {
    setEditOptions(editOptions.map((opt, i) => (i === index ? { ...opt, [key]: val } : opt)))
  }

  const handleAddCustomField = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const input: CreateCustomFieldInput = {
      entity: selectedEntity,
      fieldName: formData.get("fieldName") as string,
      label: (formData.get("label") as string) || null,
      fieldType: (formData.get("fieldType") as CustomFieldType) || "TEXT",
      section: (formData.get("section") as string) || null,
      required: formData.get("required") === "on",
      placeholder: (formData.get("placeholder") as string) || null,
      options: null,
      visibleInList: formData.get("visibleInList") === "on",
    }
    const result = await createCustomField(input)
    if (result.error) {
      alert(result.error)
      return
    }
    setAddDialogOpen(false)
    showMessage(`Custom field "${input.label}" created`)
    form.reset()
    loadConfig()
  }

  const handleApplyTemplate = async (template: IndustryTemplate) => {
    const entityConfig = template.configs[selectedEntity]
    if (!entityConfig) {
      alert(`Template "${template.name}" has no configuration for ${ENTITY_LABELS[selectedEntity]}`)
      return
    }

    for (const override of entityConfig.builtInOverrides) {
      const existing = resolved?.all.find((f) => f.fieldName === override.fieldName)
      if (!existing) continue

      if (existing.id) {
        const update: Record<string, unknown> = {}
        if (override.visible !== undefined) update.visible = override.visible
        if (override.required !== undefined) update.required = override.required
        if (override.label !== undefined) update.label = override.label
        if (override.options !== undefined) update.options = override.options
        await updateCustomField(existing.id, update)
      } else {
        await updateCreateOverrideSafe({
          entity: selectedEntity,
          fieldName: existing.fieldName,
          label: override.label ?? existing.label,
          fieldType: existing.fieldType,
          section: existing.section,
          required: override.required ?? existing.required,
          placeholder: existing.placeholder,
          options: override.options ?? existing.options,
          visibleInList: existing.visibleInList,
          order: existing.order,
        }, {
          visible: override.visible ?? true,
          required: override.required ?? existing.required,
          label: override.label ?? null,
          placeholder: null,
          options: null,
        })
      }
    }

    for (const customField of entityConfig.customFields) {
      const existing = resolved?.all.find(
        (f) => f.fieldName === customField.fieldName
      )
      if (!existing) {
        await createCustomField(customField)
      }
    }

    setTemplateDialogOpen(false)
    showMessage(`Template "${template.name}" applied to ${ENTITY_LABELS[selectedEntity]}`)
    loadConfig()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Field Configuration</h1>
        </div>
        <div className="h-64 rounded-lg border bg-card animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold tracking-tight">Field Configuration</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const sections = resolved ? groupBySection(resolved.all) : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Field Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure form fields for your company. Changes apply to all users.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTemplateDialogOpen(true)}
          >
            <Upload className="mr-1.5 size-3.5" />
            Apply Template
          </Button>
          <Button
            size="sm"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="mr-1.5 size-3.5" />
            Add Custom Field
          </Button>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-500">
          {message}
        </div>
      )}

      <div className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-card p-1">
        {CUSTOM_FIELD_ENTITIES.map((entity) => (
          <button
            key={entity}
            onClick={() => setSelectedEntity(entity)}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              selectedEntity === entity
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {ENTITY_LABELS[entity]}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{ENTITY_LABELS[selectedEntity]}</CardTitle>
          <CardDescription>{ENTITY_DESCRIPTIONS[selectedEntity]}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {sections.map((section) => (
            <div key={section.name} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{sectionLabel(section.name)}</h3>
                <Separator className="flex-1" />
              </div>
              <div className="rounded-lg border">
                {section.fields.map((field) => (
                  <div
                    key={field.fieldName}
                    className={cn(
                      "flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0 transition-colors hover:bg-muted/50",
                      !field.visible && "opacity-50"
                    )}
                  >
                    <GripVertical className="size-4 shrink-0 text-muted-foreground/40 cursor-grab" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{field.label}</span>
                        {!field.isBuiltIn && (
                          <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 h-4">CUSTOM</Badge>
                        )}
                        {field.isBuiltIn && (
                          <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0 h-4">BUILT-IN</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">{FIELD_TYPE_LABELS[field.fieldType]}</span>
                        {field.required && (
                          <span className="text-[11px] text-destructive">Required</span>
                        )}
                        {!field.visible && (
                          <span className="text-[11px] text-muted-foreground">Hidden</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleVisible(field)}
                        className={cn(
                          "rounded p-1 transition-colors hover:bg-accent",
                          field.visible ? "text-muted-foreground" : "text-muted-foreground/40"
                        )}
                        title={field.visible ? "Hide" : "Show"}
                      >
                        {field.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                      </button>

                      <button
                        onClick={() => handleToggleRequired(field)}
                        className="rounded px-1.5 py-0.5 text-xs transition-colors hover:bg-accent text-muted-foreground"
                        title={field.required ? "Make optional" : "Make required"}
                      >
                        {field.required ? "Req*" : "Opt"}
                      </button>

                      <button
                        onClick={() => openEditDialog(field)}
                        className="rounded p-1 transition-colors hover:bg-accent text-muted-foreground"
                        title="Edit field"
                      >
                        <Settings className="size-3.5" />
                      </button>

                      {!field.isBuiltIn && (
                        <button
                          onClick={() => handleDelete(field)}
                          className="rounded p-1 transition-colors hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                          title="Delete field"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Add Custom Field Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Field</DialogTitle>
            <DialogDescription>
              Add a new field to the {ENTITY_LABELS[selectedEntity]} form.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCustomField} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fieldName">Field Name (machine name) *</Label>
              <Input id="fieldName" name="fieldName" required placeholder="e.g. batch_code" className="font-mono text-sm" />
              <p className="text-[11px] text-muted-foreground">Letters, numbers, and underscores only. Cannot be changed later.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="label">Display Label *</Label>
              <Input id="label" name="label" required placeholder="e.g. Batch Code" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fieldType">Field Type</Label>
              <Select name="fieldType" defaultValue="TEXT">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="section">Section</Label>
              <Select name="section">
                <SelectTrigger>
                  <SelectValue placeholder="Select section..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(sectionLabels).filter(([k]) => k !== "default").map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="placeholder">Placeholder</Label>
              <Input id="placeholder" name="placeholder" placeholder="e.g. Enter batch code..." />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="required" className="rounded border-input" />
                <span className="text-sm">Required</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="visibleInList" className="rounded border-input" />
                <span className="text-sm">Show in list view</span>
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Create Field</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Field Dialog */}
      <Dialog open={!!editingField} onOpenChange={() => setEditingField(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Field</DialogTitle>
            <DialogDescription>
              Configure "{editingField?.label}" {editingField?.isBuiltIn ? "(Built-in)" : "(Custom)"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Display Label</Label>
              <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Placeholder</Label>
              <Input value={editPlaceholder} onChange={(e) => setEditPlaceholder(e.target.value)} />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editVisible} onChange={(e) => setEditVisible(e.target.checked)} className="rounded border-input" />
                <span className="text-sm">Visible</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editRequired} onChange={(e) => setEditRequired(e.target.checked)} className="rounded border-input" />
                <span className="text-sm">Required</span>
              </label>
            </div>

            {(editingField?.fieldType === "SELECT" || editingField?.fieldType === "MULTI_SELECT") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Options</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={handleAddOption}>
                    <Plus className="size-3 mr-1" />
                    Add Option
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {editOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        placeholder="Label"
                        value={opt.label}
                        onChange={(e) => handleUpdateOption(i, "label", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Value"
                        value={opt.value}
                        onChange={(e) => handleUpdateOption(i, "value", e.target.value)}
                        className="flex-1 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(i)}
                        className="shrink-0 p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingField(null)}>Cancel</Button>
              <Button type="button" onClick={handleSaveEdit}>Save Changes</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply Industry Template</DialogTitle>
            <DialogDescription>
              Quickly configure fields for {ENTITY_LABELS[selectedEntity]}. You can modify any settings after applying.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {INDUSTRY_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleApplyTemplate(template)}
                className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-accent hover:border-ring flex items-start gap-3"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{template.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
                  {template.configs[selectedEntity] && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {template.configs[selectedEntity].builtInOverrides.length} overrides
                      </Badge>
                      {template.configs[selectedEntity].customFields.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {template.configs[selectedEntity].customFields.length} custom fields
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTemplateDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
