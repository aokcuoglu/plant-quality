"use client"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, LoaderCircle, Pencil, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTranslations } from "@/i18n/context"
import { createVehicleGroup, createVehicleModel, updateVehicleGroup, updateVehicleModel } from "../flow-actions"

type Group = { id: string; name: string; code: string; description: string | null; models: { id: string; name: string; code: string; groupId: string }[] }
type EditState = { kind: "group" | "model"; id: string; name: string; description: string; groupId: string }

export function VehicleCatalogTable({ groups, canManage }: { groups: Group[]; canManage: boolean }) {
  const t = useTranslations()
  const router = useRouter()
  const [editing, setEditing] = useState<EditState | null>(null)
  const [adding, setAdding] = useState<"group" | "model" | null>(null)
  const [draft, setDraft] = useState({ name: "", description: "", groupId: groups[0]?.id ?? "" })
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const errorText = (error: string) => t(`logistic.dynamicFlow.errors.${error}` as "logistic.dynamicFlow.errors.UNKNOWN")

  function saveEdit() {
    if (!editing) return
    startTransition(async () => {
      const result = editing.kind === "group" ? await updateVehicleGroup(editing.id, editing.name, editing.description) : await updateVehicleModel(editing.id, editing.groupId, editing.name)
      if (!result.success) { setMessage(errorText(result.error)); return }
      setEditing(null); setMessage(t("logistic.dynamicFlow.saved")); router.refresh()
    })
  }

  function addRecord() {
    if (!adding) return
    const data = new FormData(); data.set("name", draft.name)
    if (adding === "group") data.set("description", draft.description); else data.set("groupId", draft.groupId)
    startTransition(async () => {
      const result = adding === "group" ? await createVehicleGroup({ status: "idle" }, data) : await createVehicleModel({ status: "idle" }, data)
      if (result.status === "error") { setMessage(errorText(result.error ?? "UNKNOWN")); return }
      setAdding(null); setDraft({ name: "", description: "", groupId: groups[0]?.id ?? "" }); setMessage(t("logistic.dynamicFlow.saved")); router.refresh()
    })
  }

  return <div className="overflow-hidden rounded-lg border border-border bg-card">
    <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="text-sm font-semibold text-foreground">{t("logistic.dynamicFlow.catalogTableTitle")}</h2><p className="text-xs text-muted-foreground">{t("logistic.dynamicFlow.catalogTableDescription")}</p></div>
      {canManage && <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => { setAdding("group"); setMessage(null) }}><Plus />{t("logistic.dynamicFlow.addGroup")}</Button><Button size="sm" onClick={() => { setAdding("model"); setMessage(null) }} disabled={!groups.length}><Plus />{t("logistic.dynamicFlow.addModel")}</Button></div>}
    </div>
    {adding && canManage && <div className="grid gap-2 border-b border-border bg-muted/30 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder={t("logistic.dynamicFlow.name")} aria-label={t("logistic.dynamicFlow.name")} />
      {adding === "group" ? <Input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder={t("logistic.dynamicFlow.description")} aria-label={t("logistic.dynamicFlow.description")} /> : <NativeSelect value={draft.groupId} onChange={(event) => setDraft({ ...draft, groupId: event.target.value })} aria-label={t("logistic.dynamicFlow.group")}><NativeSelectOption value="">{t("logistic.dynamicFlow.selectGroup")}</NativeSelectOption>{groups.map((group) => <NativeSelectOption key={group.id} value={group.id}>{group.name}</NativeSelectOption>)}</NativeSelect>}
      <div className="flex gap-2 sm:col-start-4"><Button size="sm" onClick={addRecord} disabled={isPending || !draft.name.trim()}>{isPending ? <LoaderCircle className="animate-spin" /> : <Check />}{t("common.save")}</Button><Button variant="ghost" size="icon-sm" onClick={() => setAdding(null)} aria-label={t("common.cancel")}><X /></Button></div>
    </div>}
    {message && <p className="border-b border-border px-4 py-2 text-sm text-emerald-400" role="status">{message}</p>}
    <div className="overflow-x-auto"><Table className="w-full min-w-[720px] text-sm"><TableHeader className="border-b border-border bg-muted/40"><TableRow><TableHead className="w-28 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("logistic.dynamicFlow.type")}</TableHead><TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("logistic.dynamicFlow.name")}</TableHead><TableHead className="w-44 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("logistic.dynamicFlow.group")}</TableHead><TableHead className="w-40 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("logistic.dynamicFlow.code")}</TableHead><TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("logistic.dynamicFlow.description")}</TableHead>{canManage && <TableHead className="w-24 px-4 py-3" />}</TableRow></TableHeader><TableBody>
      {groups.flatMap((group) => [<TableRow key={group.id} className="border-b border-border bg-muted/20"><TableCell className="px-4 py-3"><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">{t("logistic.dynamicFlow.group")}</span></TableCell><TableCell className="px-4 py-2">{editing?.id === group.id ? <Input autoFocus value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /> : <span className="font-medium text-foreground">{group.name}</span>}</TableCell><TableCell className="px-4 py-3 text-muted-foreground">—</TableCell><TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">{group.code}</TableCell><TableCell className="px-4 py-2">{editing?.id === group.id ? <Input value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} placeholder={t("logistic.dynamicFlow.description")} /> : <span className="text-muted-foreground">{group.description || "—"}</span>}</TableCell>{canManage && <TableCell className="px-4 py-2 text-right">{editing?.id === group.id ? <Button size="icon-sm" onClick={saveEdit} disabled={isPending} aria-label={t("common.save")}><Check /></Button> : <Button variant="ghost" size="icon-sm" onClick={() => setEditing({ kind: "group", id: group.id, name: group.name, description: group.description ?? "", groupId: group.id })} aria-label={t("common.edit")}><Pencil /></Button>}</TableCell>}</TableRow>, ...group.models.map((model) => <TableRow key={model.id} className="border-b border-border last:border-0"><TableCell className="px-4 py-3 pl-8 text-xs text-muted-foreground">{t("logistic.dynamicFlow.model")}</TableCell><TableCell className="px-4 py-2">{editing?.id === model.id ? <Input autoFocus value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /> : <span className="text-foreground">{model.name}</span>}</TableCell><TableCell className="px-4 py-2">{editing?.id === model.id ? <NativeSelect value={editing.groupId} onChange={(event) => setEditing({ ...editing, groupId: event.target.value })} className="w-full">{groups.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.name}</NativeSelectOption>)}</NativeSelect> : <span className="text-muted-foreground">{group.name}</span>}</TableCell><TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">{model.code}</TableCell><TableCell className="px-4 py-3 text-muted-foreground">—</TableCell>{canManage && <TableCell className="px-4 py-2 text-right">{editing?.id === model.id ? <Button size="icon-sm" onClick={saveEdit} disabled={isPending} aria-label={t("common.save")}><Check /></Button> : <Button variant="ghost" size="icon-sm" onClick={() => setEditing({ kind: "model", id: model.id, name: model.name, description: "", groupId: model.groupId })} aria-label={t("common.edit")}><Pencil /></Button>}</TableCell>}</TableRow>)] )}
    </TableBody></Table></div>
    {!groups.length && <div className="p-10 text-center text-sm text-muted-foreground">{t("logistic.dynamicFlow.noGroups")}</div>}
  </div>
}
