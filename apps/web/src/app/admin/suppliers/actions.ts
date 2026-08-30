"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import {
  addSupplierAdminSchema,
  addSupplierUserSchema,
  zodToActionError,
} from "@/lib/validation"

export async function getSuppliers() {
  const session = await auth()
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized")
  }

  return prisma.company.findMany({
    where: { type: "SUPPLIER" },
    include: {
      primaryOem: { select: { id: true, name: true } },
      _count: { select: { users: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getOEMs() {
  const session = await auth()
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized")
  }

  return prisma.company.findMany({
    where: { type: "OEM" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}

export async function addSupplier(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized")
  }

  const parsed = addSupplierAdminSchema().safeParse({
    companyName: formData.get("companyName"),
    adminEmail: formData.get("adminEmail"),
    adminName: formData.get("adminName"),
    oemId: formData.get("oemId"),
    taxNumber: formData.get("taxNumber") || null,
    plan: (formData.get("plan") as string) || "FREE",
  })
  if (!parsed.success) {
    return zodToActionError(parsed.error)
  }

  const { companyName, adminEmail, adminName, oemId, taxNumber, plan } = parsed.data

  const existingEmail = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (existingEmail) {
    return {
      success: false as const,
      error: "A user with this email already exists",
      fieldErrors: { adminEmail: "A user with this email already exists" },
    }
  }

  const company = await prisma.company.create({
    data: {
      name: companyName,
      type: "SUPPLIER",
      primaryOemId: oemId,
      taxNumber: taxNumber || null,
      plan,
      users: {
        create: {
          email: adminEmail,
          name: adminName,
          role: "ADMIN",
          plan,
          emailVerified: new Date(),
        },
      },
    },
  })

  revalidatePath("/admin/suppliers")
  return { success: true as const, data: company }
}

export async function removeSupplier(companyId: string) {
  const session = await auth()
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized")
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
  })

  if (!company || company.type !== "SUPPLIER") {
    throw new Error("Supplier not found")
  }

  const hasRecords = await prisma.company.findFirst({
    where: {
      id: companyId,
      OR: [
        { defectsAsSup: { some: {} } },
        { ppapAsSup: { some: {} } },
        { iqcAsSup: { some: {} } },
        { fmeaAsSup: { some: {} } },
        { fieldDefectsAsSup: { some: {} } },
        { devPlansAsSupplier: { some: {} } },
      ],
    },
  })

  if (hasRecords) {
    throw new Error("Cannot delete supplier with existing quality records. Remove associated records first.")
  }

  await prisma.company.delete({ where: { id: companyId } })

  revalidatePath("/admin/suppliers")
  return { success: true }
}

export async function getSupplierDetail(companyId: string) {
  const session = await auth()
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized")
  }

  const supplier = await prisma.company.findFirst({
    where: { id: companyId, type: "SUPPLIER" },
    include: {
      primaryOem: { select: { id: true, name: true } },
      users: {
        select: { id: true, email: true, name: true, role: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!supplier) throw new Error("Supplier not found")
  return supplier
}

export async function addSupplierUser(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized")
  }

  const parsed = addSupplierUserSchema().safeParse({
    companyId: formData.get("companyId"),
    email: formData.get("email"),
    name: formData.get("name"),
    role: (formData.get("role") as string) || "VIEWER",
  })
  if (!parsed.success) {
    return zodToActionError(parsed.error)
  }

  const { companyId, email, name, role } = parsed.data

  const existingEmail = await prisma.user.findUnique({ where: { email } })
  if (existingEmail) {
    return {
      success: false as const,
      error: "A user with this email already exists",
      fieldErrors: { email: "A user with this email already exists" },
    }
  }

  const supplier = await prisma.company.findFirst({
    where: { id: companyId, type: "SUPPLIER" },
  })
  if (!supplier) {
    return { success: false as const, error: "Supplier not found" }
  }

  await prisma.user.create({
    data: {
      email,
      name,
      role,
      plan: supplier.plan,
      companyId,
      emailVerified: new Date(),
    },
  })

  revalidatePath(`/admin/suppliers/${companyId}`)
  return { success: true as const }
}

export async function removeSupplierUser(userId: string, companyId: string) {
  const session = await auth()
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized")
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, companyId },
  })

  if (!user) throw new Error("User not found")

  await prisma.user.delete({ where: { id: userId } })

  revalidatePath(`/admin/suppliers/${companyId}`)
}

export async function updateSupplierPlan(companyId: string, plan: string) {
  const session = await auth()
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized")
  }

  const supplier = await prisma.company.findFirst({
    where: { id: companyId, type: "SUPPLIER" },
  })
  if (!supplier) throw new Error("Supplier not found")

  await prisma.company.update({
    where: { id: companyId },
    data: { plan: plan as "FREE" | "BASIC" | "PRO" | "ENTERPRISE" },
  })

  await prisma.user.updateMany({
    where: { companyId },
    data: { plan: plan as "FREE" | "BASIC" | "PRO" | "ENTERPRISE" },
  })

  revalidatePath("/admin/suppliers")
  revalidatePath(`/admin/suppliers/${companyId}`)
}
