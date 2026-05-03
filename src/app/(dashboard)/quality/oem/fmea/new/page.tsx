import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/billing"
import { FmeaCreateForm } from "./form"

export default async function NewFmeaPage() {
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const featureGate = requireFeature(session, "FMEA")
  if (!featureGate.allowed) redirect("/quality/oem")

  const suppliers = await prisma.company.findMany({
    where: { type: "SUPPLIER" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Create FMEA</h1>
        <p className="text-sm text-muted-foreground">Create a new Failure Mode and Effects Analysis request</p>
      </div>
      <FmeaCreateForm suppliers={suppliers} />
    </div>
  )
}