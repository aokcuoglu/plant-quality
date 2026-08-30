import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { OrgUnitNode, OrgUnitUser } from "./actions"
import { listOrgTree, listCompanyUsersForOrg } from "./actions"
import { OrgUsersClient, type FlatUnit, type SerializedUser } from "./org-users-client"

export const metadata = { title: "Organizasyon — PlantX" }

export const dynamic = "force-dynamic"

function serializeUser(u: OrgUnitUser): SerializedUser {
  return { ...u, createdAt: u.createdAt.toISOString() }
}

function serializeNode(node: OrgUnitNode): FlatUnit {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    parentId: node.parentId,
    users: node.users.map(serializeUser),
    children: node.children.map(serializeNode),
  }
}

export default async function CompanyUsersPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role === "SUPER_ADMIN") redirect("/admin")

  const isOemAdmin = session.user.companyType === "OEM" && session.user.role === "ADMIN"
  if (!isOemAdmin) redirect("/dashboard")

  const [directorates, allUsers, company] = await Promise.all([
    listOrgTree(),
    listCompanyUsersForOrg(),
    prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { ssoAllowedDomains: true },
    }),
  ])

  const unassignedUsers = allUsers.filter((u) => !u.orgUnitId)
  const serializedTree = directorates.map(serializeNode)

  return (
    <OrgUsersClient
      directorates={serializedTree}
      unassignedUsers={unassignedUsers.map(serializeUser)}
      emailDomain={company?.ssoAllowedDomains[0] ?? null}
    />
  )
}
