"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Minus,
  Trash2,
  ChevronDown,
  ChevronRight,
  UserCog,
  Building2,
  FolderTree,
  Pencil,
  Boxes,
  Users,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  createMudurluk,
  renameOrgUnit,
  deleteOrgUnit,
  assignUserToOrgUnit,
  addCompanyUserForOrg,
  removeOrgUser,
  updateOrgUserRole,
} from "./actions"
import { useTranslations } from "@/i18n/context"
import type { Translator } from "@/i18n/types"
import {
  composeCompanyEmail,
  emailSchema,
  EMAIL_LOCAL_PART_HTML_PATTERN,
} from "@/lib/validation"
import { FieldError } from "@/components/ui/field-error"
import { useDebouncedEmailFieldError } from "@/hooks/use-debounced-email-field-error"

export interface SerializedUser {
  id: string
  email: string
  name: string | null
  role: string
  plan: string
  modules: string[]
  orgUnitId: string | null
  createdAt: string
}

export interface FlatUnit {
  id: string
  name: string
  type: "DIRECTORATE" | "MUDURLUK"
  parentId: string | null
  users: SerializedUser[]
  children: FlatUnit[]
}

const ROLE_OPTIONS = ["ADMIN", "EDITOR", "VIEWER"] as const

function roleLabel(value: string, t: Translator) {
  if (value === "ADMIN" || value === "EDITOR" || value === "VIEWER") return t(`dashboard.company.organization.roles.${value}`)
  return value
}

interface UnitOption {
  id: string
  label: string
}

export function OrgUsersClient({
  directorates,
  unassignedUsers,
  emailDomain,
}: {
  directorates: FlatUnit[]
  unassignedUsers: SerializedUser[]
  emailDomain: string | null
}) {
  const router = useRouter()
  const t = useTranslations()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const s = new Set<string>()
    directorates.forEach((d) => {
      s.add(d.id)
      d.children.forEach((c) => s.add(c.id))
    })
    return s
  })

  const [addUserOpen, setAddUserOpen] = useState(false)
  const [addUserUnit, setAddUserUnit] = useState<string>("__none__")
  const [addUserUnitLocked, setAddUserUnitLocked] = useState(false)
  const [addEmailLocalPart, setAddEmailLocalPart] = useState("")
  const [addName, setAddName] = useState("")
  const [addRole, setAddRole] = useState("VIEWER")
  const [addFieldErrors, setAddFieldErrors] = useState<Record<string, string>>({})

  const [addMudurlukOpen, setAddMudurlukOpen] = useState<string | null>(null)
  const [addMudurlukName, setAddMudurlukName] = useState("")

  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null)
  const [renameName, setRenameName] = useState("")

  const emailValidationMessages = useMemo(
    () => ({
      invalid: t("validation.emailInvalid"),
      localPartInvalid: t("validation.emailLocalPartInvalid"),
      localPartTooManyDots: t("validation.emailLocalPartTooManyDots"),
      required: t("validation.required"),
    }),
    [t],
  )

  useDebouncedEmailFieldError({
    value: addEmailLocalPart,
    emailDomain,
    messages: emailValidationMessages,
    enabled: addUserOpen,
    setFieldErrors: setAddFieldErrors,
  })

  const unitOptions = flattenUnits(directorates)

  const totalUsers = directorates.reduce((acc, d) => acc + d.users.length + d.children.reduce((a, c) => a + c.users.length, 0), 0)
  const totalMudurluk = directorates.flatMap((d) => d.children).length

  const allUnitIds = useMemo(() => {
    const ids = new Set<string>()
    directorates.forEach((d) => {
      ids.add(d.id)
      d.children.forEach((c) => ids.add(c.id))
    })
    return ids
  }, [directorates])

  const someCollapsed = collapsed.size > 0

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setCollapsed(someCollapsed ? new Set() : new Set(allUnitIds))
  }

  function openRename(unit: FlatUnit) {
    setRenameTarget({ id: unit.id, name: unit.name })
    setRenameName(unit.name)
  }

  function handleAction(fn: () => Promise<{ success?: boolean; error?: string }>) {
    startTransition(async () => {
      setError(null)
      const res = await fn()
      if (res?.error) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  function handleAddMudurluk(directorateId: string) {
    const name = addMudurlukName.trim()
    if (!name) return
    handleAction(() => createMudurluk(directorateId, name))
    setAddMudurlukName("")
    setAddMudurlukOpen(null)
  }

  function handleRename() {
    if (!renameTarget) return
    const name = renameName.trim()
    if (!name) return
    handleAction(() => renameOrgUnit(renameTarget.id, name))
    setRenameTarget(null)
    setRenameName("")
  }

  function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    setAddFieldErrors({})
    setError(null)

    const messages = {
      ...emailValidationMessages,
      nameRequired: t("validation.nameRequired"),
    }

    const fieldErrors: Record<string, string> = {}
    if (!addName.trim()) fieldErrors.name = messages.nameRequired

    let email: string | null = null
    if (emailDomain) {
      const composed = composeCompanyEmail(addEmailLocalPart, emailDomain, messages)
      if (!composed.success) {
        Object.assign(fieldErrors, composed.fieldErrors)
      } else {
        email = composed.email
      }
    } else {
      const parsed = emailSchema(messages).safeParse(addEmailLocalPart)
      if (!parsed.success) {
        fieldErrors.email = parsed.error.issues[0]?.message ?? messages.invalid
      } else {
        email = parsed.data
      }
    }

    if (Object.keys(fieldErrors).length > 0 || !email) {
      setAddFieldErrors(fieldErrors)
      setError(Object.values(fieldErrors)[0] ?? messages.invalid)
      return
    }

    const fd = new FormData()
    fd.set("email", email)
    fd.set("name", addName.trim())
    fd.set("role", addRole)
    fd.set("modules", "[]")
    if (addUserUnit !== "__none__") fd.set("orgUnitId", addUserUnit)
    startTransition(async () => {
      setError(null)
      const res = await addCompanyUserForOrg(fd)
      if (res && "error" in res && res.error) {
        setError(res.error)
        if ("fieldErrors" in res && res.fieldErrors) setAddFieldErrors(res.fieldErrors)
        return
      }
      setAddUserOpen(false)
      setAddEmailLocalPart("")
      setAddName("")
      setAddRole("VIEWER")
      setAddUserUnit("__none__")
      setAddUserUnitLocked(false)
      setAddFieldErrors({})
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("dashboard.company.organization.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.company.organization.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={toggleAll} className="inline-flex items-center gap-1.5">
            {someCollapsed ? (
              <>
                <ChevronDown className="size-4" /> {t("dashboard.company.organization.expandAll")}
              </>
            ) : (
              <>
                <ChevronRight className="size-4" /> {t("dashboard.company.organization.collapseAll")}
              </>
            )}
          </Button>
          <Button
            onClick={() => {
              setAddUserUnit("__none__")
              setAddUserUnitLocked(false)
              setAddUserOpen(true)
            }}
            className="inline-flex items-center gap-1.5"
          >
            <Plus className="size-4" /> {t("dashboard.company.organization.addUser")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="border-border bg-foreground/5 px-2 py-1 text-[10px] font-medium text-muted-foreground">
          <Building2 className="size-3" /> {t("dashboard.company.organization.directorates", { count: directorates.length })}
        </Badge>
        <Badge variant="outline" className="border-border bg-foreground/5 px-2 py-1 text-[10px] font-medium text-muted-foreground">
          <FolderTree className="size-3" /> {t("dashboard.company.organization.departments", { count: totalMudurluk })}
        </Badge>
        <Badge variant="outline" className="border-border bg-foreground/5 px-2 py-1 text-[10px] font-medium text-muted-foreground">
          <Users className="size-3" /> {t("dashboard.company.organization.users", { count: totalUsers })}
        </Badge>
      </div>

      <div className="grid gap-6">
        {directorates.map((dir) => (
          <DirectorateCard
            key={dir.id}
            directorate={dir}
            expanded={!collapsed.has(dir.id)}
            onToggle={() => toggleCollapse(dir.id)}
            collapsed={collapsed}
            toggleCollapse={toggleCollapse}
            isPending={isPending}
            onAddMudurlukOpen={() => {
              setAddMudurlukOpen(dir.id)
              setAddMudurlukName("")
            }}
            addMudurlukOpen={addMudurlukOpen === dir.id}
            addMudurlukName={addMudurlukName}
            setAddMudurlukName={setAddMudurlukName}
            onAddMudurluk={() => handleAddMudurluk(dir.id)}
            onRename={() => openRename(dir)}
            onDelete={() => handleAction(() => deleteOrgUnit(dir.id))}
            onDeleteUnit={(unitId) => handleAction(() => deleteOrgUnit(unitId))}
            onRenameUnit={openRename}
            onAssign={(userId, unitId) => handleAction(() => assignUserToOrgUnit(userId, unitId))}
            onRemoveUser={(userId) => handleAction(() => removeOrgUser(userId))}
            onRoleChange={(userId, role) => handleAction(() => updateOrgUserRole(userId, role as never))}
            onAddUserToUnit={(unitId) => {
              setAddUserUnit(unitId)
              setAddUserUnitLocked(true)
              setAddUserOpen(true)
            }}
          />
        ))}
      </div>

      <UnassignedCard
        users={unassignedUsers}
        unitOptions={unitOptions}
        isPending={isPending}
        onAssign={(userId, unitId) => handleAction(() => assignUserToOrgUnit(userId, unitId))}
        onAddUser={() => {
          setAddUserUnit("__none__")
          setAddUserUnitLocked(false)
          setAddUserOpen(true)
        }}
      />

      <AddUserDialog
        open={addUserOpen}
        onOpenChange={(open) => {
          setAddUserOpen(open)
          if (!open) setAddFieldErrors({})
        }}
        unitOptions={unitOptions}
        unit={addUserUnit}
        setUnit={setAddUserUnit}
        unitLocked={addUserUnitLocked}
        emailDomain={emailDomain}
        emailLocalPart={addEmailLocalPart}
        setEmailLocalPart={setAddEmailLocalPart}
        name={addName}
        setName={(v) => {
          setAddName(v)
          setAddFieldErrors((prev) => {
            if (!prev.name) return prev
            const next = { ...prev }
            delete next.name
            return next
          })
        }}
        role={addRole}
        setRole={setAddRole}
        fieldErrors={addFieldErrors}
        isPending={isPending}
        onSubmit={handleAddUser}
      />

      <RenameDialog
        open={!!renameTarget}
        onOpenChange={(v) => !v && setRenameTarget(null)}
        name={renameName}
        setName={setRenameName}
        isPending={isPending}
        onSubmit={handleRename}
      />
    </div>
  )
}

function flattenUnits(directorates: FlatUnit[]): UnitOption[] {
  return directorates.flatMap((dir) =>
    dir.children.map((unit) => ({
      id: unit.id,
      label: `${dir.name} / ${unit.name}`,
    })),
  )
}

function DirectorateCard({
  directorate,
  expanded,
  onToggle,
  collapsed,
  toggleCollapse,
  isPending,
  onAddMudurlukOpen,
  addMudurlukOpen,
  addMudurlukName,
  setAddMudurlukName,
  onAddMudurluk,
  onRename,
  onDelete,
  onDeleteUnit,
  onRenameUnit,
  onAssign,
  onRemoveUser,
  onRoleChange,
  onAddUserToUnit,
}: {
  directorate: FlatUnit
  expanded: boolean
  onToggle: () => void
  collapsed: Set<string>
  toggleCollapse: (id: string) => void
  isPending: boolean
  onAddMudurlukOpen: () => void
  addMudurlukOpen: boolean
  addMudurlukName: string
  setAddMudurlukName: (v: string) => void
  onAddMudurluk: () => void
  onRename: () => void
  onDelete: () => void
  onDeleteUnit: (unitId: string) => void
  onRenameUnit: (unit: FlatUnit) => void
  onAssign: (userId: string, unitId: string | null) => void
  onRemoveUser: (userId: string) => void
  onRoleChange: (userId: string, role: string) => void
  onAddUserToUnit: (unitId: string) => void
}) {
  const t = useTranslations()
  const userCount = directorate.children.reduce((acc, c) => acc + c.users.length, 0) + directorate.users.length

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? t("dashboard.company.organization.collapse") : t("dashboard.company.organization.expand")}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted"
          >
            {expanded ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="flex flex-1 items-center gap-1.5 text-left"
          >
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Building2 className="size-4" />
            </span>
            <span className="font-heading text-base font-medium text-foreground">
              {directorate.name}
            </span>
          </button>
          <Badge variant="outline" className="border-border bg-foreground/5 text-[10px] font-medium text-muted-foreground">
            {t("dashboard.company.organization.userCount", { count: userCount })}
          </Badge>
          <CardAction onRename={onRename} onDelete={onDelete} isPending={isPending} />
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-3">
          <div className="space-y-3">
            {directorate.users.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-2">
                <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("dashboard.company.organization.directlyAssigned")}
                </p>
                <div className="divide-y">
                  {directorate.users.map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      isPending={isPending}
                      onRemove={() => onRemoveUser(u.id)}
                      onRoleChange={(role) => onRoleChange(u.id, role)}
                      onUnassign={() => onAssign(u.id, null)}
                    />
                  ))}
                </div>
              </div>
            )}

            {directorate.children.length === 0 ? (
              <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <FolderTree className="size-4 text-muted-foreground/50" />
                {t("dashboard.company.organization.noDepartments")}
              </p>
            ) : (
              directorate.children.map((unit) => (
                <MudurlukCard
                  key={unit.id}
                  unit={unit}
                  expanded={!collapsed.has(unit.id)}
                  onToggle={() => toggleCollapse(unit.id)}
                  isPending={isPending}
                  onRename={() => onRenameUnit(unit)}
                  onDelete={() => onDeleteUnit(unit.id)}
                  onRemoveUser={onRemoveUser}
                  onRoleChange={onRoleChange}
                  onAddUserToUnit={onAddUserToUnit}
                />
              ))
            )}

            {addMudurlukOpen ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  onAddMudurluk()
                }}
                className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-3"
              >
                <Input
                  autoFocus
                  value={addMudurlukName}
                  onChange={(e) => setAddMudurlukName(e.target.value)}
                  placeholder={t("dashboard.company.organization.departmentName")}
                  className="h-8 flex-1"
                  required
                />
                <Button type="submit" size="sm" disabled={isPending || !addMudurlukName.trim()}>
                  {t("common.add")}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={onAddMudurlukOpen}>
                  {t("common.cancel")}
                </Button>
              </form>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onAddMudurlukOpen}
                className="inline-flex items-center gap-1.5 text-muted-foreground"
              >
                <Plus className="size-3.5" /> {t("dashboard.company.organization.addDepartment")}
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

function CardAction({
  onRename,
  onDelete,
  isPending,
}: {
  onRename: () => void
  onDelete: () => void
  isPending: boolean
}) {
  const t = useTranslations()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <span className="sr-only">{t("common.actions")}</span>
        <span className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem onClick={onRename} disabled={isPending}>
          <Pencil />
          {t("dashboard.company.organization.rename")}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete} disabled={isPending}>
          <Trash2 />
          {t("common.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MudurlukCard({
  unit,
  expanded,
  onToggle,
  isPending,
  onRename,
  onDelete,
  onRemoveUser,
  onRoleChange,
  onAddUserToUnit,
}: {
  unit: FlatUnit
  expanded: boolean
  onToggle: () => void
  isPending: boolean
  onRename: () => void
  onDelete: () => void
  onRemoveUser: (userId: string) => void
  onRoleChange: (userId: string, role: string) => void
  onAddUserToUnit: (unitId: string) => void
}) {
  const t = useTranslations()
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? t("dashboard.company.organization.collapse") : t("dashboard.company.organization.expand")}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted"
          >
            {expanded ? <Minus className="size-3" /> : <Plus className="size-3" />}
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-1.5 text-left"
          >
            <span className="inline-flex size-6 items-center justify-center rounded bg-muted text-muted-foreground">
              <FolderTree className="size-3.5" />
            </span>
            <span className="text-sm font-medium text-foreground">{unit.name}</span>
            <Badge variant="outline" className="border-border bg-foreground/5 text-[9px] font-medium text-muted-foreground">
              {t("dashboard.company.organization.userCount", { count: unit.users.length })}
            </Badge>
          </button>
        </div>
        <div className="flex items-center gap-0.5">
          <Button size="xs" variant="ghost" onClick={() => onAddUserToUnit(unit.id)} className="text-muted-foreground">
            <Plus className="size-3" /> {t("dashboard.company.organization.addUser")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
              <Pencil />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem onClick={onRename} disabled={isPending}>
                <Pencil />
                {t("dashboard.company.organization.rename")}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onDelete} disabled={isPending}>
                <Trash2 />
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {expanded && (
        <div className="p-2">
          {unit.users.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              {t("dashboard.company.organization.noUsersInDepartment")}
            </p>
          ) : (
            <div className="divide-y">
              {unit.users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  isPending={isPending}
                  onRemove={() => onRemoveUser(u.id)}
                  onRoleChange={(role) => onRoleChange(u.id, role)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function UserRow({
  user,
  isPending,
  onRemove,
  onRoleChange,
  onUnassign,
}: {
  user: SerializedUser
  isPending: boolean
  onRemove: () => void
  onRoleChange: (role: string) => void
  onUnassign?: () => void
}) {
  const t = useTranslations()
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
          {(user.name ?? user.email).slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">{user.name ?? user.email}</div>
          <div className="truncate text-xs text-muted-foreground">{user.email}</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Select value={user.role} onValueChange={(v) => v && onRoleChange(v)} disabled={isPending || user.role === "ADMIN"}>
          <SelectTrigger size="sm" className="h-6 w-40 rounded-[min(var(--radius-md),10px)] px-2 text-xs">
            <SelectValue>{(v) => roleLabel(v, t)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((role) => (
              <SelectItem key={role} value={role}>
                {roleLabel(role, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {onUnassign && (
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={onUnassign}
            disabled={isPending}
            title={t("dashboard.company.organization.unassign")}
            className="text-muted-foreground hover:bg-muted"
          >
            <UserCog className="size-3" />
          </Button>
        )}
        {user.role === "ADMIN" ? (
          <span className="inline-flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
            <Boxes className="size-3" /> Admin
          </span>
        ) : (
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={onRemove}
            disabled={isPending}
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-3" />
          </Button>
        )}
      </div>
    </div>
  )
}

function UnassignedCard({
  users,
  unitOptions,
  isPending,
  onAssign,
  onAddUser,
}: {
  users: SerializedUser[]
  unitOptions: UnitOption[]
  isPending: boolean
  onAssign: (userId: string, unitId: string | null) => void
  onAddUser: () => void
}) {
  const t = useTranslations()
  const [selectedUnit, setSelectedUnit] = useState<string>("")

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
            <UserCog className="size-4" /> {t("dashboard.company.organization.unassignedUsers")}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onAddUser} className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Plus className="size-3.5" /> {t("dashboard.company.organization.addUser")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {users.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            {t("dashboard.company.organization.allAssigned")}
          </p>
        ) : (
          <div className="divide-y">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                    {(u.name ?? u.email).slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{u.name ?? u.email}</div>
                    <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Select
                    value={selectedUnit}
                    onValueChange={(v) => {
                      if (v) {
                        setSelectedUnit(v)
                        onAssign(u.id, v)
                      }
                    }}
                    disabled={isPending}
                  >
                    <SelectTrigger size="sm" className="h-7 w-56 text-xs text-muted-foreground">
                      <SelectValue placeholder={t("dashboard.company.organization.assignUnit")} />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => onAssign(u.id, selectedUnit)}
                    disabled={isPending || !selectedUnit}
                    className="text-brand"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AddUserDialog({
  open,
  onOpenChange,
  unitOptions,
  unit,
  setUnit,
  emailDomain,
  emailLocalPart,
  setEmailLocalPart,
  name,
  setName,
  role,
  setRole,
  unitLocked,
  fieldErrors,
  isPending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  unitOptions: UnitOption[]
  unit: string
  setUnit: (v: string) => void
  unitLocked?: boolean
  emailDomain: string | null
  emailLocalPart: string
  setEmailLocalPart: (v: string) => void
  name: string
  setName: (v: string) => void
  role: string
  setRole: (v: string) => void
  fieldErrors: Record<string, string>
  isPending: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  const t = useTranslations()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[28rem] max-w-[calc(100%-2rem)] sm:max-w-none">
        <DialogHeader>
          <DialogTitle>{t("dashboard.company.organization.addUser")}</DialogTitle>
          <DialogDescription>
            {t("dashboard.company.organization.addUserDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="min-w-0 space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">{t("dashboard.company.organization.fullName")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("dashboard.company.organization.fullNamePlaceholder")}
              aria-invalid={!!fieldErrors.name}
              required
            />
            <FieldError message={fieldErrors.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("dashboard.company.organization.email")}</Label>
            {emailDomain ? (
              <div
                className={`flex rounded-md border bg-background shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 ${
                  fieldErrors.email ? "border-destructive" : "border-input"
                }`}
              >
                <Input
                  id="email"
                  type="text"
                  inputMode="email"
                  autoComplete="username"
                  value={emailLocalPart}
                  onChange={(e) => {
                    const value = e.target.value
                    const suffix = `@${emailDomain}`
                    setEmailLocalPart(
                      value.endsWith(suffix)
                        ? value.slice(0, -suffix.length)
                        : value.split("@")[0] ?? "",
                    )
                  }}
                  className="border-0 shadow-none focus-visible:ring-0"
                  placeholder={t("dashboard.company.organization.emailLocalPlaceholder")}
                  pattern={EMAIL_LOCAL_PART_HTML_PATTERN}
                  aria-invalid={!!fieldErrors.email}
                  required
                />
                <span className="flex shrink-0 items-center border-l border-border px-3 text-sm text-muted-foreground">
                  @{emailDomain}
                </span>
              </div>
            ) : (
              <Input
                id="email"
                type="email"
                value={emailLocalPart}
                onChange={(e) => setEmailLocalPart(e.target.value)}
                placeholder={t("dashboard.company.organization.emailFullPlaceholder")}
                aria-invalid={!!fieldErrors.email}
                required
              />
            )}
            <FieldError message={fieldErrors.email} />
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.company.organization.role")}</Label>
            <Select value={role} onValueChange={(v) => v && setRole(v)}>
              <SelectTrigger className="w-full">
                <SelectValue>{(v) => roleLabel(v, t)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((roleOption) => (
                  <SelectItem key={roleOption} value={roleOption}>
                    {roleLabel(roleOption, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.company.organization.unit")}</Label>
            <Select value={unit} onValueChange={(v) => v && setUnit(v)} disabled={unitLocked}>
              <SelectTrigger className="min-w-0 w-full">
                <SelectValue className="min-w-0 truncate">
                  {(v) =>
                    v === "__none__"
                      ? t("dashboard.company.organization.noUnit")
                      : unitOptions.find((o) => o.id === v)?.label ?? t("dashboard.company.organization.selectUnit")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("dashboard.company.organization.noUnit")}</SelectItem>
                {unitOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("dashboard.company.organization.adding") : t("common.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RenameDialog({
  open,
  onOpenChange,
  name,
  setName,
  isPending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  name: string
  setName: (v: string) => void
  isPending: boolean
  onSubmit: () => void
}) {
  const t = useTranslations()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dashboard.company.organization.rename")}</DialogTitle>
          <DialogDescription>{t("dashboard.company.organization.renameDescription")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="rename">{t("dashboard.company.organization.unitName")}</Label>
            <Input id="rename" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("dashboard.company.organization.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
