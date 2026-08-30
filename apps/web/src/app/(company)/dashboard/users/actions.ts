"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import type { Role, OrgUnitType } from "@plantx/db/client"
import { getTranslations } from "@/i18n/server"
import {
  addCompanyUserSchema,
  isEmailInAllowedDomains,
  zodToActionError,
} from "@/lib/validation"

export interface OrgUnitNode {
  id: string
  name: string
  type: OrgUnitType
  parentId: string | null
  sortOrder: number
  users: OrgUnitUser[]
  children: OrgUnitNode[]
}

export interface OrgUnitUser {
  id: string
  email: string
  name: string | null
  role: Role
  plan: string
  modules: string[]
  orgUnitId: string | null
  createdAt: Date
}

async function requireOemAdmin() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM" || session.user.role !== "ADMIN") {
    redirect("/dashboard")
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

function buildTree(
  units: Array<{
    id: string
    name: string
    type: OrgUnitType
    parentId: string | null
    sortOrder: number
    users: OrgUnitUser[]
  }>,
): OrgUnitNode[] {
  const map = new Map<string, OrgUnitNode>()
  for (const u of units) {
    map.set(u.id, {
      ...u,
      users: u.users,
      children: [],
    })
  }
  const roots: OrgUnitNode[] = []
  for (const u of map.values()) {
    if (u.parentId && map.has(u.parentId)) {
      map.get(u.parentId)!.children.push(u)
    } else {
      roots.push(u)
    }
  }
  return roots
}

export async function listOrgTree(): Promise<OrgUnitNode[]> {
  const { companyId } = await requireOemAdmin()
  const units = await prisma.organizationUnit.findMany({
    where: { companyId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      users: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          plan: true,
          modules: true,
          orgUnitId: true,
          createdAt: true,
        },
        orderBy: { name: "asc" },
      },
    },
  })
  return buildTree(units)
}

export async function createMudurluk(parentId: string, name: string) {
  const { companyId } = await requireOemAdmin()
  if (!name?.trim()) return { error: "Müdürlük adı boş olamaz" }

  const parent = await prisma.organizationUnit.findFirst({
    where: { id: parentId, companyId, type: "DIRECTORATE" },
    select: { id: true },
  })
  if (!parent) return { error: "Direktörlük bulunamadı" }

  await prisma.organizationUnit.create({
    data: {
      name: name.trim(),
      type: "MUDURLUK",
      companyId,
      parentId,
    },
  })
  revalidatePath("/dashboard/users")
  return { success: true }
}

export async function renameOrgUnit(unitId: string, name: string) {
  const { companyId } = await requireOemAdmin()
  if (!name?.trim()) return { error: "Birim adı boş olamaz" }

  const unit = await prisma.organizationUnit.findFirst({
    where: { id: unitId, companyId },
    select: { id: true },
  })
  if (!unit) return { error: "Birim bulunamadı" }

  await prisma.organizationUnit.update({ where: { id: unitId }, data: { name: name.trim() } })
  revalidatePath("/dashboard/users")
  return { success: true }
}

export async function deleteOrgUnit(unitId: string) {
  const { companyId } = await requireOemAdmin()

  const unit = await prisma.organizationUnit.findFirst({
    where: { id: unitId, companyId },
    select: { id: true, type: true },
  })
  if (!unit) return { error: "Birim bulunamadı" }

  // Prevent deleting a directorate that still has müdürlükler under it.
  if (unit.type === "DIRECTORATE") {
    const childCount = await prisma.organizationUnit.count({ where: { parentId: unitId } })
    if (childCount > 0) return { error: "Önce altındaki müdürlükleri silin" }
  }

  await prisma.organizationUnit.delete({ where: { id: unitId } })
  revalidatePath("/dashboard/users")
  return { success: true }
}

export async function assignUserToOrgUnit(userId: string, orgUnitId: string | null) {
  const { companyId } = await requireOemAdmin()

  if (orgUnitId) {
    const unit = await prisma.organizationUnit.findFirst({
      where: { id: orgUnitId, companyId },
      select: { id: true },
    })
    if (!unit) return { error: "Birim bulunamadı" }
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, companyId },
    select: { id: true },
  })
  if (!user) return { error: "Kullanıcı bulunamadı" }

  await prisma.user.update({ where: { id: userId }, data: { orgUnitId } })
  revalidatePath("/dashboard/users")
  return { success: true }
}

export async function listCompanyUsersForOrg(): Promise<OrgUnitUser[]> {
  const { companyId } = await requireOemAdmin()
  const users = await prisma.user.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      plan: true,
      modules: true,
      orgUnitId: true,
      createdAt: true,
    },
  })
  return users
}

export async function addCompanyUserForOrg(formData: FormData) {
  const { companyId } = await requireOemAdmin()
  const t = await getTranslations()

  const modulesRaw = (formData.get("modules") as string) || "[]"
  const orgUnitRaw = (formData.get("orgUnitId") as string) || null
  const orgUnitId = orgUnitRaw && orgUnitRaw !== "__none__" ? orgUnitRaw : null

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
    orgUnitId,
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
    return {
      success: false as const,
      error: t("dashboard.company.organization.emailDomainMismatch", {
        domain: company.ssoAllowedDomains[0],
      }),
      fieldErrors: { email: t("dashboard.company.organization.emailDomainMismatch", {
        domain: company.ssoAllowedDomains[0],
      }) },
    }
  }

  if (orgUnitId) {
    const unit = await prisma.organizationUnit.findFirst({
      where: { id: orgUnitId, companyId },
      select: { id: true },
    })
    if (!unit) {
      return { success: false as const, error: "Birim bulunamadı", fieldErrors: { unit: "Birim bulunamadı" } }
    }
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
      orgUnitId,
      modules: filteredModules,
      emailVerified: new Date(),
    },
  })
  revalidatePath("/dashboard/users")
  return { success: true as const }
}

export async function removeOrgUser(userId: string) {
  const { companyId } = await requireOemAdmin()
  const user = await prisma.user.findFirst({ where: { id: userId, companyId } })
  if (!user) return { error: "Kullanıcı bulunamadı" }
  if (user.role === "ADMIN") return { error: "Admin kullanıcıyı silemezsiniz" }

  await prisma.user.delete({ where: { id: userId } })
  revalidatePath("/dashboard/users")
  return { success: true }
}

export async function updateOrgUserRole(userId: string, role: Role) {
  const { companyId } = await requireOemAdmin()
  const user = await prisma.user.findFirst({ where: { id: userId, companyId } })
  if (!user) return { error: "Kullanıcı bulunamadı" }
  if (user.role === "ADMIN") return { error: "Başka bir adminin rolünü değiştiremezsiniz" }

  await prisma.user.update({ where: { id: userId }, data: { role } })
  revalidatePath("/dashboard/users")
  return { success: true }
}
