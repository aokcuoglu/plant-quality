"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function addReviewComment(
  defectId: string,
  stepId: string,
  comment: string,
) {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") {
    return { success: false as const, error: "Unauthorized" }
  }

  const defect = await prisma.defect.findFirst({
    where: { id: defectId, oemId: session.user.companyId },
    include: { eightDReport: true },
  })
  if (!defect || !defect.eightDReport) {
    return { success: false as const, error: "Report not found" }
  }

  await prisma.reviewComment.create({
    data: {
      reportId: defect.eightDReport.id,
      stepId,
      comment,
      authorId: session.user.id!,
    },
  })

  revalidatePath(`/oem/defects/${defectId}`)

  return { success: true as const }
}

export async function approveReport(defectId: string) {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") {
    return { success: false as const, error: "Unauthorized" }
  }

  const defect = await prisma.defect.findFirst({
    where: { id: defectId, oemId: session.user.companyId, status: "WAITING_APPROVAL" },
  })
  if (!defect) {
    return { success: false as const, error: "Defect not found or not awaiting approval" }
  }

  await prisma.defect.update({
    where: { id: defectId },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  })

  revalidatePath(`/oem/defects/${defectId}`)
  revalidatePath("/oem")

  return { success: true as const }
}

export async function rejectReport(defectId: string) {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") {
    return { success: false as const, error: "Unauthorized" }
  }

  const defect = await prisma.defect.findFirst({
    where: { id: defectId, oemId: session.user.companyId, status: "WAITING_APPROVAL" },
  })
  if (!defect) {
    return { success: false as const, error: "Defect not found or not awaiting approval" }
  }

  await prisma.defect.update({
    where: { id: defectId },
    data: { status: "REJECTED" },
  })

  revalidatePath(`/oem/defects/${defectId}`)
  revalidatePath("/oem")

  return { success: true as const }
}
