import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getSupplierDetail } from "../actions"
import { SupplierDetailClient } from "./client"

export const metadata = { title: "Supplier Detail — PlantX Admin" }

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login")

  const { id } = await params
  const supplier = await getSupplierDetail(id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{supplier.name}</h1>
        <p className="text-sm text-muted-foreground">
          Manage users for this supplier.
          {supplier.primaryOem && (
            <span> OEM: <span className="font-medium text-foreground">{supplier.primaryOem.name}</span></span>
          )}
        </p>
      </div>

      <SupplierDetailClient supplier={supplier} />
    </div>
  )
}
