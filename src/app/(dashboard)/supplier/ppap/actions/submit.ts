"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function submitPpap(ppapId: string, supplierNotes?: string) {
  const session = await auth()
  if (!session || session.user.companyType !== "SUPPLIER" || !["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized" }
  }

  const ppap = await prisma.ppapSubmission.findFirst({
    where: { id: ppapId, supplierId: session.user.companyId, status: "DRAFT" },
    include: { oem: { include: { users: { select: { id: true } } } } },
  })
  if (!ppap) {
    return { success: false, error: "PPAP not found or not in DRAFT status" }
  }

  await prisma.ppapSubmission.update({
    where: { id: ppapId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      supplierAssigneeId: session.user.id,
      supplierNotes: supplierNotes ?? undefined,
    },
  })

  await prisma.ppapEvent.create({
    data: {
      ppapId,
      type: "PPAP_SUBMITTED",
      actorId: session.user.id,
      metadata: { partNumber: ppap.partNumber },
    },
  })

  if (ppap.oem.users.length > 0) {
    await prisma.notification.createMany({
      data: ppap.oem.users.map((user) => ({
        userId: user.id,
        message: `PPAP ${ppap.partNumber} submitted by supplier`,
        type: "PPAP_SUBMITTED",
        link: `/oem/ppap/${ppapId}`,
        isRead: false,
      })),
    })
  }

  revalidatePath(`/supplier/ppap/${ppapId}`)
  revalidatePath("/supplier/ppap")
  revalidatePath(`/oem/ppap/${ppapId}`)

  return { success: true }
}