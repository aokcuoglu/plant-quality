"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function createDefect(formData: FormData): Promise<void> {
  const session = await auth()
  if (
    !session ||
    session.user.companyType !== "OEM" ||
    !["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)
  ) return

  const supplierId = formData.get("supplierId") as string
  const partNumber = formData.get("partNumber") as string
  const description = formData.get("description") as string
  const imageUrlsRaw = formData.get("imageUrls") as string

  if (!supplierId || !partNumber || !description) return

  const supplier = await prisma.company.findFirst({
    where: { id: supplierId, type: "SUPPLIER" },
    include: { users: { select: { id: true } } },
  })

  if (!supplier) return

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
    },
  })

  await prisma.defectEvent.create({
    data: {
      defectId: defect.id,
      type: "CREATED",
      actorId: session.user.id,
      metadata: {
        supplierId,
        partNumber,
        imageCount: imageUrls.length,
      },
    },
  })

  if (supplier.users.length > 0) {
    await prisma.notification.createMany({
      data: supplier.users.map((user) => ({
        userId: user.id,
        message: `New defect reported: #${partNumber}`,
        type: "NEW_DEFECT",
        link: `/supplier/defects/${defect.id}`,
        isRead: false,
      })),
    })
  }

  revalidatePath("/oem/defects")
  redirect("/oem/defects")
}
