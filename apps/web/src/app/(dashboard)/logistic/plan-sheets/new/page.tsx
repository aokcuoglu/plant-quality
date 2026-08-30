import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { requireFeature, requireModule } from "@/lib/billing/guards"
import { canSalesExport } from "@/lib/logistic/roles"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PlanSheetForm } from "./form"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function NewPlanSheetPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  if (!canSalesExport(session.user.role)) redirect("/logistic/plan-sheets")

  const defaultMonth = new Date().toISOString().slice(0, 7)
  const catalog = await prisma.logisticVehicleGroup.findMany({
    where: { companyId: session.user.companyId, active: true },
    orderBy: { name: "asc" },
    include: { models: { where: { active: true }, orderBy: { name: "asc" } } },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/logistic/plan-sheets" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Yeni Şase Listesi</h1>
          <p className="text-sm text-muted-foreground">Satış ekipleri için aylık sevk planı oluştur</p>
        </div>
      </div>

      <PlanSheetForm defaultMonth={defaultMonth} catalog={catalog.map((group) => ({
        code: group.code,
        name: group.name,
        models: group.models.map((model) => ({ name: model.name, groupCode: group.code })),
      }))} />
    </div>
  )
}
