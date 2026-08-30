import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { isPortalUser } from "@/lib/logistic/portal-access"
import { PortalOrderForm } from "./form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function PortalNewOrderPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!isPortalUser(session.user.companyType)) redirect("/login")

  const oems = await prisma.company.findMany({
    where: { type: "OEM" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/logistic/portal/orders" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">New Order Request</h1>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <PortalOrderForm oems={oems} />
      </div>
    </div>
  )
}