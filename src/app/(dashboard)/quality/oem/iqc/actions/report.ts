"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import type { IqcStatus, Prisma } from "@/generated/prisma/client"

interface MeasurementRow {
  characteristic: string
  specification: string
  measured: string
  result: "PASS" | "FAIL"
}

interface NonconformityRow {
  description: string
  severity: "Major" | "Minor" | "Observation"
}

export async function createIqcReport(formData: FormData) {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM" || !["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)) {
    return
  }

  const supplierId = formData.get("supplierId") as string
  const lotNumber = formData.get("lotNumber") as string
  const partNumber = formData.get("partNumber") as string
  const partName = (formData.get("partName") as string) || null
  const quantity = parseInt(formData.get("quantity") as string) || 0
  const inspectionDateStr = formData.get("inspectionDate") as string | null
  const defectId = (formData.get("defectId") as string) || null

  if (!supplierId || !lotNumber || !partNumber || quantity <= 0) return

  const report = await prisma.iqcReport.create({
    data: {
      lotNumber,
      partNumber,
      partName,
      quantity,
      quantityAccepted: 0,
      quantityRejected: 0,
      status: "PENDING",
      oemId: session.user.companyId,
      supplierId,
      inspectorId: session.user.id,
      defectId,
      inspectionDate: inspectionDateStr ? new Date(inspectionDateStr) : new Date(),
    },
  })

  await prisma.iqcEvent.create({
    data: {
      reportId: report.id,
      type: "IQC_CREATED",
      actorId: session.user.id,
      metadata: { lotNumber, partNumber, quantity },
    },
  })

  revalidatePath("/quality/oem/iqc")
  revalidatePath("/quality/supplier/iqc")
}

export async function completeIqcReport(
  reportId: string,
  quantityAccepted: number,
  quantityRejected: number,
  measurements: MeasurementRow[],
  nonconformities: NonconformityRow[],
  dispositionNotes?: string,
) {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM" || !["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized" }
  }

  const report = await prisma.iqcReport.findFirst({
    where: { id: reportId, oemId: session.user.companyId, status: { in: ["PENDING", "IN_PROGRESS"] } },
    include: { supplier: { include: { users: { select: { id: true } } } } },
  })
  if (!report) {
    return { success: false, error: "IQC report not found" }
  }

  const hasRejections = quantityRejected > 0 || nonconformities.some((n) => n.severity === "Major")
  const status: IqcStatus = hasRejections ? "FAILED" : "PASSED"

  await prisma.iqcReport.update({
    where: { id: reportId },
    data: {
      quantityAccepted,
      quantityRejected,
      status,
      measurements: measurements as unknown as Prisma.InputJsonValue,
      nonconformities: nonconformities as unknown as Prisma.InputJsonValue,
      dispositionNotes: dispositionNotes ?? null,
      completedAt: new Date(),
    },
  })

  const eventType = status === "FAILED" ? "IQC_FAILED" : "IQC_COMPLETED"
  await prisma.iqcEvent.create({
    data: {
      reportId,
      type: eventType,
      actorId: session.user.id,
      metadata: { lotNumber: report.lotNumber, status, quantityAccepted, quantityRejected },
    },
  })

  if (report.supplier.users.length > 0) {
    const notifType = status === "FAILED" ? "IQC_FAILED" : "INFO"
    await prisma.notification.createMany({
      data: report.supplier.users.map((user) => ({
        userId: user.id,
        companyId: report.supplierId,
        message: `IQC Report ${report.lotNumber} — ${status === "FAILED" ? "FAILED" : "PASSED"} (${quantityAccepted}/${report.quantity} accepted)`,
        type: notifType,
        link: `/quality/supplier/iqc/${reportId}`,
        isRead: false,
      })),
    })
  }

  revalidatePath(`/quality/oem/iqc/${reportId}`)
  revalidatePath("/quality/oem/iqc")
  revalidatePath(`/quality/supplier/iqc/${reportId}`)

  return { success: true }
}