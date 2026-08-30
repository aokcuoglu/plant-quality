"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PlusIcon, Trash2Icon, Building2Icon, UsersIcon, Factory } from "lucide-react"
import { addSupplier, removeSupplier } from "./actions"
import { Badge } from "@/components/ui/badge"
import { addSupplierAdminSchema } from "@/lib/validation"
import { FieldError } from "@/components/ui/field-error"

interface Supplier {
  id: string
  name: string
  plan: string
  taxNumber: string | null
  createdAt: Date
  primaryOem: { id: string; name: string } | null
  _count: { users: number }
}

interface OEM {
  id: string
  name: string
}

export function SupplierListClient({ suppliers: initialSuppliers, oems }: { suppliers: Supplier[]; oems: OEM[] }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  useEffect(() => {
    setSuppliers(initialSuppliers)
  }, [initialSuppliers])

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    setError(null)
    setFieldErrors({})

    const form = e.currentTarget
    const formData = new FormData(form)

    const clientParsed = addSupplierAdminSchema().safeParse({
      companyName: formData.get("companyName"),
      adminEmail: formData.get("adminEmail"),
      adminName: formData.get("adminName"),
      oemId: formData.get("oemId"),
      taxNumber: formData.get("taxNumber") || null,
      plan: (formData.get("plan") as string) || "FREE",
    })
    if (!clientParsed.success) {
      const next: Record<string, string> = {}
      for (const issue of clientParsed.error.issues) {
        const key = String(issue.path[0] ?? "_form")
        if (!next[key]) next[key] = issue.message
      }
      setFieldErrors(next)
      setError(clientParsed.error.issues[0]?.message ?? "Validation failed")
      setLoading(false)
      return
    }

    try {
      const res = await addSupplier(formData)
      if (res && "success" in res && res.success === false) {
        setError(res.error)
        if (res.fieldErrors) setFieldErrors(res.fieldErrors)
        return
      }
      setOpen(false)
      form.reset()
      setFieldErrors({})
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add supplier")
    } finally {
      setLoading(false)
    }
  }, [router])

  async function handleRemove(id: string) {
    if (!confirm("Are you sure you want to remove this supplier? This cannot be undone.")) return
    setError(null)
    try {
      await removeSupplier(id)
      setSuppliers((prev) => prev.filter((s) => s.id !== id))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove supplier")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2Icon className="size-4" />
          {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors">
            <PlusIcon className="size-3.5" />
            Add Supplier
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Supplier</DialogTitle>
              <DialogDescription>
                Create a supplier company, assign it to an OEM, and set up an admin user.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="oemId">Assign to OEM</Label>
                <select
                  name="oemId"
                  required
                  aria-invalid={!!fieldErrors.oemId}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select an OEM...</option>
                  {oems.map((oem) => (
                    <option key={oem.id} value={oem.id}>{oem.name}</option>
                  ))}
                </select>
                <FieldError message={fieldErrors.oemId} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" name="companyName" required placeholder="Acme Parts Inc." aria-invalid={!!fieldErrors.companyName} />
                <FieldError message={fieldErrors.companyName} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxNumber">Tax Number (optional)</Label>
                <Input id="taxNumber" name="taxNumber" placeholder="1234567890" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan">Plan</Label>
                <Select name="plan" defaultValue="FREE">
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE">Free</SelectItem>
                    <SelectItem value="BASIC">Basic</SelectItem>
                    <SelectItem value="PRO">Pro</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Admin User</p>

                <div className="space-y-2">
                  <Label htmlFor="adminName">Full Name</Label>
                  <Input id="adminName" name="adminName" required placeholder="John Smith" aria-invalid={!!fieldErrors.adminName} />
                  <FieldError message={fieldErrors.adminName} />
                </div>

                <div className="space-y-2 mt-3">
                  <Label htmlFor="adminEmail">Email</Label>
                  <Input id="adminEmail" name="adminEmail" type="email" required placeholder="john@acme.com" aria-invalid={!!fieldErrors.adminEmail} />
                  <FieldError message={fieldErrors.adminEmail} />
                </div>

                <p className="text-[11px] text-muted-foreground mt-2">
                  The admin will log in via magic link email.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Supplier"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {suppliers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2Icon className="size-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No suppliers registered yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Add Supplier" to onboard the first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Company</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">OEM</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Plan</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Users</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Created</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-foreground">
                    <Link href={`/admin/suppliers/${s.id}`} className="hover:text-foreground transition-colors">
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {s.primaryOem ? (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Factory className="size-3.5" />
                        <span>{s.primaryOem.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.plan === "ENTERPRISE" ? "default" : "secondary"} className="text-[10px]">
                      {s.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <UsersIcon className="size-3.5" />
                      <span className="text-sm">{s._count.users}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(s.id)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
