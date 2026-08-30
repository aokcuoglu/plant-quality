import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { UsersClient } from "./users-client"
import { listCompanyUsers } from "./actions"

export const metadata = { title: "User Management — PlantX" }

export const dynamic = "force-dynamic"

export default async function UsersPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isOemAdmin = session.user.companyType === "OEM" && session.user.role === "ADMIN"
  if (!isOemAdmin) {
    redirect("/quality/oem")
  }

  const [users, company] = await Promise.all([
    listCompanyUsers(),
    prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { modules: true, ssoAllowedDomains: true },
    }),
  ])

  return (
    <UsersClient
      initialUsers={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
      companyModules={company?.modules ?? []}
      emailDomain={company?.ssoAllowedDomains[0] ?? null}
    />
  )
}
