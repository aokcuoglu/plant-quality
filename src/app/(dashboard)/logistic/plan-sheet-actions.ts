"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature, requireModule } from "@/lib/billing/guards"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import type {
  PlanSheetChannel,
  PlanSheetLineStatus,
  LogisticOrderCustomerType,
  LogisticOrderVehicleType,
  LogisticOrderPowertrain,
  LogisticOrderPriority,
  LogisticOrderEventType,
  LogisticOrderStatus,
} from "@/generated/prisma/client"
import { PLAN_SHEET_ALLOWED } from "@/lib/logistic/plan-sheet"

interface ActionResult {
  success: boolean
  error?: string
}

async function authGate() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  return { companyId: session.user.companyId as string, userId: session.user.id as string }
}

async function nextOrderNumber(companyId: string): Promise<string> {
  const last = await prisma.plantLogisticOrder.findFirst({
    where: { companyId },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  })
  if (!last) return "LO-00001"
  const match = last.orderNumber.match(/LO-(\d+)$/)
  const next = match ? parseInt(match[1], 10) + 1 : 1
  return `LO-${String(next).padStart(5, "0")}`
}

async function logEvent(
  planSheetId: string,
  companyId: string,
  actorId: string,
  eventType: LogisticOrderEventType,
  message: string
) {
  await prisma.plantLogisticPlanSheetEvent.create({
    data: { planSheetId, companyId, actorId, eventType, message },
  })
}

async function loadSheet(sheetId: string, companyId: string) {
  return prisma.plantLogisticPlanSheet.findFirst({
    where: { id: sheetId, companyId },
    include: {
      createdBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      lines: { orderBy: { sequence: "asc" } },
      events: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
    },
  })
}

interface LineInput {
  customerName: string
  customerType: LogisticOrderCustomerType
  country?: string | null
  market?: string | null
  dealerName?: string | null
  distributorName?: string | null
  vehicleModel: string
  vehicleVariant?: string | null
  vehicleType: LogisticOrderVehicleType
  powertrain?: LogisticOrderPowertrain | null
  quantity: number
  priority: LogisticOrderPriority
  chassisNumber?: string | null
  vin?: string | null
  requestedDeliveryDate?: string | null
  remark?: string | null
}

export async function createPlanSheet(formData: FormData): Promise<ActionResult> {
  const { companyId, userId } = await authGate()

  const title = (formData.get("title") as string)?.trim()
  if (!title) return { success: false, error: "Başlık zorunlu" }

  const periodMonth = (formData.get("periodMonth") as string)?.trim()
  if (!periodMonth) return { success: false, error: "Dönem ayı zorunlu" }

  const channel = (formData.get("channel") as PlanSheetChannel) || "EXPORT"
  const notes = (formData.get("notes") as string)?.trim() || null

  const linesRaw = (formData.get("lines") as string) || "[]"
  let lines: LineInput[] = []
  try {
    lines = JSON.parse(linesRaw) as LineInput[]
  } catch {
    return { success: false, error: "Satır verisi geçersiz" }
  }
  const validLines = lines.filter((l) => l.customerName?.trim() && l.vehicleModel?.trim())
  if (validLines.length === 0) {
    return { success: false, error: "En az bir geçerli satır ekleyin" }
  }

  const last = await prisma.plantLogisticPlanSheet.findFirst({
    where: { companyId },
    orderBy: { planNumber: "desc" },
    select: { planNumber: true },
  })
  const match = last?.planNumber.match(/PS-(\d+)$/)
  const next = match ? parseInt(match[1], 10) + 1 : 1
  const planNumber = `PS-${String(next).padStart(4, "0")}`

  const sheet = await prisma.plantLogisticPlanSheet.create({
    data: {
      companyId,
      planNumber,
      title,
      periodMonth,
      channel,
      notes,
      status: "DRAFT",
      createdById: userId,
      lines: {
        create: validLines.map((l, i) => ({
          companyId,
          sequence: i + 1,
          customerName: l.customerName.trim(),
          customerType: l.customerType || "CUSTOMER",
          country: l.country?.trim() || null,
          market: l.market?.trim() || null,
          dealerName: l.dealerName?.trim() || null,
          distributorName: l.distributorName?.trim() || null,
          vehicleModel: l.vehicleModel.trim(),
          vehicleVariant: l.vehicleVariant?.trim() || null,
          vehicleType: l.vehicleType || "BUS",
          powertrain: l.powertrain || "DIESEL",
          quantity: l.quantity || 1,
          priority: l.priority || "NORMAL",
          chassisNumber: l.chassisNumber?.trim() || null,
          vin: l.vin?.trim() || null,
          requestedDeliveryDate: l.requestedDeliveryDate ? new Date(l.requestedDeliveryDate) : null,
          remark: l.remark?.trim() || null,
          status: "PENDING",
        })),
      },
    },
  })

  await logEvent(sheet.id, companyId, userId, "ORDER_CREATED", "Şase listesi oluşturuldu")

  revalidatePath("/logistic/plan-sheets")
  return { success: true }
}

export async function submitPlanSheet(sheetId: string): Promise<ActionResult> {
  const { companyId, userId } = await authGate()
  const sheet = await loadSheet(sheetId, companyId)
  if (!sheet) return { success: false, error: "Liste bulunamadı" }
  if (!PLAN_SHEET_ALLOWED.submit(sheet.status)) {
    return { success: false, error: "Bu durumda gönderilemez" }
  }

  const now = new Date()
  await prisma.plantLogisticPlanSheet.update({
    where: { id: sheetId },
    data: { status: "UNDER_REVIEW", submittedAt: now },
  })
  await prisma.plantLogisticPlanSheetLine.updateMany({
    where: { planSheetId: sheetId, status: "PENDING" },
    data: { status: "SUBMITTED" },
  })
  await logEvent(sheetId, companyId, userId, "STATUS_CHANGED", "İncelemeye gönderildi")
  revalidatePath("/logistic/plan-sheets")
  revalidatePath(`/logistic/plan-sheets/${sheetId}`)
  return { success: true }
}

export async function setLineForecastDate(
  sheetId: string,
  lineId: string,
  dateStr: string | null
): Promise<ActionResult> {
  const { companyId } = await authGate()
  const sheet = await loadSheet(sheetId, companyId)
  if (!sheet) return { success: false, error: "Liste bulunamadı" }
  const line = sheet.lines.find((l) => l.id === lineId)
  if (!line) return { success: false, error: "Satır bulunamadı" }
  if (!PLAN_SHEET_ALLOWED.approve(sheet.status)) {
    return { success: false, error: "Sadece inceleme/onay aşamasında öngörü tarihi girilebilir" }
  }

  await prisma.plantLogisticPlanSheetLine.update({
    where: { id: lineId },
    data: { forecastDispatchDate: dateStr ? new Date(dateStr) : null },
  })
  revalidatePath(`/logistic/plan-sheets/${sheetId}`)
  return { success: true }
}

export async function setLineReviewStatus(
  sheetId: string,
  lineId: string,
  status: PlanSheetLineStatus
): Promise<ActionResult> {
  const { companyId, userId } = await authGate()
  const sheet = await loadSheet(sheetId, companyId)
  if (!sheet) return { success: false, error: "Liste bulunamadı" }
  if (!PLAN_SHEET_ALLOWED.approve(sheet.status)) {
    return { success: false, error: "İnceleme aşamasında yapılabilir" }
  }
  const line = sheet.lines.find((l) => l.id === lineId)
  if (!line) return { success: false, error: "Satır bulunamadı" }
  if (line.orderId) return { success: false, error: "Sipariş oluşturulmuş satır değiştirilemez" }

  await prisma.plantLogisticPlanSheetLine.update({
    where: { id: lineId },
    data: { status },
  })
  await logEvent(
    sheetId,
    companyId,
    userId,
    "ORDER_UPDATED",
    `Satır ${line.sequence} — ${status === "REJECTED" ? "reddedildi" : "onaylandı"}`
  )
  revalidatePath(`/logistic/plan-sheets/${sheetId}`)
  return { success: true }
}

export async function approvePlanSheet(sheetId: string): Promise<ActionResult> {
  const { companyId, userId } = await authGate()
  const sheet = await loadSheet(sheetId, companyId)
  if (!sheet) return { success: false, error: "Liste bulunamadı" }
  if (!PLAN_SHEET_ALLOWED.approve(sheet.status)) {
    return { success: false, error: "İnceleme aşamasında değil, onaylanamaz" }
  }

  const now = new Date()
  let generated = 0

  for (const line of sheet.lines) {
    if (line.status === "REJECTED" || line.orderId) continue
    const orderNumber = await nextOrderNumber(companyId)
    const order = await prisma.plantLogisticOrder.create({
      data: {
        companyId,
        orderNumber,
        customerName: line.customerName,
        customerType: line.customerType,
        dealerName: line.dealerName,
        distributorName: line.distributorName,
        country: line.country,
        market: line.market,
        vehicleModel: line.vehicleModel,
        vehicleVariant: line.vehicleVariant,
        vehicleType: line.vehicleType,
        powertrain: line.powertrain,
        quantity: line.quantity,
        priority: line.priority,
        vin: line.vin,
        chassisNumber: line.chassisNumber,
        requestedDeliveryDate: line.requestedDeliveryDate,
        plannedDeliveryDate: line.forecastDispatchDate,
        status: "APPROVED" as LogisticOrderStatus,
        createdById: userId,
        planSheetId: sheet.id,
        planSheetLineId: line.id,
      },
    })

    await prisma.plantLogisticPlanSheetLine.update({
      where: { id: line.id },
      data: { orderId: order.id, status: "GENERATED", generatedAt: now },
    })

    await prisma.plantLogisticPlanSheetEvent.create({
      data: {
        planSheetId: sheet.id,
        companyId,
        actorId: userId,
        eventType: "ORDER_CREATED",
        message: `Satır ${line.sequence} → sipariş ${orderNumber}`,
      },
    })
    generated++
  }

  await prisma.plantLogisticPlanSheet.update({
    where: { id: sheetId },
    data: { status: "APPROVED", approvedAt: now, approvedById: userId },
  })
  await logEvent(
    sheetId,
    companyId,
    userId,
    "ORDER_APPROVED",
    `Onaylandı — ${generated} sipariş oluşturuldu`
  )

  revalidatePath("/logistic/plan-sheets")
  revalidatePath("/logistic/orders")
  revalidatePath("/logistic/board")
  revalidatePath(`/logistic/plan-sheets/${sheetId}`)
  return { success: true, error: undefined }
}

export async function rejectPlanSheet(sheetId: string, reason: string): Promise<ActionResult> {
  const { companyId, userId } = await authGate()
  const sheet = await loadSheet(sheetId, companyId)
  if (!sheet) return { success: false, error: "Liste bulunamadı" }
  if (!PLAN_SHEET_ALLOWED.reject(sheet.status)) {
    return { success: false, error: "Bu durumda reddedilemez" }
  }

  const now = new Date()
  await prisma.plantLogisticPlanSheet.update({
    where: { id: sheetId },
    data: { status: "REJECTED", rejectedAt: now },
  })
  await logEvent(sheetId, companyId, userId, "ORDER_REJECTED", reason?.trim() || "Reddedildi")
  revalidatePath("/logistic/plan-sheets")
  revalidatePath(`/logistic/plan-sheets/${sheetId}`)
  return { success: true }
}

export async function cancelPlanSheet(sheetId: string): Promise<ActionResult> {
  const { companyId, userId } = await authGate()
  const sheet = await loadSheet(sheetId, companyId)
  if (!sheet) return { success: false, error: "Liste bulunamadı" }
  if (!PLAN_SHEET_ALLOWED.cancel(sheet.status)) {
    return { success: false, error: "Bu durumda iptal edilemez" }
  }

  const now = new Date()
  await prisma.plantLogisticPlanSheet.update({
    where: { id: sheetId },
    data: { status: "CANCELLED", closedAt: now },
  })
  await logEvent(sheetId, companyId, userId, "ORDER_CANCELLED", "Liste iptal edildi")
  revalidatePath("/logistic/plan-sheets")
  revalidatePath(`/logistic/plan-sheets/${sheetId}`)
  return { success: true }
}
