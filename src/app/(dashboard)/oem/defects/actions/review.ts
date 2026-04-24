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
    include: { eightDReport: true, supplier: { include: { users: { select: { id: true } } } } },
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

  if (defect.supplier.users.length > 0) {
    await prisma.notification.createMany({
      data: defect.supplier.users.map((user) => ({
        userId: user.id,
        message: `New review comment on defect #${defect.partNumber}`,
        type: "REVISION",
        link: `/supplier/defects/${defectId}`,
        isRead: false,
      })),
    })
  }

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
    include: { supplier: { include: { users: { select: { id: true } } } } },
  })
  if (!defect) {
    return { success: false as const, error: "Defect not found or not awaiting approval" }
  }

  await Promise.all([
    prisma.defect.update({
      where: { id: defectId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    }),
    defect.supplier.users.length > 0
      ? prisma.notification.createMany({
          data: defect.supplier.users.map((user) => ({
            userId: user.id,
            message: `Defect #${defect.partNumber} has been approved and resolved`,
            type: "INFO",
            link: `/supplier/defects/${defectId}`,
            isRead: false,
          })),
        })
      : Promise.resolve(),
  ])

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
    include: { supplier: { include: { users: { select: { id: true } } } } },
  })
  if (!defect) {
    return { success: false as const, error: "Defect not found or not awaiting approval" }
  }

  await Promise.all([
    prisma.defect.update({
      where: { id: defectId },
      data: { status: "REJECTED" },
    }),
    defect.supplier.users.length > 0
      ? prisma.notification.createMany({
          data: defect.supplier.users.map((user) => ({
            userId: user.id,
            message: `Defect #${defect.partNumber} has been rejected and requires revision`,
            type: "REVISION",
            link: `/supplier/defects/${defectId}`,
            isRead: false,
          })),
        })
      : Promise.resolve(),
  ])

  revalidatePath(`/oem/defects/${defectId}`)
  revalidatePath("/oem")

  return { success: true as const }
}
