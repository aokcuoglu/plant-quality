"use server"

import { isEditorRole } from "@/lib/roles"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canConsumeUsage, consumeUsage } from "@/lib/billing"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { addCalendarDays } from "@/lib/sla"
import { resolveFieldConfig } from "@/lib/custom-fields/resolver"
import { validateCustomFields } from "@/lib/custom-fields/validation"
import type { Prisma } from "@plantx/db/client"

export async function createDefect(formData: FormData): Promise<void> {
  const session = await auth()
  if (
    !session ||
    session.user.companyType !== "OEM" ||
    !isEditorRole(session.user.role)
  ) return

  const canCreate = await canConsumeUsage(session.user.companyId, "MONTHLY_DEFECTS")
  if (!canCreate) return

  const supplierId = formData.get("supplierId") as string
  const supplierAssigneeId = (formData.get("supplierAssigneeId") as string) || null
  const partNumber = formData.get("partNumber") as string
  const description = formData.get("description") as string
  const imageUrlsRaw = formData.get("imageUrls") as string
  const customFieldsRaw = formData.get("customFields") as string | null

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

  let customFieldsData: Prisma.InputJsonValue | undefined = undefined
  if (customFieldsRaw && session.user.plan === "ENTERPRISE") {
    try {
      const parsed = JSON.parse(customFieldsRaw)
      const config = await resolveFieldConfig(session.user.companyId, "DEFECT")
      const validation = validateCustomFields(parsed, config.all)
      if (validation.success) {
        customFieldsData = validation.data as Prisma.InputJsonValue
      }
    } catch {
      // ignore invalid custom fields
    }
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
      customFields: customFieldsData,
    },
  })

  await consumeUsage(session.user.companyId, "MONTHLY_DEFECTS")

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
  revalidatePath("/quality/supplier/defects")
  revalidatePath("/quality/oem")
  revalidatePath("/quality/supplier")
  redirect("/quality/oem/defects")
}
