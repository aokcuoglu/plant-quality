"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

type StepData = Record<string, string>

export async function saveEightDStep(defectId: string, data: StepData) {
  const session = await auth()
  if (!session || session.user.companyType !== "SUPPLIER") {
    return { success: false as const, error: "Unauthorized" }
  }

  const defect = await prisma.defect.findFirst({
    where: { id: defectId, supplierId: session.user.companyId },
  })
  if (!defect) {
    return { success: false as const, error: "Defect not found" }
  }

  const updateData: Record<string, string> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith("d")) {
      updateData[key] = value
    }
  }

  const wasDraft = defect.status === "OPEN" || defect.status === "REJECTED"

  await prisma.eightDReport.upsert({
    where: { defectId },
    create: { defectId, ...updateData },
    update: updateData,
  })

  if (wasDraft) {
    await prisma.defect.update({
      where: { id: defectId },
      data: { status: "IN_PROGRESS" },
    })
  }

  revalidatePath(`/supplier/defects/${defectId}/8d`)

  return { success: true as const }
}

export async function submitEightDReport(defectId: string) {
  const session = await auth()
  if (!session || session.user.companyType !== "SUPPLIER") {
    return { success: false as const, error: "Unauthorized" }
  }

  const defect = await prisma.defect.findFirst({
    where: { id: defectId, supplierId: session.user.companyId },
    include: { eightDReport: true },
  })
  if (!defect) {
    return { success: false as const, error: "Defect not found" }
  }

  if (!defect.eightDReport) {
    return { success: false as const, error: "No 8D report data found" }
  }

  await prisma.eightDReport.update({
    where: { defectId },
    data: { submittedAt: new Date() },
  })

  await prisma.defect.update({
    where: { id: defectId },
    data: { status: "WAITING_APPROVAL" },
  })

  revalidatePath(`/supplier/defects/${defectId}/8d`)
  revalidatePath(`/supplier/defects/${defectId}`)
  revalidatePath("/supplier")

  return { success: true as const }
}
