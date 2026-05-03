"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireFeature } from "@/lib/billing"
import { revalidatePath } from "next/cache"
import { canManageIqc, generateIqcInspectionNumber, IQC_DEFAULT_CHECKLIST, isNegativeResult, IQC_INSPECTION_TYPE_LABELS } from "@/lib/iqc"
import type { IqcResult, IqcInspectionType, IqcChecklistResult, IqcStatus } from "@/generated/prisma/client"

export async function createIqcInspection(formData: FormData) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (session.user.companyType !== "OEM") return { success: false, error: "Only OEM users can create IQC inspections" }
  if (!canManageIqc(session)) return { success: false, error: "Insufficient role" }

  const featureGate = requireFeature(session, "IQC")
  if (!featureGate.allowed) return { success: false, error: featureGate.reason ?? "IQC requires a higher plan" }

  const supplierId = formData.get("supplierId") as string
  const partNumber = formData.get("partNumber") as string
  const partName = (formData.get("partName") as string) || null
  const purchaseOrder = (formData.get("purchaseOrder") as string) || null
  const deliveryNote = (formData.get("deliveryNote") as string) || null
  const lotNumber = (formData.get("lotNumber") as string) || null
  const batchNumber = (formData.get("batchNumber") as string) || null
  const quantityReceived = parseInt(formData.get("quantityReceived") as string) || 0
  const inspectionQuantity = parseInt(formData.get("inspectionQuantity") as string) || 0
  const vehicleModel = (formData.get("vehicleModel") as string) || null
  const projectName = (formData.get("projectName") as string) || null
  const inspectorId = (formData.get("inspectorId") as string) || session.user.id
  const inspectionDateStr = formData.get("inspectionDate") as string | null
  const inspectionType = (formData.get("inspectionType") as IqcInspectionType) || "RECEIVING_INSPECTION"
  const samplingPlan = (formData.get("samplingPlan") as string) || null
  const notes = (formData.get("notes") as string) || null

  if (!supplierId || !partNumber || quantityReceived <= 0) {
    return { success: false, error: "Supplier, part number, and quantity received are required" }
  }

  const supplier = await prisma.company.findFirst({
    where: { id: supplierId, type: "SUPPLIER" },
    include: { users: { select: { id: true } } },
  })
  if (!supplier) return { success: false, error: "Invalid supplier" }

  const inspectionNumber = generateIqcInspectionNumber()

  const inspection = await prisma.iqcReport.create({
    data: {
      inspectionNumber,
      partNumber,
      partName,
      purchaseOrder,
      deliveryNote,
      lotNumber,
      batchNumber,
      quantityReceived,
      inspectionQuantity,
      vehicleModel,
      projectName,
      oemId: session.user.companyId,
      supplierId,
      inspectorId,
      inspectionDate: inspectionDateStr ? new Date(inspectionDateStr) : new Date(),
      inspectionType,
      samplingPlan,
      status: "PLANNED",
      notes,
      createdById: session.user.id,
    },
  })

  const checklistData = IQC_DEFAULT_CHECKLIST.map((item) => ({
    iqcInspectionId: inspection.id,
    itemName: item.itemName,
    requirement: item.requirement,
    result: "PENDING" as IqcChecklistResult,
  }))
  await prisma.iqcChecklistItem.createMany({ data: checklistData })

  await prisma.iqcEvent.create({
    data: {
      reportId: inspection.id,
      type: "IQC_CREATED",
      actorId: session.user.id,
      metadata: { inspectionNumber, partNumber, supplierId, inspectionType },
    },
  })

  if (supplier.users.length > 0) {
    await prisma.notification.createMany({
      data: supplier.users.map((user) => ({
        userId: user.id,
        companyId: supplierId,
        message: `New IQC inspection: ${inspectionNumber} — ${partNumber}`,
        type: "INFO",
        link: `/quality/supplier/iqc/${inspection.id}`,
        isRead: false,
      })),
    })
  }

  revalidatePath("/quality/oem/iqc")
  revalidatePath("/quality/supplier/iqc")
  revalidatePath("/quality/oem")
  revalidatePath("/quality/supplier")

  return { success: true, inspectionId: inspection.id, inspectionNumber }
}

export async function updateIqcChecklistItem(
  itemId: string,
  data: { result?: IqcChecklistResult; measuredValue?: string; comment?: string }
) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (session.user.companyType !== "OEM") return { success: false, error: "Only OEM users can edit checklist items" }
  if (!canManageIqc(session)) return { success: false, error: "Insufficient role" }

  const featureGate = requireFeature(session, "IQC")
  if (!featureGate.allowed) return { success: false, error: featureGate.reason ?? "IQC requires a higher plan" }

  const item = await prisma.iqcChecklistItem.findUnique({
    where: { id: itemId },
    include: { iqcInspection: { select: { id: true, oemId: true, status: true } } },
  })
  if (!item) return { success: false, error: "Checklist item not found" }
  if (item.iqcInspection.oemId !== session.user.companyId) return { success: false, error: "Unauthorized" }
  if (!["PLANNED", "IN_PROGRESS"].includes(item.iqcInspection.status)) {
    return { success: false, error: "Cannot edit checklist items on a completed or cancelled inspection" }
  }

  const validResults: IqcChecklistResult[] = ["PENDING", "OK", "NOK", "NA"]
  if (data.result && !validResults.includes(data.result)) {
    return { success: false, error: "Invalid result value" }
  }

  const updateData: { result?: IqcChecklistResult; measuredValue?: string | null; comment?: string | null } = {}
  if (data.result) updateData.result = data.result
  if (data.measuredValue !== undefined) updateData.measuredValue = data.measuredValue?.trim() || null
  if (data.comment !== undefined) updateData.comment = data.comment?.trim() || null

  await prisma.iqcChecklistItem.update({
    where: { id: itemId },
    data: updateData,
  })

  if (item.iqcInspection.status === "PLANNED") {
    await prisma.iqcReport.update({
      where: { id: item.iqcInspection.id },
      data: { status: "IN_PROGRESS" as IqcStatus },
    })
  }

  await prisma.iqcEvent.create({
    data: {
      reportId: item.iqcInspection.id,
      type: "IQC_CHECKLIST_UPDATED",
      actorId: session.user.id,
      metadata: { itemId: item.id, itemName: item.itemName, result: data.result, measuredValue: data.measuredValue },
    },
  })

  revalidatePath(`/quality/oem/iqc/${item.iqcInspection.id}`)
  revalidatePath("/quality/oem/iqc")
  revalidatePath(`/quality/supplier/iqc/${item.iqcInspection.id}`)
  revalidatePath("/quality/supplier/iqc")
  revalidatePath("/quality/oem")
  revalidatePath("/quality/supplier")

  return { success: true }
}

const VALID_IQC_RESULTS: IqcResult[] = ["ACCEPTED", "CONDITIONAL_ACCEPTED", "REJECTED", "ON_HOLD", "REWORK_REQUIRED", "SORTING_REQUIRED"]

export async function completeIqcInspection(
  inspectionId: string,
  result: IqcResult,
  quantityAccepted: number,
  quantityRejected: number,
  dispositionNotes?: string
) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (session.user.companyType !== "OEM") return { success: false, error: "Only OEM users can complete inspections" }
  if (!canManageIqc(session)) return { success: false, error: "Insufficient role" }

  const featureGate = requireFeature(session, "IQC")
  if (!featureGate.allowed) return { success: false, error: featureGate.reason ?? "IQC requires a higher plan" }

  if (!VALID_IQC_RESULTS.includes(result)) {
    return { success: false, error: "Invalid result value" }
  }

  if (quantityAccepted < 0 || quantityRejected < 0) {
    return { success: false, error: "Quantities must be non-negative" }
  }

  const inspection = await prisma.iqcReport.findFirst({
    where: { id: inspectionId, oemId: session.user.companyId, status: { in: ["PLANNED", "IN_PROGRESS"] } },
    include: { supplier: { include: { users: { select: { id: true } } } } },
  })
  if (!inspection) return { success: false, error: "IQC inspection not found or not in a completable status" }

  const checklistItems = await prisma.iqcChecklistItem.findMany({
    where: { iqcInspectionId: inspectionId },
  })
  const anyNok = checklistItems.some((item) => item.result === "NOK")
  if (anyNok && result === "ACCEPTED") {
    return { success: false, error: "Cannot accept inspection with NOK checklist items" }
  }

  const now = new Date()
  await prisma.iqcReport.update({
    where: { id: inspectionId },
    data: {
      status: "COMPLETED",
      result,
      quantityAccepted,
      quantityRejected,
      dispositionNotes: dispositionNotes ?? null,
      completedAt: now,
      completedById: session.user.id,
    },
  })

  const eventType = isNegativeResult(result) ? "IQC_FAILED" : "IQC_COMPLETED"
  const resultLabel = (IQC_INSPECTION_TYPE_LABELS as Record<string, string>)[inspection.inspectionType] ?? inspection.inspectionType

  await prisma.iqcEvent.create({
    data: {
      reportId: inspectionId,
      type: eventType,
      actorId: session.user.id,
      metadata: { inspectionNumber: inspection.inspectionNumber, result, quantityAccepted, quantityRejected, inspectionType: resultLabel },
    },
  })

  if (inspection.supplier.users.length > 0) {
    const notifType = isNegativeResult(result) ? "IQC_FAILED" : "IQC_COMPLETED_FOR_SUPPLIER"
    await prisma.notification.createMany({
      data: inspection.supplier.users.map((user) => ({
        userId: user.id,
        companyId: inspection.supplierId,
        message: `IQC ${inspection.inspectionNumber} — ${result.replace(/_/g, " ")} (${quantityAccepted}/${inspection.quantityReceived} accepted)`,
        type: notifType,
        link: `/quality/supplier/iqc/${inspectionId}`,
        isRead: false,
      })),
    })
  }

  revalidatePath(`/quality/oem/iqc/${inspectionId}`)
  revalidatePath("/quality/oem/iqc")
  revalidatePath(`/quality/supplier/iqc/${inspectionId}`)
  revalidatePath("/quality/supplier/iqc")
  revalidatePath("/quality/oem")
  revalidatePath("/quality/supplier")

  return { success: true }
}

export async function cancelIqcInspection(inspectionId: string) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (session.user.companyType !== "OEM") return { success: false, error: "Only OEM users can cancel inspections" }
  if (!canManageIqc(session)) return { success: false, error: "Insufficient role" }

  const featureGate = requireFeature(session, "IQC")
  if (!featureGate.allowed) return { success: false, error: featureGate.reason ?? "IQC requires a higher plan" }

  const inspection = await prisma.iqcReport.findFirst({
    where: { id: inspectionId, oemId: session.user.companyId, status: { in: ["PLANNED", "IN_PROGRESS"] } },
    include: { supplier: { include: { users: { select: { id: true } } } } },
  })
  if (!inspection) return { success: false, error: "IQC inspection not found or cannot be cancelled" }

  await prisma.iqcReport.update({
    where: { id: inspectionId },
    data: { status: "CANCELLED" as IqcStatus },
  })

  await prisma.iqcEvent.create({
    data: {
      reportId: inspectionId,
      type: "IQC_CANCELLED",
      actorId: session.user.id,
      metadata: { inspectionNumber: inspection.inspectionNumber },
    },
  })

  if (inspection.supplier.users.length > 0) {
    await prisma.notification.createMany({
      data: inspection.supplier.users.map((user) => ({
        userId: user.id,
        companyId: inspection.supplierId,
        message: `IQC ${inspection.inspectionNumber} (${inspection.partNumber}) cancelled by OEM`,
        type: "INFO",
        link: `/quality/supplier/iqc/${inspectionId}`,
        isRead: false,
      })),
    })
  }

  revalidatePath(`/quality/oem/iqc/${inspectionId}`)
  revalidatePath("/quality/oem/iqc")
  revalidatePath(`/quality/supplier/iqc/${inspectionId}`)
  revalidatePath("/quality/supplier/iqc")
  revalidatePath("/quality/oem")
  revalidatePath("/quality/supplier")

  return { success: true }
}

export async function createDefectFromIqc(inspectionId: string) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (session.user.companyType !== "OEM") return { success: false, error: "Only OEM users can create defects from IQC" }
  if (!canManageIqc(session)) return { success: false, error: "Insufficient role" }

  const featureGate = requireFeature(session, "IQC")
  if (!featureGate.allowed) return { success: false, error: featureGate.reason ?? "IQC requires a higher plan" }

  const inspection = await prisma.iqcReport.findFirst({
    where: { id: inspectionId, oemId: session.user.companyId },
  })
  if (!inspection) return { success: false, error: "IQC inspection not found" }
  if (!isNegativeResult(inspection.result)) return { success: false, error: "Can only create defect from non-conforming IQC" }
  if (inspection.linkedDefectId) return { success: false, error: "A defect is already linked to this inspection" }

  const { addCalendarDays } = await import("@/lib/sla")
  const supplier = await prisma.company.findUnique({
    where: { id: inspection.supplierId },
    include: { users: { select: { id: true } } },
  })

  const defect = await prisma.defect.create({
    data: {
      oemId: inspection.oemId,
      supplierId: inspection.supplierId,
      partNumber: inspection.partNumber,
      description: `IQC Non-Conformance: ${inspection.partNumber}${inspection.partName ? ` — ${inspection.partName}` : ""}${inspection.dispositionNotes ? `. ${inspection.dispositionNotes}` : ""}`,
      status: "OPEN",
      oemOwnerId: session.user.id,
      supplierResponseDueAt: addCalendarDays(new Date(), 7),
      currentActionOwner: "SUPPLIER",
    },
  })

  await prisma.iqcReport.update({
    where: { id: inspectionId },
    data: { linkedDefectId: defect.id },
  })

  await prisma.defectEvent.create({
    data: {
      defectId: defect.id,
      type: "CREATED",
      actorId: session.user.id,
      metadata: { source: "IQC", inspectionNumber: inspection.inspectionNumber, inspectionId },
    },
  })

  await prisma.iqcEvent.create({
    data: {
      reportId: inspectionId,
      type: "IQC_RESULT_SET",
      actorId: session.user.id,
      metadata: { action: "defect_created", defectId: defect.id },
    },
  })

  if (supplier && supplier.users.length > 0) {
    await prisma.notification.createMany({
      data: supplier.users.map((user) => ({
        userId: user.id,
        companyId: inspection.supplierId,
        message: `New defect from IQC: ${inspection.inspectionNumber} — ${inspection.partNumber}`,
        type: "NEW_DEFECT",
        link: `/quality/supplier/defects/${defect.id}`,
        isRead: false,
      })),
    })
  }

  revalidatePath(`/quality/oem/iqc/${inspectionId}`)
  revalidatePath("/quality/oem/iqc")
  revalidatePath("/quality/oem/defects")
  revalidatePath("/quality/supplier/defects")
  revalidatePath(`/quality/supplier/iqc/${inspectionId}`)
  revalidatePath("/quality/supplier/iqc")
  revalidatePath("/quality/oem")
  revalidatePath("/quality/supplier")

  return { success: true, defectId: defect.id }
}