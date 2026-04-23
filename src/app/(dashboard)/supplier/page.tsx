import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { BugIcon, ClockIcon, CheckCircleIcon } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { DashboardCard } from "@/components/layout/DashboardCard"

export default async function SupplierDashboardPage() {
  const session = await auth()
  if (!session || session.user.companyType !== "SUPPLIER") redirect("/login")

  const defectCounts = await prisma.defect.groupBy({
    by: ["status"],
    where: { supplierId: session.user.companyId },
    _count: true,
  })

  const totalDefects = defectCounts.reduce((sum, d) => sum + d._count, 0)
  const inProgress = defectCounts.find((d) => d.status === "IN_PROGRESS")?._count ?? 0
  const resolved = defectCounts.find((d) => d.status === "RESOLVED")?._count ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Dashboard"
        description={`Welcome back, ${session.user.name ?? session.user.email}`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          title="Total Defects"
          value={totalDefects}
          icon={BugIcon}
          subtitle="All assigned quality issues"
        />
          <DashboardCard
            title="In Progress"
            value={inProgress}
            icon={ClockIcon}
            subtitle="8D report being drafted"
          />
        <DashboardCard
          title="Resolved"
          value={resolved}
          icon={CheckCircleIcon}
          subtitle="Successfully closed"
        />
      </div>
    </div>
  )
}
