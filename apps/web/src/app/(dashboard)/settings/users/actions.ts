"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import type { Role } from "@plantx/db/client"
import { getTranslations } from "@/i18n/server"
import {
  addCompanyUserSchema,
  isEmailInAllowedDomains,
  zodToActionError,
} from "@/lib/validation"

export interface ManageableUser {
  id: string
  email: string
  name: string | null
  role: Role
  plan: string
  modules: string[]
  createdAt: Date
}

async function requireOemAdmin() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM" || session.user.role !== "ADMIN") {
    redirect("/quality/oem")
  }
  return { companyId: session.user.companyId }
}

async function getCompanyModuleAllowlist(companyId: string): Promise<string[]> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { modules: true },
  })
  return company?.modules ?? []
}

function filterModules(modules: string[], allowlist: string[]): string[] {
  return modules.filter((m) => allowlist.includes(m))
}

export async function listCompanyUsers(): Promise<ManageableUser[]> {
  const { companyId } = await requireOemAdmin()
  const users = await prisma.user.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      plan: true,
      modules: true,
      createdAt: true,
      emailVerified: true,
    },
  })
  return users
}

export async function addCompanyUser(formData: FormData) {
  const { companyId } = await requireOemAdmin()
  const t = await getTranslations()

  const modulesRaw = (formData.get("modules") as string) || "[]"
  let modules: string[] = []
  try {
    modules = JSON.parse(modulesRaw)
  } catch {
    modules = []
  }

  const parsed = addCompanyUserSchema({
    invalid: t("validation.emailInvalid"),
    localPartInvalid: t("validation.emailLocalPartInvalid"),
    localPartTooManyDots: t("validation.emailLocalPartTooManyDots"),
    required: t("validation.required"),
    nameRequired: t("validation.nameRequired"),
    roleInvalid: t("validation.roleInvalid"),
  }).safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    modules,
  })
  if (!parsed.success) {
    return zodToActionError(parsed.error, t("validation.required"))
  }

  const { email, name, role } = parsed.data

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { ssoAllowedDomains: true },
  })
  if (
    company?.ssoAllowedDomains.length &&
    !isEmailInAllowedDomains(email, company.ssoAllowedDomains)
  ) {
    const msg = t("dashboard.settings.users.emailDomainMismatch", {
      domain: company.ssoAllowedDomains[0],
    })
    return { success: false as const, error: msg, fieldErrors: { email: msg } }
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return {
      success: false as const,
      error: t("validation.emailExists"),
      fieldErrors: { email: t("validation.emailExists") },
    }
  }

  const allowlist = await getCompanyModuleAllowlist(companyId)
  const filteredModules = filterModules(parsed.data.modules ?? [], allowlist)

  await prisma.user.create({
    data: {
      email,
      name,
      role: role as Role,
      companyId,
      modules: filteredModules,
      emailVerified: new Date(),
    },
  })

  revalidatePath("/settings/users")
  revalidatePath("/dashboard/users")
  return { success: true as const }
}

export async function updateUserRole(userId: string, role: Role) {
  const { companyId } = await requireOemAdmin()

  const user = await prisma.user.findFirst({ where: { id: userId, companyId } })
  if (!user) return { error: "User not found" }
  if (user.role === "ADMIN") return { error: "You cannot change another admin's role" }

  await prisma.user.update({ where: { id: userId }, data: { role } })
  revalidatePath("/settings/users")
  revalidatePath("/dashboard/users")
  return { success: true }
}

export async function updateUserModules(userId: string, modulesRaw: string[]) {
  const { companyId } = await requireOemAdmin()

  const user = await prisma.user.findFirst({ where: { id: userId, companyId } })
  if (!user) return { error: "User not found" }
  if (user.role === "ADMIN") return { error: "You cannot change an admin's module access" }

  const allowlist = await getCompanyModuleAllowlist(companyId)
  const modules = filterModules(modulesRaw, allowlist)

  await prisma.user.update({ where: { id: userId }, data: { modules } })
  revalidatePath("/settings/users")
  revalidatePath("/dashboard/users")
  return { success: true }
}

export async function removeUser(userId: string) {
  const { companyId } = await requireOemAdmin()

  const user = await prisma.user.findFirst({ where: { id: userId, companyId } })
  if (!user) return { error: "User not found" }
  if (user.role === "ADMIN") return { error: "You cannot remove another admin" }

  await prisma.user.delete({ where: { id: userId } })
  revalidatePath("/settings/users")
  revalidatePath("/dashboard/users")
  return { success: true }
}
