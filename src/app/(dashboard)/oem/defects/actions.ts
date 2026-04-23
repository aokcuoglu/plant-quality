"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function createDefect(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") return

  const supplierId = formData.get("supplierId") as string
  const partNumber = formData.get("partNumber") as string
  const description = formData.get("description") as string
  const imageUrlsRaw = formData.get("imageUrls") as string

  if (!supplierId || !partNumber || !description) return

  const supplier = await prisma.company.findFirst({
    where: { id: supplierId, type: "SUPPLIER" },
  })

  if (!supplier) return

  let imageUrls: string[] = []
  if (imageUrlsRaw) {
    try {
      imageUrls = JSON.parse(imageUrlsRaw)
    } catch {}
  }

  await prisma.defect.create({
    data: {
      oemId: session.user.companyId,
      supplierId,
      partNumber,
      description,
      status: "OPEN",
      imageUrls,
    },
  })

  revalidatePath("/oem/defects")
  redirect("/oem/defects")
}
