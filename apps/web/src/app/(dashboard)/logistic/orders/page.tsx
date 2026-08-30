import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireFeature, requireModule } from "@/lib/billing/guards"
import { STATUS_LABELS } from "@/lib/logistic/status"
import { calculateProductionProgress, allMilestonesResolved } from "@/lib/logistic/milestone-status"
import { getOrderSlaSummary, formatSlaDate, formatDaysValue, type OrderSlaInput } from "@/lib/logistic/sla"
import Link from "next/link"
import { PlusCircle, TruckIcon } from "lucide-react"
import { StatusBadge } from "../status-badge"
import { SlaStatusBadge } from "../sla-badge"
import { resolveFieldConfig } from "@/lib/custom-fields/resolver"
import { getListVisibleFields, CustomFieldsTableHeaders, CustomFieldsTableCells } from "@/components/custom-fields/CustomFieldsTableColumns"
import type { ResolvedFields } from "@/lib/custom-fields/resolver"
import { getTranslations } from "@/i18n/server"

export const dynamic = "force-dynamic"

export default async function LogisticOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>
}) {
  const session = await auth()
  const t = await getTranslations()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const companyId = session.user.companyId
  const params = await searchParams
  const statusFilter = params.status ?? ""
  const searchFilter = (params.search ?? "").trim()

  const where: Record<string, unknown> = { companyId }
  if (statusFilter) {
    where.status = statusFilter
  }
  if (searchFilter) {
    where.OR = [
      { orderNumber: { contains: searchFilter, mode: "insensitive" } },
      { customerName: { contains: searchFilter, mode: "insensitive" } },
      { vehicleModel: { contains: searchFilter, mode: "insensitive" } },
      { vin: { contains: searchFilter, mode: "insensitive" } },
      { chassisNumber: { contains: searchFilter, mode: "insensitive" } },
      { customFields: { path: [], string_contains: searchFilter } },
    ]
  }

  const orders = await prisma.plantLogisticOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true } },
        milestones: {
          orderBy: { sequence: "asc" },
          select: {
            id: true,
            gate: true,
            status: true,
            qualityHold: true,
            sequence: true,
            title: true,
            plannedFinish: true,
            responsibleDepartment: true,
            delayReason: true,
          },
        },
        yardStatus: { select: { yardLocation: true, parkingSlot: true, readyForDispatch: true, blockedForDispatch: true, blockReason: true, lastMovementAt: true } },
        dispatches: { select: { id: true, status: true, plannedLoadingDate: true, estimatedArrivalDate: true, carrierName: true }, take: 1, orderBy: { createdAt: "desc" } },
      },
  })

  let fieldConfig: ResolvedFields
  try {
    if (session.user.plan === "ENTERPRISE") {
      fieldConfig = await resolveFieldConfig(session.user.companyId, "LOGISTIC_ORDER")
    } else {
      fieldConfig = { all: [], visible: [], builtIn: [], custom: [] }
    }
  } catch {
    fieldConfig = { all: [], visible: [], builtIn: [], custom: [] }
  }
  const listVisibleFields = getListVisibleFields(fieldConfig.all)

  const statusOptions = Object.keys(STATUS_LABELS).map((value) => ({ value, label: t(`logistic.statuses.${value}` as "logistic.statuses.DRAFT") }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("logistic.dynamicFlow.ordersTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("logistic.dynamicFlow.ordersDescription")}</p>
        </div>
        <Link
          href="/logistic/orders/new"
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-foreground/90"
        >
          <PlusCircle className="size-4" />
          {t("nav.newOrder")}
        </Link>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          name="status"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          defaultValue={statusFilter}
        >
          <option value="">{t("logistic.dynamicFlow.allStatuses")}</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="flex flex-1 items-center gap-2 sm:max-w-xs">
          <input
            type="text"
            name="search"
            placeholder={t("logistic.dynamicFlow.searchOrders")}
            defaultValue={searchFilter}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          {t("logistic.dynamicFlow.applyFilters")}
        </button>
      </form>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-muted-foreground">
          <TruckIcon className="mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm">{t("logistic.dynamicFlow.noOrdersFound")}</p>
          <Link
            href="/logistic/orders/new"
            className="mt-2 text-xs text-foreground hover:text-foreground"
          >
            {t("logistic.dynamicFlow.createFirstOrder")}
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {(["order", "customer", "type", "vehicle", "quantityShort", "priorityShort", "status", "production", "currentGate", "yard", "dispatch", "deliveryTarget", "sla", "created"] as const).map((key) => <th key={key} className="px-4 py-3 text-left">{t(`logistic.dynamicFlow.${key}` as "logistic.dynamicFlow.order")}</th>)}
                  <CustomFieldsTableHeaders fields={listVisibleFields} />
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => {
                   const progress = calculateProductionProgress(order.milestones)
                   const currentMs = order.milestones.find(m => m.status === "IN_PROGRESS" || m.status === "BLOCKED" || m.status === "QUALITY_HOLD")
                   const hasHold = order.milestones.some(m => m.qualityHold)
  const milestonesCompleted = !currentMs && allMilestonesResolved(order.milestones)
                   const slaInput: OrderSlaInput = {
                     id: order.id,
                     orderNumber: order.orderNumber,
                     status: order.status,
                     requestedDeliveryDate: order.requestedDeliveryDate,
                     plannedDeliveryDate: order.plannedDeliveryDate,
                     deliveredAt: order.deliveredAt,
                     closedAt: order.closedAt,
                     externalVisible: order.externalVisible,
                     externalStatus: order.externalStatus,
                     externalStatusNote: order.externalStatusNote,
                     milestones: order.milestones.map((m) => ({
                       id: m.id,
                       gate: m.gate,
                       title: m.title ?? m.gate,
                       status: m.status,
                       plannedFinish: m.plannedFinish,
                       qualityHold: m.qualityHold,
                       responsibleDepartment: m.responsibleDepartment,
                       delayReason: m.delayReason,
                     })),
                     yardStatus: order.yardStatus
                       ? {
                           readyForDispatch: order.yardStatus.readyForDispatch,
                           blockedForDispatch: order.yardStatus.blockedForDispatch,
                           blockReason: order.yardStatus.blockReason ?? null,
                           lastMovementAt: order.yardStatus.lastMovementAt,
                         }
                       : null,
                     dispatches: order.dispatches.map((d) => ({
                       id: d.id,
                       status: d.status,
                       plannedLoadingDate: d.plannedLoadingDate,
                       estimatedArrivalDate: d.estimatedArrivalDate,
                     })),
                   }
                   const sla = getOrderSlaSummary(slaInput)
                   return (
                    <tr key={order.id} className="group hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link href={`/logistic/orders/${order.id}`} className="text-sm font-medium text-foreground hover:text-foreground">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{order.customerName}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{t(`logistic.dynamicFlow.customerTypes.${order.customerType}` as "logistic.dynamicFlow.customerTypes.CUSTOMER")}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {order.vehicleModel}
                        {order.vehicleVariant ? ` (${order.vehicleVariant})` : ""}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{order.quantity}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{t(`logistic.dynamicFlow.priorities.${order.priority}` as "logistic.dynamicFlow.priorities.NORMAL")}</td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3">
                        {order.milestones.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-16 rounded-full bg-muted">
                              <div
                                className={`h-1.5 rounded-full ${progress === 100 ? "bg-foreground" : hasHold ? "bg-destructive" : "bg-accent"}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{progress}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {currentMs ? t(`logistic.dynamicFlow.gates.${currentMs.gate}` as "logistic.dynamicFlow.gates.OTHER") : milestonesCompleted ? t("logistic.dynamicFlow.completed") : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {order.yardStatus ? (
                          <div className="flex flex-col">
                            <span>{order.yardStatus.yardLocation || "—"}{order.yardStatus.parkingSlot ? ` / ${order.yardStatus.parkingSlot}` : ""}</span>
                            {order.yardStatus.readyForDispatch && <span className="text-[10px] text-foreground">{t("logistic.dynamicFlow.ready")}</span>}
                            {order.yardStatus.blockedForDispatch && <span className="text-[10px] text-destructive">{t("logistic.dynamicFlow.blocked")}</span>}
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {order.dispatches.length > 0 ? (
                          <div className="flex flex-col">
                            <span className="text-xs">{t(`logistic.dynamicFlow.dispatchStatuses.${order.dispatches[0].status}` as "logistic.dynamicFlow.dispatchStatuses.NOT_PLANNED")}</span>
                            {order.dispatches[0].carrierName && <span className="text-[10px] text-muted-foreground">{order.dispatches[0].carrierName}</span>}
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatSlaDate(order.requestedDeliveryDate ?? order.plannedDeliveryDate)}
                      </td>
                      <td className="px-4 py-3">
                        <SlaStatusBadge status={sla.slaStatus} />
                        {sla.daysUntilOrOverdue !== null && sla.slaStatus !== "DELIVERED" && sla.slaStatus !== "CANCELLED" && (
                          <span className={`ml-1 text-[10px] ${sla.daysUntilOrOverdue < 0 ? "text-destructive" : "text-destructive"}`}>
                            {formatDaysValue(sla.daysUntilOrOverdue)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{order.createdAt.toLocaleDateString()}</td>
                      <CustomFieldsTableCells fields={listVisibleFields} customFields={order.customFields as Record<string, unknown> | null} />
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
