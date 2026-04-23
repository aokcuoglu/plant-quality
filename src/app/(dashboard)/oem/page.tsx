import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { BugIcon, ClockIcon, AlertTriangleIcon } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { DashboardCard } from "@/components/layout/DashboardCard"

export default async function OemDashboardPage() {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") redirect("/login")

  const defectCounts = await prisma.defect.groupBy({
    by: ["status"],
    where: { oemId: session.user.companyId },
    _count: true,
  })

  const totalDefects = defectCounts.reduce((sum, d) => sum + d._count, 0)
  const openDefects = defectCounts.find((d) => d.status === "OPEN")?._count ?? 0
  const waitingApproval = defectCounts.find((d) => d.status === "WAITING_APPROVAL")?._count ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="OEM Dashboard"
        description={`Welcome back, ${session.user.name ?? session.user.email}`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          title="Total Defects"
          value={totalDefects}
          icon={BugIcon}
          subtitle="All reported quality issues"
        />
        <DashboardCard
          title="Open"
          value={openDefects}
          icon={AlertTriangleIcon}
          subtitle="Awaiting supplier action"
        />
          <DashboardCard
            title="Awaiting Approval"
            value={waitingApproval}
            icon={ClockIcon}
            subtitle="8D reports ready for review"
          />
      </div>
    </div>
  )
}
