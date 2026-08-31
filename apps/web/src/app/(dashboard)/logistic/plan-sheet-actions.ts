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
  Role,
  PlantLogisticPlanSheetLine,
} from "@plantx/db/client"
import {
  hasForecastDispatchDate,
  isForecastDispatchDateCurrentOrFuture,
  PLAN_SHEET_ALLOWED,
  PLAN_SHEET_FORECAST_IN_PAST,
  PLAN_SHEET_FORECAST_REQUIRED,
  PLAN_SHEET_LINE_ALLOWED,
  PLAN_SHEET_LINE_LOCKED,
  PLAN_SHEET_REJECTION_COMMENT_REQUIRED,
} from "@/lib/logistic/plan-sheet"
import { canSalesExport } from "@/lib/logistic/roles"
import { nextVehicleGroupCode, vehicleGroupCodeBase } from "@/lib/logistic/catalog-code"
import { normalizeVehicleType } from "@/lib/logistic/types"
import {
  assertWorkflowActionAllowed,
  startWorkflowInstance,
  transitionWorkflowAction,
} from "@/lib/logistic/workflow-runtime"

interface ActionResult {
  success: boolean
  error?: string
}

export interface VehicleLineUpdateInput {
  identifier: string | null
  customerName: string
  country: string | null
  vehicleModel: string
  priority: LogisticOrderPriority
  requestedDeliveryDate: string | null
}

async function authGate() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const user = await prisma.user.findFirst({
    where: { id: session.user.id, companyId: session.user.companyId },
    select: { id: true, role: true },
  })
  if (!user) redirect("/login")

  return {
    companyId: session.user.companyId as string,
    userId: user.id,
    role: user.role as Role,
  }
}

function allowedOrDeny(role: Role, can: (r: Role) => boolean): ActionResult {
  if (!can(role)) return { success: false, error: "Bu işlem için yetkiniz yok" }
  return { success: true }
}

async function workflowGate(
  companyId: string,
  userId: string,
  sheetId: string,
  actionKey: string,
): Promise<ActionResult> {
  return assertWorkflowActionAllowed({
    companyId,
    subjectType: "PLAN_SHEET",
    subjectId: sheetId,
    userId,
    actionKey,
  })
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

async function createBoardUnitsFromPlanLine({
  companyId,
  userId,
  orderId,
  orderNumber,
  line,
}: {
  companyId: string
  userId: string
  orderId: string
  orderNumber: string
  line: PlantLogisticPlanSheetLine
}) {
  let model = await prisma.logisticVehicleModel.findFirst({
    where: {
      companyId,
      name: { equals: line.vehicleModel, mode: "insensitive" },
    },
  })
  let group = model
    ? await prisma.logisticVehicleGroup.findFirst({
        where: { id: model.groupId, companyId },
      })
    : null

  if (!group) {
    const groupCode = line.vehicleType
    group = await prisma.logisticVehicleGroup.upsert({
      where: { companyId_code: { companyId, code: groupCode } },
      update: { active: true },
      create: {
        companyId,
        code: groupCode,
        name: groupCode.replaceAll("_", " "),
      },
    })
  }

  if (!model) {
    const codeBase = vehicleGroupCodeBase(line.vehicleModel)
    const existingModels = await prisma.logisticVehicleModel.findMany({
      where: { companyId, code: { startsWith: codeBase } },
      select: { code: true },
    })
    model = await prisma.logisticVehicleModel.create({
      data: {
        companyId,
        groupId: group.id,
        code: nextVehicleGroupCode(codeBase, existingModels.map(({ code }) => code)),
        name: line.vehicleModel,
      },
    })
  } else if (!model.active) {
    model = await prisma.logisticVehicleModel.update({
      where: { id: model.id, companyId },
      data: { active: true },
    })
  }

  const flow = await prisma.logisticFlowVersion.findFirst({
    where: { companyId, groupId: group.id, status: "PUBLISHED" },
    orderBy: { version: "desc" },
    include: { nodes: { orderBy: { sequence: "asc" } } },
  })
  const firstProcess = flow?.nodes.find(({ kind }) => kind === "PROCESS")
  const orderLine = await prisma.logisticOrderLine.create({
    data: {
      companyId,
      orderId,
      vehicleModelId: model.id,
      sequence: 1,
      quantity: line.quantity,
      variant: line.vehicleVariant,
      powertrain: line.powertrain,
      priority: line.priority,
    },
  })

  for (let index = 1; index <= line.quantity; index++) {
    const unit = await prisma.logisticVehicleUnit.create({
      data: {
        companyId,
        orderLineId: orderLine.id,
        vehicleModelId: model.id,
        temporaryUnitCode: `${orderNumber}-01-${String(index).padStart(3, "0")}`,
        vin: index === 1 ? line.vin : null,
        chassisNumber: index === 1 ? line.chassisNumber : null,
        flowVersionId: flow?.id,
        currentNodeId: firstProcess?.id,
        flowStatus: firstProcess ? "ACTIVE" : "WAITING_FOR_FLOW",
        startedAt: firstProcess ? new Date() : null,
      },
    })
    if (firstProcess) {
      await prisma.logisticVehicleProcessVisit.create({
        data: {
          companyId,
          vehicleUnitId: unit.id,
          nodeId: firstProcess.id,
          actorId: userId,
          transitionType: "START",
        },
      })
    }
  }
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
  const { companyId, userId, role } = await authGate()
  const gate = allowedOrDeny(role, canSalesExport)
  if (!gate.success) return gate

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

  const catalogModels = await prisma.logisticVehicleModel.findMany({
    where: { companyId, active: true },
    include: { group: { select: { code: true, name: true, active: true } } },
  })
  const invalidCatalogLine = validLines.find((line) => {
    const model = catalogModels.find(({ name }) => name.toLocaleLowerCase() === line.vehicleModel.trim().toLocaleLowerCase())
    if (!model || !model.group.active) return true
    const inputGroup = String(line.vehicleType || "").trim().toLocaleLowerCase("tr-TR")
    const catalogGroup = model.group.code.trim().toLocaleLowerCase("tr-TR")
    const inputType = normalizeVehicleType(line.vehicleType)
    const catalogType = normalizeVehicleType(model.group.code)
    return inputGroup !== catalogGroup && (inputType === "OTHER" || catalogType === "OTHER" || inputType !== catalogType)
  })
  if (invalidCatalogLine) {
    return { success: false, error: `Araç modeli veya grubu Araç Kataloğu ile eşleşmiyor: ${invalidCatalogLine.vehicleModel}` }
  }

  const last = await prisma.plantLogisticPlanSheet.findFirst({
    where: { companyId },
    orderBy: { planNumber: "desc" },
    select: { planNumber: true },
  })
  const match = last?.planNumber.match(/PS-(\d+)$/)
  const next = match ? parseInt(match[1], 10) + 1 : 1
  const planNumber = `PS-${String(next).padStart(4, "0")}`

  const normalizedLines = validLines.map((line) => ({
    ...line,
    vehicleType: normalizeVehicleType(line.vehicleType),
  }))

  const publishedWorkflow = await prisma.logisticWorkflowDefinition.findFirst({
    where: {
      companyId,
      subjectType: "PLAN_SHEET",
      active: true,
      isDefault: true,
      versions: { some: { companyId, status: "PUBLISHED" } },
    },
    select: { id: true },
  })
  if (!publishedWorkflow) {
    return { success: false, error: "WORKFLOW_NOT_PUBLISHED" }
  }

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
        create: normalizedLines.map((l, i) => ({
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

  const workflow = await startWorkflowInstance({
    companyId,
    subjectType: "PLAN_SHEET",
    subjectId: sheet.id,
    actorUserId: userId,
  })
  if (!workflow.success) {
    await prisma.plantLogisticPlanSheet.deleteMany({
      where: { id: sheet.id, companyId },
    })
    return { success: false, error: workflow.error }
  }

  revalidatePath("/logistic/plan-sheets")
  return { success: true }
}

export async function submitPlanSheet(sheetId: string): Promise<ActionResult> {
  const { companyId, userId } = await authGate()
  const gate = await workflowGate(companyId, userId, sheetId, "PLAN_SHEET_SUBMIT")
  if (!gate.success) return gate
  const sheet = await loadSheet(sheetId, companyId)
  if (!sheet) return { success: false, error: "Liste bulunamadı" }
  if (!PLAN_SHEET_ALLOWED.submit(sheet.status)) {
    return { success: false, error: "Bu durumda gönderilemez" }
  }

  const now = new Date()
  await prisma.plantLogisticPlanSheet.update({
    where: { id: sheetId, companyId },
    data: { status: "UNDER_REVIEW", submittedAt: now },
  })
  await prisma.plantLogisticPlanSheetLine.updateMany({
    where: { planSheetId: sheetId, companyId, status: "PENDING" },
    data: { status: "SUBMITTED" },
  })
  await logEvent(sheetId, companyId, userId, "STATUS_CHANGED", "İncelemeye gönderildi")
  const transition = await transitionWorkflowAction({
    companyId,
    subjectType: "PLAN_SHEET",
    subjectId: sheetId,
    userId,
    actionKey: "PLAN_SHEET_SUBMIT",
  })
  if (!transition.success) return transition
  revalidatePath("/logistic/plan-sheets")
  revalidatePath(`/logistic/plan-sheets/${sheetId}`)
  return { success: true }
}

export async function setLineForecastDate(
  sheetId: string,
  lineId: string,
  dateStr: string | null
): Promise<ActionResult> {
  const { companyId, userId } = await authGate()
  const gate = await workflowGate(companyId, userId, sheetId, "PLAN_SHEET_SET_FORECAST")
  if (!gate.success) return gate
  const sheet = await loadSheet(sheetId, companyId)
  if (!sheet) return { success: false, error: "Liste bulunamadı" }
  const line = sheet.lines.find((l) => l.id === lineId)
  if (!line) return { success: false, error: "Satır bulunamadı" }
  if (line.orderId || !PLAN_SHEET_LINE_ALLOWED.setForecast(line.status)) {
    return { success: false, error: PLAN_SHEET_LINE_LOCKED }
  }
  if (!PLAN_SHEET_ALLOWED.approve(sheet.status)) {
    return { success: false, error: "Sadece inceleme/onay aşamasında öngörü tarihi girilebilir" }
  }

  const forecastDate = dateStr ? new Date(dateStr) : null
  if (forecastDate && Number.isNaN(forecastDate.getTime())) {
    return { success: false, error: "INVALID_DATE" }
  }
  if (forecastDate && !isForecastDispatchDateCurrentOrFuture(forecastDate)) {
    return { success: false, error: PLAN_SHEET_FORECAST_IN_PAST }
  }
  if (PLAN_SHEET_LINE_ALLOWED.reviseForecast(line.status) && !forecastDate) {
    return { success: false, error: PLAN_SHEET_FORECAST_REQUIRED }
  }
  const update = await prisma.plantLogisticPlanSheetLine.updateMany({
    where: {
      id: lineId,
      companyId,
      planSheetId: sheetId,
      orderId: null,
      status: line.status,
      ...(!forecastDate ? { status: "SUBMITTED" as const } : {}),
    },
    data: { forecastDispatchDate: forecastDate },
  })
  if (update.count === 0) {
    return { success: false, error: PLAN_SHEET_LINE_LOCKED }
  }
  if (line.forecastDispatchDate?.getTime() !== forecastDate?.getTime()) {
    await logEvent(
      sheetId,
      companyId,
      userId,
      "ORDER_UPDATED",
      `Satır ${line.sequence} öngörü sevk tarihi ${forecastDate?.toLocaleDateString("tr-TR") ?? "boş"} olarak güncellendi`,
    )
  }
  revalidatePath(`/logistic/plan-sheets/${sheetId}`)
  return { success: true }
}

export async function updatePlanSheetLine(
  sheetId: string,
  lineId: string,
  input: VehicleLineUpdateInput
): Promise<ActionResult> {
  const { companyId, userId } = await authGate()
  const gate = await workflowGate(companyId, userId, sheetId, "PLAN_SHEET_EDIT")
  if (!gate.success) return gate

  const sheet = await loadSheet(sheetId, companyId)
  if (!sheet) return { success: false, error: "Liste bulunamadı" }
  if (!PLAN_SHEET_ALLOWED.edit(sheet.status)) {
    return { success: false, error: "Bu durumda araç düzenlenemez" }
  }

  const line = sheet.lines.find((candidate) => candidate.id === lineId)
  if (!line) return { success: false, error: "Satır bulunamadı" }
  if (line.orderId) return { success: false, error: "Sipariş oluşturulmuş satır değiştirilemez" }

  const customerName = input.customerName.trim()
  const vehicleModel = input.vehicleModel.trim()
  if (!customerName || !vehicleModel) {
    return { success: false, error: "Müşteri ve araç modeli zorunludur" }
  }

  const catalogModel = await prisma.logisticVehicleModel.findFirst({
    where: { companyId, active: true, name: { equals: vehicleModel, mode: "insensitive" } },
    include: { group: { select: { code: true, active: true } } },
  })
  if (!catalogModel?.group.active) {
    return { success: false, error: "Araç modeli Araç Kataloğu'nda bulunamadı" }
  }

  const normalizedType = normalizeVehicleType(line.vehicleType)
  const catalogType = normalizeVehicleType(catalogModel.group.code)
  if (normalizedType !== catalogType && normalizedType !== "OTHER" && catalogType !== "OTHER") {
    return { success: false, error: "Araç tipi seçilen modelin kataloğuyla eşleşmiyor" }
  }

  const identifier = input.identifier?.trim() || null
  const identifierUpdate = line.chassisNumber !== null || line.vin === null
    ? { chassisNumber: identifier }
    : { vin: identifier }

  await prisma.plantLogisticPlanSheetLine.update({
    where: { id: lineId, companyId, planSheetId: sheetId },
    data: {
      customerName,
      country: input.country?.trim() || null,
      vehicleModel: catalogModel.name,
      priority: input.priority,
      requestedDeliveryDate: input.requestedDeliveryDate ? new Date(input.requestedDeliveryDate) : null,
      ...identifierUpdate,
    },
  })
  await logEvent(sheetId, companyId, userId, "ORDER_UPDATED", `Araç satırı ${line.sequence} güncellendi`)
  revalidatePath(`/logistic/plan-sheets/${sheetId}`)
  return { success: true }
}

export async function setLineReviewStatus(
  sheetId: string,
  lineId: string,
  status: PlanSheetLineStatus,
  comment?: string,
): Promise<ActionResult> {
  const { companyId, userId } = await authGate()
  const gate = await workflowGate(companyId, userId, sheetId, "PLAN_SHEET_REVIEW_LINE")
  if (!gate.success) return gate
  if (status !== "CONFIRMED" && status !== "REJECTED") {
    return { success: false, error: "INVALID_LINE_STATUS" }
  }
  const sheet = await loadSheet(sheetId, companyId)
  if (!sheet) return { success: false, error: "Liste bulunamadı" }
  if (!PLAN_SHEET_ALLOWED.approve(sheet.status)) {
    return { success: false, error: "İnceleme aşamasında yapılabilir" }
  }
  const line = sheet.lines.find((l) => l.id === lineId)
  if (!line) return { success: false, error: "Satır bulunamadı" }
  if (line.orderId) return { success: false, error: "Sipariş oluşturulmuş satır değiştirilemez" }
  if (!PLAN_SHEET_LINE_ALLOWED.review(line.status)) {
    return { success: false, error: PLAN_SHEET_LINE_LOCKED }
  }
  const rejectionComment = comment?.trim() ?? ""
  if (status === "REJECTED" && !rejectionComment) {
    return { success: false, error: PLAN_SHEET_REJECTION_COMMENT_REQUIRED }
  }
  if (status === "CONFIRMED" && !hasForecastDispatchDate(line.forecastDispatchDate)) {
    return { success: false, error: PLAN_SHEET_FORECAST_REQUIRED }
  }
  if (status === "CONFIRMED" && !isForecastDispatchDateCurrentOrFuture(line.forecastDispatchDate)) {
    return { success: false, error: PLAN_SHEET_FORECAST_IN_PAST }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const update = await tx.plantLogisticPlanSheetLine.updateMany({
      where: {
        id: lineId,
        companyId,
        planSheetId: sheetId,
        orderId: null,
        status: "SUBMITTED",
        ...(status === "CONFIRMED" ? { forecastDispatchDate: { not: null } } : {}),
      },
      data: { status },
    })
    if (update.count === 0) return false

    const message = status === "REJECTED"
      ? `Satır ${line.sequence} — reddedildi: ${rejectionComment}`
      : `Satır ${line.sequence} — onaylandı`
    await tx.plantLogisticPlanSheetEvent.create({
      data: {
        planSheetId: sheetId,
        companyId,
        actorId: userId,
        eventType: "ORDER_UPDATED",
        message,
      },
    })

    if (status === "REJECTED" && sheet.createdById !== userId) {
      await tx.notification.create({
        data: {
          userId: sheet.createdById,
          companyId,
          type: "REVISION",
          title: `${sheet.planNumber} satır reddi`,
          message: `Satır ${line.sequence} reddedildi: ${rejectionComment}`,
          entityType: "PLAN_SHEET",
          entityId: sheetId,
          link: `/logistic/plan-sheets/${sheetId}`,
        },
      })
    }
    return true
  })
  if (!updated) {
    return {
      success: false,
      error: status === "CONFIRMED" ? PLAN_SHEET_FORECAST_REQUIRED : PLAN_SHEET_LINE_LOCKED,
    }
  }
  revalidatePath(`/logistic/plan-sheets/${sheetId}`)
  return { success: true }
}

export async function approvePlanSheet(sheetId: string): Promise<ActionResult> {
  const { companyId, userId } = await authGate()
  const gate = await workflowGate(companyId, userId, sheetId, "PLAN_SHEET_APPROVE")
  if (!gate.success) return gate
  const sheet = await loadSheet(sheetId, companyId)
  if (!sheet) return { success: false, error: "Liste bulunamadı" }
  if (!PLAN_SHEET_ALLOWED.approve(sheet.status)) {
    return { success: false, error: "İnceleme aşamasında değil, onaylanamaz" }
  }
  if (sheet.lines.some((line) => line.status === "CONFIRMED" && !hasForecastDispatchDate(line.forecastDispatchDate))) {
    return { success: false, error: PLAN_SHEET_FORECAST_REQUIRED }
  }
  if (sheet.lines.some((line) => line.status === "CONFIRMED" && !isForecastDispatchDateCurrentOrFuture(line.forecastDispatchDate))) {
    return { success: false, error: PLAN_SHEET_FORECAST_IN_PAST }
  }
  if (sheet.lines.some((line) => line.status !== "CONFIRMED" && line.status !== "REJECTED")) {
    return { success: false, error: "PLAN_SHEET_LINES_PENDING" }
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

    await createBoardUnitsFromPlanLine({
      companyId,
      userId,
      orderId: order.id,
      orderNumber,
      line,
    })

    await prisma.plantLogisticPlanSheetLine.update({
      where: { id: line.id, companyId, planSheetId: sheet.id },
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
    where: { id: sheetId, companyId },
    data: { status: "APPROVED", approvedAt: now, approvedById: userId },
  })
  await logEvent(
    sheetId,
    companyId,
    userId,
    "ORDER_APPROVED",
    `Onaylandı — ${generated} sipariş oluşturuldu`
  )
  const transition = await transitionWorkflowAction({
    companyId,
    subjectType: "PLAN_SHEET",
    subjectId: sheetId,
    userId,
    actionKey: "PLAN_SHEET_APPROVE",
  })
  if (!transition.success) return transition

  revalidatePath("/logistic/plan-sheets")
  revalidatePath("/logistic/orders")
  revalidatePath("/logistic/board")
  revalidatePath(`/logistic/plan-sheets/${sheetId}`)
  return { success: true, error: undefined }
}

export async function rejectPlanSheet(sheetId: string, reason: string): Promise<ActionResult> {
  const { companyId, userId } = await authGate()
  const gate = await workflowGate(companyId, userId, sheetId, "PLAN_SHEET_REJECT")
  if (!gate.success) return gate
  const sheet = await loadSheet(sheetId, companyId)
  if (!sheet) return { success: false, error: "Liste bulunamadı" }
  if (!PLAN_SHEET_ALLOWED.reject(sheet.status)) {
    return { success: false, error: "Bu durumda reddedilemez" }
  }

  const now = new Date()
  await prisma.plantLogisticPlanSheet.update({
    where: { id: sheetId, companyId },
    data: { status: "REJECTED", rejectedAt: now },
  })
  await logEvent(sheetId, companyId, userId, "ORDER_REJECTED", reason?.trim() || "Reddedildi")
  const transition = await transitionWorkflowAction({
    companyId,
    subjectType: "PLAN_SHEET",
    subjectId: sheetId,
    userId,
    actionKey: "PLAN_SHEET_REJECT",
    resolution: reason,
  })
  if (!transition.success) return transition
  revalidatePath("/logistic/plan-sheets")
  revalidatePath(`/logistic/plan-sheets/${sheetId}`)
  return { success: true }
}

export async function cancelPlanSheet(sheetId: string): Promise<ActionResult> {
  const { companyId, userId } = await authGate()
  const gate = await workflowGate(companyId, userId, sheetId, "PLAN_SHEET_CANCEL")
  if (!gate.success) return gate
  const sheet = await loadSheet(sheetId, companyId)
  if (!sheet) return { success: false, error: "Liste bulunamadı" }
  if (!PLAN_SHEET_ALLOWED.cancel(sheet.status)) {
    return { success: false, error: "Bu durumda iptal edilemez" }
  }

  const now = new Date()
  await prisma.plantLogisticPlanSheet.update({
    where: { id: sheetId, companyId },
    data: { status: "CANCELLED", closedAt: now },
  })
  await logEvent(sheetId, companyId, userId, "ORDER_CANCELLED", "Liste iptal edildi")
  const transition = await transitionWorkflowAction({
    companyId,
    subjectType: "PLAN_SHEET",
    subjectId: sheetId,
    userId,
    actionKey: "PLAN_SHEET_CANCEL",
  })
  if (!transition.success) return transition
  revalidatePath("/logistic/plan-sheets")
  revalidatePath(`/logistic/plan-sheets/${sheetId}`)
  return { success: true }
}
