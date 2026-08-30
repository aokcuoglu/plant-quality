import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireFeature, requireModule } from "@/lib/billing/guards"
import { PLAN_SHEET_ALLOWED } from "@/lib/logistic/plan-sheet"
import { canSalesExport, canProduction } from "@/lib/logistic/roles"
import { PlanSheetDetail } from "./plan-sheet-detail"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function PlanSheetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const companyId = session.user.companyId
  const { id } = await params

  const sheet = await prisma.plantLogisticPlanSheet.findFirst({
    where: { id, companyId },
    include: {
      createdBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      lines: { orderBy: { sequence: "asc" } },
      events: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
    },
  })
  if (!sheet) notFound()

  const catalogModels = await prisma.logisticVehicleModel.findMany({
    where: { companyId, active: true },
    select: { name: true, group: { select: { code: true } } },
    orderBy: { name: "asc" },
  })

  const serializable = {
    id: sheet.id,
    planNumber: sheet.planNumber,
    title: sheet.title,
    periodMonth: sheet.periodMonth,
    channel: sheet.channel,
    status: sheet.status,
    notes: sheet.notes,
    createdAt: sheet.createdAt.toISOString(),
    submittedAt: sheet.submittedAt?.toISOString() ?? null,
    approvedAt: sheet.approvedAt?.toISOString() ?? null,
    rejectedAt: sheet.rejectedAt?.toISOString() ?? null,
    createdByName: sheet.createdBy?.name ?? "—",
    approvedByName: sheet.approvedBy?.name ?? null,
    allowedActions: {
      canSubmit: canSalesExport(session.user.role) && PLAN_SHEET_ALLOWED.submit(sheet.status),
      canApprove: canProduction(session.user.role) && PLAN_SHEET_ALLOWED.approve(sheet.status),
      canReject: canProduction(session.user.role) && PLAN_SHEET_ALLOWED.reject(sheet.status),
      canCancel: canSalesExport(session.user.role) && PLAN_SHEET_ALLOWED.cancel(sheet.status),
      canEditLines: canSalesExport(session.user.role) && PLAN_SHEET_ALLOWED.edit(sheet.status),
      canEditForecast: canProduction(session.user.role) && PLAN_SHEET_ALLOWED.approve(sheet.status),
    },
    catalogModels: catalogModels.map((model) => ({ name: model.name, groupCode: model.group.code })),
    lines: sheet.lines.map((l) => ({
      id: l.id,
      sequence: l.sequence,
      customerName: l.customerName,
      customerType: l.customerType,
      country: l.country,
      market: l.market,
      dealerName: l.dealerName,
      distributorName: l.distributorName,
      vehicleModel: l.vehicleModel,
      vehicleVariant: l.vehicleVariant,
      vehicleType: l.vehicleType,
      powertrain: l.powertrain,
      quantity: l.quantity,
      priority: l.priority,
      chassisNumber: l.chassisNumber,
      vin: l.vin,
      requestedDeliveryDate: l.requestedDeliveryDate?.toISOString().slice(0, 10) ?? null,
      forecastDispatchDate: l.forecastDispatchDate?.toISOString().slice(0, 10) ?? null,
      status: l.status,
      remark: l.remark,
      orderId: l.orderId,
      generatedAt: l.generatedAt?.toISOString() ?? null,
    })),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/logistic/plan-sheets" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{sheet.planNumber}</h1>
          <p className="text-sm text-muted-foreground">{sheet.title} · {sheet.periodMonth}</p>
        </div>
      </div>

      <PlanSheetDetail sheet={serializable} />

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium text-foreground">Zaman Çizelgesi</h2>
        {sheet.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz olay yok.</p>
        ) : (
          <div className="space-y-3">
            {sheet.events.map((event) => (
              <div key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="size-2 rounded-full bg-muted-foreground" />
                  <div className="w-px flex-1 bg-border" />
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{event.actor?.name ?? "Sistem"}</span>
                    <span className="text-xs text-muted-foreground">
                      {event.createdAt.toLocaleDateString()} {event.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{event.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
