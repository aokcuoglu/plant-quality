"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export interface TeamMember {
  id: string
  userId: string
  userName: string
  role: "champion" | "teamLeader" | "member"
}

export interface ContainmentAction {
  id: string
  description: string
  responsibleUserId: string
  responsibleName: string
  effectiveness: number
  targetDate: string
  actualDate: string
}

export interface RootCauseEntry {
  id: string
  cause: string
  contribution: number
}

export interface D5Action {
  id: string
  action: string
  verificationMethod: string
  effectiveness: number
}

export interface D6Action {
  id: string
  actionId: string
  actionDescription: string
  targetDate: string
  actualDate: string
  validatedByUserId: string
  validatedByName: string
}

export interface D7Impact {
  id: string
  documentType: string
  revisionNo: string
}

const ALLOWED_FIELDS = new Set([
  "d2_problem",
  "d4_rootCause",
  "d5_d6_action",
  "d8_recognition",
])

export async function saveEightDStep(defectId: string, data: Record<string, unknown>) {
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

  const scalarData: Record<string, string> = {}
  const structuredData: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (ALLOWED_FIELDS.has(key)) {
      scalarData[key] = String(value ?? "")
    } else if (key.startsWith("d1_") || key.startsWith("d3_") || key.startsWith("d5_") || key.startsWith("d6_") || key.startsWith("d7_")) {
      structuredData[key] = value
    }
  }

  const dbUpdate: Record<string, unknown> = { ...scalarData }

  if (structuredData["d1_team"] !== undefined) dbUpdate["team"] = structuredData["d1_team"]
  if (structuredData["d3_containmentActions"] !== undefined) dbUpdate["containmentActions"] = structuredData["d3_containmentActions"]
  if (structuredData["d5_actions"] !== undefined) dbUpdate["d5Actions"] = structuredData["d5_actions"]
  if (structuredData["d6_actions"] !== undefined) dbUpdate["d6Actions"] = structuredData["d6_actions"]
  if (structuredData["d7_impacts"] !== undefined) dbUpdate["d7Impacts"] = structuredData["d7_impacts"]
  if (structuredData["d7_preventive"] !== undefined) dbUpdate["d7Preventive"] = structuredData["d7_preventive"]

  const wasDraft = defect.status === "OPEN" || defect.status === "REJECTED"

  await prisma.eightDReport.upsert({
    where: { defectId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: { defectId, ...dbUpdate } as any,
    update: dbUpdate,
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

  const updatedDefect = await prisma.defect.update({
    where: { id: defectId },
    data: { status: "WAITING_APPROVAL" },
    include: { oem: { include: { users: { select: { id: true } } } } },
  })

  if (updatedDefect.oem.users.length > 0) {
    await prisma.notification.createMany({
      data: updatedDefect.oem.users.map((user) => ({
        userId: user.id,
        message: `8D Report submitted for defect #${defect.partNumber} — ready for review`,
        type: "INFO",
        link: `/oem/defects/${defectId}`,
        isRead: false,
      })),
    })
  }

  revalidatePath(`/supplier/defects/${defectId}/8d`)
  revalidatePath(`/supplier/defects/${defectId}`)
  revalidatePath("/supplier")

  return { success: true as const }
}
