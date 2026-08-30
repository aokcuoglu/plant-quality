"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, UserCog, ShieldCheck, Boxes, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { addCompanyUser, updateUserRole, updateUserModules, removeUser } from "./actions"
import { useTranslations } from "@/i18n/context"
import {
  composeCompanyEmail,
  emailSchema,
  EMAIL_LOCAL_PART_HTML_PATTERN,
} from "@/lib/validation"
import { FieldError } from "@/components/ui/field-error"
import { useDebouncedEmailFieldError } from "@/hooks/use-debounced-email-field-error"

interface ManageableUser {
  id: string
  email: string
  name: string | null
  role: string
  plan: string
  modules: string[]
  createdAt: string
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "EDITOR", label: "Editör" },
  { value: "VIEWER", label: "Görüntüleyici" },
]

const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN: "Tüm sistemlere erişim, plan & kullanıcı yönetimi",
  EDITOR: "Düzenleme / edit yetkisi",
  VIEWER: "Salt okunur erişim",
}

const MODULE_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: "PLANT_QUALITY_MODULE", label: "PlantQuality", hint: "Kalite / 8D yönetimi" },
  { value: "PLANT_LOGISTIC_MODULE", label: "PlantLogistic", hint: "Araç siparişi & teslimat" },
]

export function UsersClient({
  initialUsers,
  companyModules,
  emailDomain,
}: {
  initialUsers: ManageableUser[]
  companyModules: string[]
  emailDomain: string | null
}) {
  const router = useRouter()
  const t = useTranslations()
  const [isPending, startTransition] = useTransition()
  const users = initialUsers
  const availableModules = MODULE_OPTIONS.filter((m) => companyModules.includes(m.value))
  const [error, setError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addEmailLocalPart, setAddEmailLocalPart] = useState("")
  const [addName, setAddName] = useState("")
  const [addRole, setAddRole] = useState("VIEWER")
  const [addModules, setAddModules] = useState<string[]>(availableModules.length > 0 ? [availableModules[0].value] : [])
  const [addFieldErrors, setAddFieldErrors] = useState<Record<string, string>>({})
  const [editingModules, setEditingModules] = useState<string | null>(null)
  const [editModules, setEditModules] = useState<string[]>([])

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
    enabled: addOpen,
    setFieldErrors: setAddFieldErrors,
  })

  function run(fn: () => Promise<{ success?: boolean; error?: string }>, keepOpen?: boolean) {
    startTransition(async () => {
      setError(null)
      const res = await fn()
      if (res?.error) {
        setError(res.error)
        return
      }
      if (!keepOpen) {
        setAddOpen(false)
        setAddEmailLocalPart("")
        setAddName("")
        setAddModules(availableModules.length > 0 ? [availableModules[0].value] : [])
      }
      router.refresh()
    })
  }

  function toggleModule(list: string[], m: string): string[] {
    return list.includes(m) ? list.filter((x) => x !== m) : [...list, m]
  }

  function handleAdd(e: React.FormEvent) {
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
    fd.set("modules", JSON.stringify(addModules))
    startTransition(async () => {
      setError(null)
      const res = await addCompanyUser(fd)
      if (res && "error" in res && res.error) {
        setError(res.error)
        if ("fieldErrors" in res && res.fieldErrors) setAddFieldErrors(res.fieldErrors)
        return
      }
      setAddOpen(false)
      setAddEmailLocalPart("")
      setAddName("")
      setAddModules(availableModules.length > 0 ? [availableModules[0].value] : [])
      setAddFieldErrors({})
      router.refresh()
    })
  }

  function saveModules(userId: string) {
    run(() => updateUserModules(userId, editModules))
    setEditingModules(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Kullanıcı Yönetimi</h1>
          <p className="text-sm text-muted-foreground">
            Şirketinizdeki kullanıcıları ve fabrika rollerini yönetin.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-1.5">
          <Plus className="size-4" /> Kullanıcı Ekle
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
            <UserCog className="size-4" /> Kullanıcılar
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Toplam {users.length} kullanıcı
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 text-left">Kullanıcı</th>
                    <th className="px-4 py-3 text-left">Rol</th>
                    <th className="px-4 py-3 text-left">Modüller</th>
                    <th className="px-4 py-3 text-left">Ekleme</th>
                    <th className="px-4 py-3 text-left">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-foreground">{u.name ?? u.email}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={u.role}
                          onValueChange={(v) => run(() => updateUserRole(u.id, v as never))}
                          disabled={isPending || u.role === "ADMIN"}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue>
                              {(v) => ROLE_OPTIONS.find((o) => o.value === v)?.label ?? (v as string)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {ROLE_DESCRIPTIONS[u.role] ?? u.role}
                      </td>
                      <td className="px-4 py-3">
                        {u.role === "ADMIN" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <ShieldCheck className="size-3" /> Tümü (Admin)
                          </span>
                        ) : editingModules === u.id ? (
                          <div className="flex items-center gap-2">
                            {availableModules.map((m) => (
                              <label key={m.value} className="flex items-center gap-1.5 text-xs">
                                <Checkbox
                                  checked={editModules.includes(m.value)}
                                  onCheckedChange={() => setEditModules((prev) => toggleModule(prev, m.value))}
                                />
                                {m.label}
                              </label>
                            ))}
                            <Button
                              size="sm"
                              onClick={() => saveModules(u.id)}
                              disabled={isPending}
                              className="inline-flex h-6 items-center gap-1 rounded px-2 text-[10px]"
                            >
                              <Check className="size-3" /> Kaydet
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingModules(null)}
                              disabled={isPending}
                              className="inline-flex h-6 items-center gap-1 rounded px-2 text-[10px]"
                            >
                              Vazgeç
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1">
                            {u.modules.length === 0 ? (
                              <Badge variant="outline" className="border border-border bg-foreground/5 px-1.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                                Role bağlı
                              </Badge>
                            ) : (
                              u.modules.map((m) => (
                                <Badge
                                  key={m}
                                  variant="outline"
                                  className="inline-flex items-center gap-1 border border-border bg-foreground/5 px-1.5 text-[9px] font-medium uppercase tracking-wider text-foreground"
                                >
                                  <Boxes className="size-2.5" />
                                  {MODULE_OPTIONS.find((o) => o.value === m)?.label ?? m}
                                </Badge>
                              ))
                            )}
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setEditingModules(u.id)
                            setEditModules(u.modules)
                          }}
                          disabled={isPending || u.role === "ADMIN"}
                          className="mt-1 text-[10px] font-medium text-foreground hover:underline disabled:opacity-50"
                        >
                          Modül erişimini düzenle
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {u.role === "ADMIN" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <ShieldCheck className="size-3" /> Admin
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => run(() => removeUser(u.id))}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5" /> Sil
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) setAddFieldErrors({})
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcı Ekle</DialogTitle>
            <DialogDescription>
              Şirketinize yeni bir kullanıcı ve fabrika rolü atayın.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="name">Ad Soyad</Label>
              <Input
                id="name"
                value={addName}
                onChange={(e) => {
                  setAddName(e.target.value)
                  setAddFieldErrors((prev) => {
                    if (!prev.name) return prev
                    const next = { ...prev }
                    delete next.name
                    return next
                  })
                }}
                placeholder="örn. Ahmet Yılmaz"
                aria-invalid={!!addFieldErrors.name}
                required
              />
              <FieldError message={addFieldErrors.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              {emailDomain ? (
                <div
                  className={`flex rounded-md border bg-background shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 ${
                    addFieldErrors.email ? "border-destructive" : "border-input"
                  }`}
                >
                  <Input
                    id="email"
                    type="text"
                    inputMode="email"
                    autoComplete="username"
                    value={addEmailLocalPart}
                    onChange={(e) => {
                      const value = e.target.value
                      const suffix = `@${emailDomain}`
                      setAddEmailLocalPart(
                        value.endsWith(suffix)
                          ? value.slice(0, -suffix.length)
                          : value.split("@")[0] ?? "",
                      )
                    }}
                    className="border-0 shadow-none focus-visible:ring-0"
                    placeholder="ad.soyad"
                    pattern={EMAIL_LOCAL_PART_HTML_PATTERN}
                    aria-invalid={!!addFieldErrors.email}
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
                  value={addEmailLocalPart}
                  onChange={(e) => setAddEmailLocalPart(e.target.value)}
                  placeholder="name@company.com"
                  aria-invalid={!!addFieldErrors.email}
                  required
                />
              )}
              <FieldError message={addFieldErrors.email} />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={addRole} onValueChange={(v) => setAddRole(v ?? "")}>
                <SelectTrigger>
                  <SelectValue>
                    {(v) => ROLE_OPTIONS.find((o) => o.value === v)?.label ?? (v as string)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              {ROLE_DESCRIPTIONS[addRole]}
            </div>
            <div className="space-y-2">
              <Label>Modül Erişimi</Label>
              <div className="grid gap-2">
                {availableModules.map((m) => (
                  <label
                    key={m.value}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={addModules.includes(m.value)}
                      onCheckedChange={() => setAddModules((prev) => toggleModule(prev, m.value))}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Boxes className="size-3.5 text-foreground" /> {m.label}
                      </div>
                      <div className="text-xs text-muted-foreground">{m.hint}</div>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Boş bırakılırsa rolün varsayılan erişimi uygulanır (fabrika rolleri = yalnızca PlantLogistic).
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={isPending}>
                Vazgeç
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Ekleniyor..." : "Ekle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
