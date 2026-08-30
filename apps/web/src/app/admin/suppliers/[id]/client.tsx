"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlusIcon, Trash2Icon, UsersIcon, ArrowLeftIcon, Factory } from "lucide-react"
import { addSupplierUser, removeSupplierUser, updateSupplierPlan } from "../actions"
import { Badge } from "@/components/ui/badge"
import { addSupplierUserSchema } from "@/lib/validation"
import { FieldError } from "@/components/ui/field-error"

interface Supplier {
  id: string
  name: string
  plan: string
  taxNumber: string | null
  createdAt: Date
  primaryOem: { id: string; name: string } | null
  users: { id: string; email: string; name: string | null; role: string; createdAt: Date }[]
}

export function SupplierDetailClient({ supplier: initial }: { supplier: Supplier }) {
  const [supplier, setSupplier] = useState(initial)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  useEffect(() => {
    setSupplier(initial)
  }, [initial])

  const handleAddUserSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const form = e.currentTarget
    const formData = new FormData(form)
    formData.append("companyId", supplier.id)
    setLoading(true)
    setError(null)
    setFieldErrors({})

    const clientParsed = addSupplierUserSchema().safeParse({
      companyId: supplier.id,
      email: formData.get("email"),
      name: formData.get("name"),
      role: (formData.get("role") as string) || "VIEWER",
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
      const res = await addSupplierUser(formData)
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
      setError(err instanceof Error ? err.message : "Failed to add user")
    } finally {
      setLoading(false)
    }
  }, [supplier.id, router])

  async function handleRemoveUser(userId: string, userName: string | null) {
    if (!confirm(`Remove "${userName || "this user"}" from ${supplier.name}?`)) return
    setError(null)
    try {
      await removeSupplierUser(userId, supplier.id)
      setSupplier((prev) => ({
        ...prev,
        users: prev.users.filter((u) => u.id !== userId),
      }))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove user")
    }
  }

  async function handlePlanChange(plan: string | null) {
    if (!plan) return
    setError(null)
    try {
      await updateSupplierPlan(supplier.id, plan)
      setSupplier((prev) => ({ ...prev, plan }))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update plan")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/suppliers">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeftIcon className="size-3.5" />
            Back to Suppliers
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={supplier.plan} onValueChange={handlePlanChange}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FREE">Free</SelectItem>
                <SelectItem value="BASIC">Basic</SelectItem>
                <SelectItem value="PRO">Pro</SelectItem>
                <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {supplier.primaryOem && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">OEM</CardTitle>
              <Factory className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-foreground">{supplier.primaryOem.name}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <UsersIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{supplier.users.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Users</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors">
            <PlusIcon className="size-3.5" />
            Add User
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add User to {supplier.name}</DialogTitle>
              <DialogDescription>
                Create a new user account for this supplier. They will be able to log in via magic link.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddUserSubmit} className="space-y-4" noValidate>
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" required placeholder="John Smith" aria-invalid={!!fieldErrors.name} />
                <FieldError message={fieldErrors.name} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required placeholder="john@supplier.com" aria-invalid={!!fieldErrors.email} />
                <FieldError message={fieldErrors.email} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select name="role" defaultValue="VIEWER">
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="EDITOR">Editör</SelectItem>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Adding..." : "Add User"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Role</TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Joined</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {supplier.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium text-foreground">{user.name || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[10px]">
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveUser(user.id, user.name)}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {supplier.users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                  No users yet. Click "Add User" to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
