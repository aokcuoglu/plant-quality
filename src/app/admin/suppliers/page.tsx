import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getSuppliers, getOEMs } from "./actions"
import { SupplierListClient } from "./client"

export const metadata = { title: "Suppliers — PlantX Admin" }

export default async function AdminSuppliersPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login")

  const [suppliers, oems] = await Promise.all([getSuppliers(), getOEMs()])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Supplier Management</h1>
        <p className="text-sm text-muted-foreground">Onboard supplier companies and assign them to OEMs.</p>
      </div>

      <SupplierListClient suppliers={suppliers} oems={oems} />
    </div>
  )
}
