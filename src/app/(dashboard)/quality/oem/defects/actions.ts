"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { addCalendarDays } from "@/lib/sla"

export async function createDefect(formData: FormData): Promise<void> {
  const session = await auth()
  if (
    !session ||
    session.user.companyType !== "OEM" ||
    !["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)
  ) return

  const supplierId = formData.get("supplierId") as string
  const supplierAssigneeId = (formData.get("supplierAssigneeId") as string) || null
  const partNumber = formData.get("partNumber") as string
  const description = formData.get("description") as string
  const imageUrlsRaw = formData.get("imageUrls") as string

  if (!supplierId || !partNumber || !description) return

  const supplier = await prisma.company.findFirst({
    where: { id: supplierId, type: "SUPPLIER" },
    include: { users: { select: { id: true } } },
  })

  if (!supplier) return

  const supplierAssignee = supplierAssigneeId
    ? await prisma.user.findFirst({
        where: { id: supplierAssigneeId, companyId: supplierId },
        select: { id: true },
      })
    : null

  let imageUrls: string[] = []
  if (imageUrlsRaw) {
    try {
      imageUrls = JSON.parse(imageUrlsRaw)
    } catch {}
  }

  const defect = await prisma.defect.create({
    data: {
      oemId: session.user.companyId,
      supplierId,
      partNumber,
      description,
      status: "OPEN",
      imageUrls,
      oemOwnerId: session.user.id,
      supplierAssigneeId: supplierAssignee?.id ?? null,
      supplierResponseDueAt: addCalendarDays(new Date(), 7),
      currentActionOwner: "SUPPLIER",
    },
  })

  await prisma.defectEvent.create({
    data: {
      defectId: defect.id,
      type: "CREATED",
      actorId: session.user.id,
      metadata: {
        supplierId,
        oemOwnerId: session.user.id,
        supplierAssigneeId: supplierAssignee?.id ?? null,
        supplierResponseDueAt: defect.supplierResponseDueAt?.toISOString() ?? null,
        currentActionOwner: defect.currentActionOwner,
        partNumber,
        imageCount: imageUrls.length,
      },
    },
  })

  if (supplier.users.length > 0) {
    await prisma.notification.createMany({
      data: supplier.users.map((user) => ({
        userId: user.id,
        companyId: session.user.companyId,
        message: `New defect reported: #${partNumber}`,
        type: "NEW_DEFECT",
        link: `/quality/supplier/defects/${defect.id}`,
        isRead: false,
      })),
    })
  }

  revalidatePath("/quality/oem/defects")
  redirect("/quality/oem/defects")
}
