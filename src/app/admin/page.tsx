import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2Icon, UsersIcon, PackageIcon, Factory } from "lucide-react"
import Link from "next/link"

export const metadata = { title: "Admin Dashboard — PlantX" }

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login")

  const supplierCount = await prisma.company.count({ where: { type: "SUPPLIER" } })
  const oemCount = await prisma.company.count({ where: { type: "OEM" } })
  const supplierUserCount = await prisma.user.count({
    where: { company: { type: "SUPPLIER" } },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Platform Dashboard</h1>
        <p className="text-sm text-muted-foreground">Onboard and manage supplier companies across all OEMs.</p>
      </div>

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">OEMs</CardTitle>
            <Factory className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{oemCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Suppliers</CardTitle>
            <PackageIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{supplierCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Supplier Users</CardTitle>
            <UsersIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{supplierUserCount}</div>
          </CardContent>
        </Card>
      </div>

      <Link href="/admin/suppliers">
        <Card className="hover:border-blue-600/50 transition-colors cursor-pointer max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2Icon className="size-5 text-blue-500" />
              Manage Suppliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View, add, and remove supplier companies. Each supplier gets an admin user for platform access.
            </p>
            <p className="mt-2 text-sm font-medium text-blue-500">
              {supplierCount} supplier{supplierCount !== 1 ? "s" : ""} registered
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}
