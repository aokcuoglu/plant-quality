"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { DefectEventType, FieldDefectSeverity, FieldDefectSource, FieldDefectStatus, Prisma } from "@/generated/prisma/client"
import { isValidStatusTransition, validateVin } from "@/lib/field-defect"
import { canOemManage } from "@/lib/field-defect-server"
import { addCalendarDays } from "@/lib/sla"
import { FIELD_DEFECT_PAGE_SIZE } from "@/lib/field-defect-types"
import type { FieldDefectRow } from "@/lib/field-defect-types"
import { getNextEscalationLevel } from "@/lib/escalation"
import { getFieldDefectSlaStatus } from "@/lib/sla-field-defect"

function isOemEditor(role: string) {
  return role === "ADMIN" || role === "QUALITY_ENGINEER"
}

export async function getFieldDefects(
  filter?: string,
  search?: string,
  page?: number,
): Promise<{ fieldDefects: FieldDefectRow[]; totalCount: number }> {
  const session = await auth()
  if (!session) return { fieldDefects: [], totalCount: 0 }

  const isOem = session.user.companyType === "OEM"
  const where: Record<string, unknown> = isOem
    ? { oemId: session.user.companyId, deletedAt: null }
    : { supplierId: session.user.companyId, deletedAt: null }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { vin: { contains: search, mode: "insensitive" } },
      { partNumber: { contains: search, mode: "insensitive" } },
    ]
  }

  const orderBy: Record<string, unknown> = { createdAt: "desc" }

  const defects = await prisma.fieldDefect.findMany({
    where,
    include: {
      supplier: { select: { name: true } },
    },
    orderBy,
  })

  const rows: FieldDefectRow[] = defects.map((d) => ({
    id: d.id,
    title: d.title,
    status: d.status,
    severity: d.severity,
    source: d.source,
    supplierName: d.supplier?.name ?? d.supplierNameSnapshot,
    vin: d.vin,
    vehicleModel: d.vehicleModel,
    partNumber: d.partNumber,
    reportDate: d.reportDate,
    createdAt: d.createdAt,
    linkedDefectId: d.linkedDefectId,
    responseDueAt: d.responseDueAt,
    resolutionDueAt: d.resolutionDueAt,
    escalationLevel: d.escalationLevel,
    category: d.category,
    subcategory: d.subcategory,
    probableArea: d.probableArea,
  }))

  let filtered = rows
  if (filter) {
    const statusFilters: Record<string, FieldDefectStatus[]> = {
      draft: ["DRAFT"],
      open: ["OPEN"],
      "under-review": ["UNDER_REVIEW"],
      "supplier-assigned": ["SUPPLIER_ASSIGNED"],
      "linked-to-8d": ["LINKED_TO_8D"],
      closed: ["CLOSED"],
      cancelled: ["CANCELLED"],
      active: ["OPEN", "UNDER_REVIEW", "SUPPLIER_ASSIGNED"],
    }
    if (statusFilters[filter]) {
      filtered = rows.filter((d) => statusFilters[filter].includes(d.status))
    } else if (filter === "critical") {
      filtered = rows.filter((d) => d.severity === "CRITICAL")
    } else if (filter === "major") {
      filtered = rows.filter((d) => d.severity === "MAJOR")
    } else if (filter === "minor") {
      filtered = rows.filter((d) => d.severity === "MINOR")
    } else if (filter === "overdue") {
      filtered = rows.filter((d) => getFieldDefectSlaStatus(d) === "overdue")
    } else if (filter === "escalated") {
      filtered = rows.filter((d) => d.escalationLevel !== "NONE")
    } else if (filter.startsWith("cat:")) {
      filtered = rows.filter((d) => d.category === filter.slice(4))
    } else if (filter.startsWith("subcat:")) {
      filtered = rows.filter((d) => d.subcategory === filter.slice(7))
    }
  }

  const totalCount = filtered.length
  const currentPage = Math.max(1, page ?? 1)
  const start = (currentPage - 1) * FIELD_DEFECT_PAGE_SIZE
  const paginated = filtered.slice(start, start + FIELD_DEFECT_PAGE_SIZE)

  return { fieldDefects: paginated, totalCount }
}

export async function getFieldDefectById(id: string) {
  const session = await auth()
  if (!session) return null

  const where =
    session.user.companyType === "OEM"
      ? { id, oemId: session.user.companyId, deletedAt: null }
      : { id, supplierId: session.user.companyId, deletedAt: null }

  return prisma.fieldDefect.findFirst({
    where,
    include: {
      oem: { select: { name: true } },
      supplier: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
      updatedBy: { select: { name: true, email: true } },
      convertedBy: { select: { name: true, email: true } },
      linkedDefect: { select: { id: true, partNumber: true, description: true, status: true } },
      attachments: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      comments: { include: { author: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } },
      events: { include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } },
    },
  })
}

export async function getSuppliersForField() {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") return []

  const linkedSupplierIds = await prisma.defect.findMany({
    where: { oemId: session.user.companyId },
    select: { supplierId: true },
    distinct: ["supplierId"],
  })
  const fieldDefectSupplierIds = await prisma.fieldDefect.findMany({
    where: { oemId: session.user.companyId, supplierId: { not: null } },
    select: { supplierId: true },
    distinct: ["supplierId"],
  })
  const ppapSupplierIds = await prisma.ppapSubmission.findMany({
    where: { oemId: session.user.companyId },
    select: { supplierId: true },
    distinct: ["supplierId"],
  })
  const fmeaSupplierIds = await prisma.fmea.findMany({
    where: { oemId: session.user.companyId },
    select: { supplierId: true },
    distinct: ["supplierId"],
  })
  const iqcSupplierIds = await prisma.iqcReport.findMany({
    where: { oemId: session.user.companyId },
    select: { supplierId: true },
    distinct: ["supplierId"],
  })

  const supplierIds = new Set([
    ...linkedSupplierIds.map((d) => d.supplierId),
    ...fieldDefectSupplierIds.map((d) => d.supplierId!).filter(Boolean),
    ...ppapSupplierIds.map((d) => d.supplierId),
    ...fmeaSupplierIds.map((d) => d.supplierId),
    ...iqcSupplierIds.map((d) => d.supplierId),
  ])

  return prisma.company.findMany({
    where: { id: { in: Array.from(supplierIds) }, type: "SUPPLIER" },
    select: {
      id: true,
      name: true,
      users: { select: { id: true, name: true, email: true }, orderBy: { name: "asc" } },
    },
    orderBy: { name: "asc" },
  })
}

async function logFieldDefectEvent(
  fieldDefectId: string,
  type: string,
  actorId: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.fieldDefectEvent.create({
    data: {
      fieldDefectId,
      type: type as DefectEventType,
      actorId,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  })
}

export async function createFieldDefect(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!canOemManage(session)) return { success: false, error: "Unauthorized" }

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const source = (formData.get("source") as FieldDefectSource) || "FIELD"
  const severity = (formData.get("severity") as FieldDefectSeverity) || "MAJOR"
  const safetyImpact = formData.get("safetyImpact") === "on"
  const vehicleDown = formData.get("vehicleDown") === "on"
  const repeatIssue = formData.get("repeatIssue") === "on"
  const vin = (formData.get("vin") as string) || null
  const vehicleModel = (formData.get("vehicleModel") as string) || null
  const vehicleVariant = (formData.get("vehicleVariant") as string) || null
  const mileage = formData.get("mileage") ? parseInt(formData.get("mileage") as string) : null
  const failureDate = formData.get("failureDate") ? new Date(formData.get("failureDate") as string) : null
  const reportDate = formData.get("reportDate") ? new Date(formData.get("reportDate") as string) : new Date()
  const location = (formData.get("location") as string) || null
  const partNumber = (formData.get("partNumber") as string) || null
  const partName = (formData.get("partName") as string) || null
  const supplierId = (formData.get("supplierId") as string) || null
  const statusValue = formData.get("_status") as string | null

  if (!title || !description) return { success: false, error: "Title and description are required" }

  if (vin) {
    const vinResult = validateVin(vin)
    if (!vinResult.ok) return { success: false, error: vinResult.error }
  }

  if (mileage !== null && (isNaN(mileage) || mileage < 0)) {
    return { success: false, error: "Mileage must be a positive number" }
  }

  const fieldStatus: FieldDefectStatus = statusValue === "OPEN" ? "OPEN" : "DRAFT"

  let supplierName: string | null = null
  let supplierUsers: { id: string }[] = []
  if (supplierId) {
    const supplier = await prisma.company.findFirst({
      where: { id: supplierId, type: "SUPPLIER" },
      include: { users: { select: { id: true } } },
    })
    if (!supplier) return { success: false, error: "Invalid supplier" }
    supplierName = supplier.name
    supplierUsers = supplier.users
  }

  const fieldDefect = await prisma.fieldDefect.create({
    data: {
      oemId: session.user.companyId,
      createdById: session.user.id,
      title,
      description,
      source,
      severity,
      safetyImpact,
      vehicleDown,
      repeatIssue,
      vin,
      vehicleModel,
      vehicleVariant,
      mileage,
      failureDate,
      reportDate,
      location,
      partNumber,
      partName,
      supplierId,
      supplierNameSnapshot: supplierName,
      status: fieldStatus,
    },
  })

  await logFieldDefectEvent(fieldDefect.id, "FIELD_DEFECT_CREATED", session.user.id, {
    title,
    severity,
    source,
    status: fieldStatus,
    supplierId,
  })

  if (supplierId && supplierUsers.length > 0) {
    await prisma.notification.createMany({
      data: supplierUsers.map((user) => ({
        userId: user.id,
        companyId: supplierId,
        message: `New field defect assigned: ${title}`,
        type: "FIELD_DEFECT_ASSIGNED" as const,
        link: `/quality/supplier/field/${fieldDefect.id}`,
        isRead: false,
      })),
    })
  }

  revalidatePath("/quality/oem/field")
  revalidatePath("/quality/supplier/field")
  revalidatePath("/quality/oem")
  redirect("/quality/oem/field")
}

export async function updateFieldDefect(id: string, formData: FormData) {
  const session = await auth()
  if (!canOemManage(session)) {
    return { success: false as const, error: "Unauthorized" }
  }

  const fieldDefect = await prisma.fieldDefect.findFirst({
    where: { id, oemId: session.user.companyId, deletedAt: null },
  })
  if (!fieldDefect) {
    return { success: false as const, error: "Field defect not found" }
  }

  const editableStatuses: FieldDefectStatus[] = ["DRAFT", "OPEN", "UNDER_REVIEW", "SUPPLIER_ASSIGNED"]
  if (!editableStatuses.includes(fieldDefect.status)) {
    return { success: false as const, error: "Cannot edit field defect in current status" }
  }

  const title = formData.get("title") as string | null
  const description = formData.get("description") as string | null
  const source = formData.get("source") as FieldDefectSource | null
  const severity = formData.get("severity") as FieldDefectSeverity | null
  const safetyImpact = formData.get("safetyImpact") as string | null
  const vehicleDown = formData.get("vehicleDown") as string | null
  const repeatIssue = formData.get("repeatIssue") as string | null
  const vin = formData.get("vin") as string | null
  const vehicleModel = formData.get("vehicleModel") as string | null
  const vehicleVariant = formData.get("vehicleVariant") as string | null
  const mileage = formData.get("mileage") as string | null
  const failureDate = formData.get("failureDate") as string | null
  const location = formData.get("location") as string | null
  const partNumber = formData.get("partNumber") as string | null
  const partName = formData.get("partName") as string | null
  const category = formData.get("category") as string | null
  const subcategory = formData.get("subcategory") as string | null
  const probableArea = formData.get("probableArea") as string | null

  if (vin) {
    const vinResult = validateVin(vin)
    if (!vinResult.ok) {
      return { success: false as const, error: vinResult.error }
    }
  }

  const data: Record<string, unknown> = { updatedById: session.user.id }
  if (title !== null) data.title = title
  if (description !== null) data.description = description
  if (source !== null) data.source = source
  if (severity !== null) data.severity = severity
  if (safetyImpact !== null) data.safetyImpact = safetyImpact === "on"
  if (vehicleDown !== null) data.vehicleDown = vehicleDown === "on"
  if (repeatIssue !== null) data.repeatIssue = repeatIssue === "on"
  if (vin !== null) data.vin = vin || null
  if (vehicleModel !== null) data.vehicleModel = vehicleModel || null
  if (vehicleVariant !== null) data.vehicleVariant = vehicleVariant || null
  if (mileage !== null) data.mileage = mileage ? parseInt(mileage) : null
  if (failureDate !== null) data.failureDate = failureDate ? new Date(failureDate) : null
  if (location !== null) data.location = location || null
  if (partNumber !== null) data.partNumber = partNumber || null
  if (partName !== null) data.partName = partName || null
  if (category !== null) data.category = category || null
  if (subcategory !== null) data.subcategory = subcategory || null
  if (probableArea !== null) data.probableArea = probableArea || null

  await prisma.fieldDefect.update({
    where: { id, oemId: session.user.companyId },
    data,
  })

  await logFieldDefectEvent(id, "FIELD_DEFECT_STATUS_CHANGED", session.user.id, {
    action: "updated",
    updatedFields: Object.keys(data).filter((k) => k !== "updatedById"),
  })

  revalidatePath(`/quality/oem/field/${id}`)
  revalidatePath("/quality/oem/field")
  revalidatePath(`/quality/supplier/field/${id}`)
  revalidatePath("/quality/supplier/field")
  revalidatePath("/quality/oem/quality-intelligence")

  return { success: true as const }
}

export async function assignSupplier(id: string, supplierId: string | null) {
  const session = await auth()
  if (!canOemManage(session)) {
    return { success: false as const, error: "Unauthorized" }
  }

  const fieldDefect = await prisma.fieldDefect.findFirst({
    where: { id, oemId: session.user.companyId, deletedAt: null },
  })
  if (!fieldDefect) {
    return { success: false as const, error: "Field defect not found" }
  }

  const assignableStatuses: FieldDefectStatus[] = ["DRAFT", "OPEN", "UNDER_REVIEW", "SUPPLIER_ASSIGNED"]
  if (!assignableStatuses.includes(fieldDefect.status)) {
    return { success: false as const, error: "Cannot change supplier in current status" }
  }

  if (!supplierId && !assignableStatuses.slice(0, 3).includes(fieldDefect.status)) {
    return { success: false as const, error: "Cannot unassign supplier in current status" }
  }

  let supplierName: string | null = null
  if (supplierId) {
    const supplier = await prisma.company.findFirst({
      where: { id: supplierId, type: "SUPPLIER" },
      select: { name: true },
    })
    if (!supplier) {
      return { success: false as const, error: "Invalid supplier" }
    }
    supplierName = supplier.name
  }

  const updateData: Record<string, unknown> = {
    supplierId,
    supplierNameSnapshot: supplierName,
    updatedById: session.user.id,
  }

  if (supplierId && fieldDefect.status === "DRAFT") {
    updateData.status = "OPEN"
  }
  if (supplierId && (fieldDefect.status === "OPEN" || fieldDefect.status === "UNDER_REVIEW")) {
    updateData.status = "SUPPLIER_ASSIGNED"
  }

  await prisma.fieldDefect.update({
    where: { id, oemId: session.user.companyId },
    data: updateData,
  })

  await logFieldDefectEvent(id, "FIELD_DEFECT_SUPPLIER_ASSIGNED", session.user.id, {
    previousSupplierId: fieldDefect.supplierId,
    newSupplierId: supplierId,
    newStatus: updateData.status ?? fieldDefect.status,
  })

  if (supplierId) {
    const supplier = await prisma.company.findFirst({
      where: { id: supplierId },
      include: { users: { select: { id: true } } },
    })
    if (supplier && supplier.users.length > 0) {
      await prisma.notification.createMany({
        data: supplier.users.map((user) => ({
          userId: user.id,
          companyId: supplierId,
          message: `Field defect assigned to your company: ${fieldDefect.title}`,
          type: "FIELD_DEFECT_ASSIGNED" as const,
          link: `/quality/supplier/field/${id}`,
          isRead: false,
        })),
      })
    }
  }

  revalidatePath(`/quality/oem/field/${id}`)
  revalidatePath("/quality/oem/field")
  revalidatePath(`/quality/supplier/field/${id}`)
  revalidatePath("/quality/supplier/field")

  return { success: true as const }
}

export async function changeFieldDefectStatus(id: string, newStatus: FieldDefectStatus) {
  const session = await auth()
  if (!canOemManage(session)) {
    return { success: false as const, error: "Unauthorized" }
  }

  const fieldDefect = await prisma.fieldDefect.findFirst({
    where: { id, oemId: session.user.companyId, deletedAt: null },
  })
  if (!fieldDefect) {
    return { success: false as const, error: "Field defect not found" }
  }

  if (!isValidStatusTransition(fieldDefect.status, newStatus)) {
    return { success: false as const, error: `Cannot transition from ${fieldDefect.status} to ${newStatus}` }
  }

  if (newStatus === "LINKED_TO_8D") {
    return { success: false as const, error: "Use the convert-to-8D action to link to 8D" }
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updatedById: session.user.id,
  }

  if (newStatus === "CLOSED") {
    updateData.closedAt = new Date()
  }

  await prisma.fieldDefect.update({
    where: { id, oemId: session.user.companyId },
    data: updateData,
  })

  const eventType = newStatus === "CLOSED"
    ? "FIELD_DEFECT_CLOSED"
    : newStatus === "CANCELLED"
      ? "FIELD_DEFECT_CANCELLED"
      : "FIELD_DEFECT_STATUS_CHANGED"

  await logFieldDefectEvent(id, eventType, session.user.id, {
    previousStatus: fieldDefect.status,
    newStatus,
  })

  revalidatePath(`/quality/oem/field/${id}`)
  revalidatePath("/quality/oem/field")
  revalidatePath(`/quality/supplier/field/${id}`)
  revalidatePath("/quality/supplier/field")

  return { success: true as const }
}

export async function convertTo8D(id: string) {
  const session = await auth()
  if (!canOemManage(session)) {
    return { success: false as const, error: "Unauthorized" }
  }

  const fieldDefect = await prisma.fieldDefect.findFirst({
    where: { id, oemId: session.user.companyId, deletedAt: null },
  })
  if (!fieldDefect) {
    return { success: false as const, error: "Field defect not found" }
  }

  if (fieldDefect.linkedDefectId) {
    return { success: false as const, error: "This field defect is already linked to an 8D report" }
  }

  if (!fieldDefect.supplierId) {
    return { success: false as const, error: "A supplier must be assigned before converting to 8D" }
  }

  const convertibleStatuses: FieldDefectStatus[] = ["OPEN", "UNDER_REVIEW", "SUPPLIER_ASSIGNED"]
  if (!convertibleStatuses.includes(fieldDefect.status)) {
    return { success: false as const, error: "Cannot convert field defect in current status" }
  }

  const defect = await prisma.defect.create({
    data: {
      oemId: fieldDefect.oemId,
      supplierId: fieldDefect.supplierId,
      partNumber: fieldDefect.partNumber || "Unspecified",
      description: `[Field Defect] ${fieldDefect.title}\n\n${fieldDefect.description}${fieldDefect.vin ? `\n\nVIN: ${fieldDefect.vin}` : ""}${fieldDefect.vehicleModel ? `\nVehicle: ${fieldDefect.vehicleModel}${fieldDefect.vehicleVariant ? ` ${fieldDefect.vehicleVariant}` : ""}` : ""}${fieldDefect.mileage ? `\nMileage: ${fieldDefect.mileage} km` : ""}${fieldDefect.location ? `\nLocation: ${fieldDefect.location}` : ""}${fieldDefect.safetyImpact ? "\n\n⚠️ Safety Impact" : ""}${fieldDefect.vehicleDown ? "\n🚫 Vehicle Down" : ""}${fieldDefect.repeatIssue ? "\n🔁 Repeat Issue" : ""}`,
      status: "OPEN",
      oemOwnerId: session.user.id,
      currentActionOwner: "SUPPLIER",
      supplierResponseDueAt: addCalendarDays(new Date(), 7),
    },
  })

  await prisma.eightDReport.create({
    data: {
      defectId: defect.id,
      d2_problem: fieldDefect.description,
    },
  })

  await prisma.fieldDefect.update({
    where: { id, oemId: session.user.companyId },
    data: {
      status: "LINKED_TO_8D",
      linkedDefectId: defect.id,
      convertedTo8DAt: new Date(),
      convertedById: session.user.id,
      updatedById: session.user.id,
    },
  })

  await logFieldDefectEvent(id, "FIELD_DEFECT_CONVERTED_TO_8D", session.user.id, {
    defectId: defect.id,
    supplierId: fieldDefect.supplierId,
  })

  await prisma.defectEvent.create({
    data: {
      defectId: defect.id,
      type: "CREATED",
      actorId: session.user.id,
      metadata: {
        source: "field_defect_conversion",
        fieldDefectId: id,
        fieldDefectTitle: fieldDefect.title,
      },
    },
  })

  const supplier = await prisma.company.findFirst({
    where: { id: fieldDefect.supplierId },
    include: { users: { select: { id: true } } },
  })
  if (supplier && supplier.users.length > 0) {
    await prisma.notification.createMany({
      data: supplier.users.map((user) => ({
        userId: user.id,
        companyId: fieldDefect.supplierId,
        message: `8D report created from field defect: ${fieldDefect.title}`,
        type: "FIELD_DEFECT_CONVERTED_TO_8D" as const,
        link: `/quality/supplier/defects/${defect.id}`,
        isRead: false,
      })),
    })
  }

  revalidatePath(`/quality/oem/field/${id}`)
  revalidatePath("/quality/oem/field")
  revalidatePath(`/quality/oem/defects/${defect.id}`)
  revalidatePath("/quality/oem/defects")
  revalidatePath(`/quality/supplier/defects/${defect.id}`)
  revalidatePath("/quality/supplier/defects")
  revalidatePath("/quality/oem")
  revalidatePath("/quality/supplier")

  return { success: true as const, defectId: defect.id }
}

export async function addFieldDefectComment(id: string, content: string) {
  const session = await auth()
  if (!session) return { success: false as const, error: "Unauthorized" }
  if (!content.trim()) return { success: false as const, error: "Comment is required" }

  const isOem = session.user.companyType === "OEM"
  const isSupplier = session.user.companyType === "SUPPLIER"
  const canWrite = isOem
    ? isOemEditor(session.user.role)
    : isSupplier && ["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)

  if (!canWrite) {
    return { success: false as const, error: "Unauthorized" }
  }

  const where = isOem
    ? { id, oemId: session.user.companyId, deletedAt: null }
    : { id, supplierId: session.user.companyId, deletedAt: null }

  const fieldDefect = await prisma.fieldDefect.findFirst({ where })
  if (!fieldDefect) {
    return { success: false as const, error: "Field defect not found" }
  }

  await prisma.fieldDefectComment.create({
    data: {
      fieldDefectId: id,
      authorId: session.user.id,
      content: content.trim(),
    },
  })

  await logFieldDefectEvent(id, "FIELD_DEFECT_COMMENT_ADDED", session.user.id, {
    commentLength: content.trim().length,
  })

  const rebasePath = isOem ? `/quality/oem/field/${id}` : `/quality/supplier/field/${id}`
  revalidatePath(rebasePath)
  revalidatePath(isOem ? "/quality/oem/field" : "/quality/supplier/field")

  return { success: true as const }
}

export async function softDeleteAttachment(attachmentId: string, fieldDefectId: string) {
  const session = await auth()
  if (!canOemManage(session)) {
    return { success: false as const, error: "Unauthorized" }
  }

  const fieldDefect = await prisma.fieldDefect.findFirst({
    where: { id: fieldDefectId, oemId: session.user.companyId, deletedAt: null },
  })
  if (!fieldDefect) {
    return { success: false as const, error: "Field defect not found" }
  }

  const attachment = await prisma.fieldDefectAttachment.findFirst({
    where: { id: attachmentId, fieldDefectId },
  })
  if (!attachment) {
    return { success: false as const, error: "Attachment not found" }
  }

  await prisma.fieldDefectAttachment.update({
    where: { id: attachmentId },
    data: { deletedAt: new Date() },
  })

  await logFieldDefectEvent(fieldDefectId, "FIELD_DEFECT_ATTACHMENT_REMOVED", session.user.id, {
    fileName: attachment.fileName,
  })

  revalidatePath(`/quality/oem/field/${fieldDefectId}`)
  revalidatePath(`/quality/oem/field/${fieldDefectId}/media`)

  return { success: true as const }
}

export async function setFieldDefectSla(
  id: string,
  data: { responseDueAt?: string | null; resolutionDueAt?: string | null },
) {
  const session = await auth()
  if (!canOemManage(session)) {
    return { success: false as const, error: "Unauthorized" }
  }

  const fieldDefect = await prisma.fieldDefect.findFirst({
    where: { id, oemId: session.user.companyId, deletedAt: null },
  })
  if (!fieldDefect) {
    return { success: false as const, error: "Field defect not found" }
  }

  const closedStatuses: FieldDefectStatus[] = ["CLOSED", "CANCELLED", "LINKED_TO_8D"]
  if (closedStatuses.includes(fieldDefect.status)) {
    return { success: false as const, error: "Cannot set SLA on a closed or linked field defect" }
  }

  const updateData: Record<string, unknown> = { updatedById: session.user.id }
  if (data.responseDueAt !== undefined) {
    updateData.responseDueAt = data.responseDueAt ? new Date(data.responseDueAt) : null
  }
  if (data.resolutionDueAt !== undefined) {
    updateData.resolutionDueAt = data.resolutionDueAt ? new Date(data.resolutionDueAt) : null
  }

  await prisma.fieldDefect.update({
    where: { id, oemId: session.user.companyId },
    data: updateData,
  })

  await logFieldDefectEvent(id, "FIELD_DEFECT_SLA_UPDATED", session.user.id, {
    responseDueAt: data.responseDueAt ?? null,
    resolutionDueAt: data.resolutionDueAt ?? null,
  })

  revalidatePath(`/quality/oem/field/${id}`)
  revalidatePath("/quality/oem/field")
  revalidatePath(`/quality/supplier/field/${id}`)
  revalidatePath("/quality/supplier/field")

  return { success: true as const }
}

export async function escalateFieldDefect(id: string, reason: string) {
  const session = await auth()
  if (!canOemManage(session)) {
    return { success: false as const, error: "Unauthorized" }
  }

  if (!reason.trim()) {
    return { success: false as const, error: "Escalation reason is required" }
  }

  const fieldDefect = await prisma.fieldDefect.findFirst({
    where: { id, oemId: session.user.companyId, deletedAt: null },
  })
  if (!fieldDefect) {
    return { success: false as const, error: "Field defect not found" }
  }

  const nextLevel = getNextEscalationLevel(fieldDefect.escalationLevel)
  if (!nextLevel) {
    return { success: false as const, error: "Field defect is already at maximum escalation level" }
  }

  const closedStatuses: FieldDefectStatus[] = ["CLOSED", "CANCELLED", "DRAFT", "LINKED_TO_8D"]
  if (closedStatuses.includes(fieldDefect.status)) {
    return { success: false as const, error: "Cannot escalate a field defect in this status" }
  }

  await prisma.fieldDefect.update({
    where: { id, oemId: session.user.companyId },
    data: {
      escalationLevel: nextLevel,
      escalatedAt: new Date(),
      escalatedById: session.user.id,
      escalationReason: reason.trim(),
      updatedById: session.user.id,
    },
  })

  await prisma.escalationHistory.create({
    data: {
      companyId: session.user.companyId,
      entityType: "FIELD_DEFECT",
      entityId: id,
      previousLevel: fieldDefect.escalationLevel,
      newLevel: nextLevel,
      reason: reason.trim(),
      createdById: session.user.id,
    },
  })

  await logFieldDefectEvent(id, "FIELD_DEFECT_ESCALATED", session.user.id, {
    previousLevel: fieldDefect.escalationLevel,
    newLevel: nextLevel,
    reason: reason.trim(),
  })

  if (fieldDefect.supplierId) {
    const supplier = await prisma.company.findFirst({
      where: { id: fieldDefect.supplierId },
      include: { users: { select: { id: true } } },
    })
    if (supplier && supplier.users.length > 0) {
      await prisma.notification.createMany({
        data: supplier.users.map((user) => ({
          userId: user.id,
          companyId: fieldDefect.supplierId,
          type: "FIELD_DEFECT_ESCALATED" as const,
          title: `Escalated to ${nextLevel.replace("_", " ")}`,
          message: `Field defect "${fieldDefect.title}" has been escalated: ${reason.trim()}`,
          entityType: "FIELD_DEFECT",
          entityId: id,
          link: `/quality/supplier/field/${id}`,
          isRead: false,
        })),
      })
    }
  }

  const oemUsers = await prisma.user.findMany({
    where: { companyId: session.user.companyId, role: { in: ["ADMIN", "QUALITY_ENGINEER"] } },
    select: { id: true },
  })
  if (oemUsers.length > 0) {
    await prisma.notification.createMany({
      data: oemUsers
        .filter((u) => u.id !== session.user.id)
        .map((user) => ({
          userId: user.id,
          companyId: session.user.companyId,
          type: "FIELD_DEFECT_ESCALATED" as const,
          title: `Escalated to ${nextLevel.replace("_", " ")}`,
          message: `Field defect "${fieldDefect.title}" has been escalated by ${session.user.name ?? "a user"}: ${reason.trim()}`,
          entityType: "FIELD_DEFECT",
          entityId: id,
          link: `/quality/oem/field/${id}`,
          isRead: false,
        })),
    })
  }

  revalidatePath(`/quality/oem/field/${id}`)
  revalidatePath("/quality/oem/field")
  revalidatePath(`/quality/supplier/field/${id}`)
  revalidatePath("/quality/supplier/field")

  return { success: true as const }
}

export async function updateFieldDefectCategories(
  id: string,
  data: { category?: string | null; subcategory?: string | null; probableArea?: string | null },
) {
  const session = await auth()
  if (!canOemManage(session)) {
    return { success: false as const, error: "Unauthorized" }
  }

  const fieldDefect = await prisma.fieldDefect.findFirst({
    where: { id, oemId: session.user.companyId, deletedAt: null },
  })
  if (!fieldDefect) {
    return { success: false as const, error: "Field defect not found" }
  }

  const updateData: Record<string, unknown> = { updatedById: session.user.id }
  if (data.category !== undefined) updateData.category = data.category || null
  if (data.subcategory !== undefined) updateData.subcategory = data.subcategory || null
  if (data.probableArea !== undefined) updateData.probableArea = data.probableArea || null

  await prisma.fieldDefect.update({
    where: { id, oemId: session.user.companyId },
    data: updateData,
  })

  await logFieldDefectEvent(id, "FIELD_DEFECT_STATUS_CHANGED", session.user.id, {
    action: "category_updated",
    category: data.category ?? fieldDefect.category,
    subcategory: data.subcategory ?? fieldDefect.subcategory,
    probableArea: data.probableArea ?? fieldDefect.probableArea,
  })

  revalidatePath(`/quality/oem/field/${id}`)
  revalidatePath("/quality/oem/field")
  revalidatePath("/quality/oem/quality-intelligence")

  return { success: true as const }
}