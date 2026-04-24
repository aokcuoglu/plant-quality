import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { BugIcon, ClockIcon, CheckCircleIcon, AlertTriangleIcon, TimerIcon } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { DashboardCard } from "@/components/layout/DashboardCard"
import { StatusDonut } from "@/components/dashboard/StatusDonut"
import { TrendArea } from "@/components/dashboard/TrendArea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { CustomerBar } from "@/components/dashboard/CustomerBar"
import { addCalendarDays, getActiveDueDate, isDefectOverdue } from "@/lib/sla"

export default async function SupplierDashboardPage() {
  const session = await auth()
  if (!session || session.user.companyType !== "SUPPLIER") redirect("/login")

  const defectCounts = await prisma.defect.groupBy({
    by: ["status"],
    where: { supplierId: session.user.companyId },
    _count: true,
  })

  const totalDefects = defectCounts.reduce((sum, d) => sum + d._count, 0)
  const openDefects = defectCounts.find((d) => d.status === "OPEN")?._count ?? 0
  const inProgress = defectCounts.find((d) => d.status === "IN_PROGRESS" || d.status === "REJECTED")?._count ?? 0
  const waitingApproval = defectCounts.find((d) => d.status === "WAITING_APPROVAL")?._count ?? 0
  const resolved = defectCounts.find((d) => d.status === "RESOLVED")?._count ?? 0
  const operationalDefects = await prisma.defect.findMany({
    where: { supplierId: session.user.companyId, status: { not: "RESOLVED" } },
    select: {
      status: true,
      currentActionOwner: true,
      supplierAssigneeId: true,
      supplierResponseDueAt: true,
      eightDSubmissionDueAt: true,
      oemReviewDueAt: true,
      revisionDueAt: true,
    },
  })
  const today = new Date()
  const weekEnd = addCalendarDays(today, 7)
  const overdueAssigned = operationalDefects.filter((d) => d.supplierAssigneeId === session.user.id && isDefectOverdue(d)).length
  const dueThisWeek = operationalDefects.filter((d) => {
    const dueDate = getActiveDueDate(d)
    return dueDate && dueDate >= today && dueDate <= weekEnd
  }).length

  const resolvedDefects = await prisma.defect.findMany({
    where: {
      supplierId: session.user.companyId,
      status: "RESOLVED",
    },
    select: { createdAt: true, resolvedAt: true },
  })

  let avgResolutionDays: number | null = null
  const validDurations = resolvedDefects
    .map((d) => {
      const end = d.resolvedAt ?? new Date()
      return (end.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    })
    .filter((days) => days >= 0)
  if (validDurations.length > 0) {
    avgResolutionDays = Math.round((validDurations.reduce((a, b) => a + b, 0) / validDurations.length) * 10) / 10
  }

  const topCustomers = await prisma.defect.groupBy({
    by: ["oemId"],
    where: { supplierId: session.user.companyId },
    _count: true,
    orderBy: { _count: { oemId: "desc" } },
    take: 5,
  })

  const customerIds = topCustomers.map((s) => s.oemId)
  const customers = await prisma.company.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true },
  })
  const customerMap = new Map(customers.map((s) => [s.id, s.name]))

  const customerChartData = topCustomers.map((s) => ({
    name: customerMap.get(s.oemId) ?? "Unknown",
    _count: s._count,
  }))

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)

  const monthlyDefects = await prisma.defect.findMany({
    where: {
      supplierId: session.user.companyId,
      createdAt: { gte: sixMonthsAgo },
    },
    select: { createdAt: true },
  })

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const monthlyMap = new Map<string, number>()
  for (let i = 0; i < 6; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const key = `${monthLabels[d.getMonth()]} ${d.getFullYear()}`
    monthlyMap.set(key, 0)
  }
  for (const d of monthlyDefects) {
    const key = `${monthLabels[d.createdAt.getMonth()]} ${d.createdAt.getFullYear()}`
    if (monthlyMap.has(key)) {
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + 1)
    }
  }
  const monthlyChartData = Array.from(monthlyMap.entries()).map(([month, _count]) => ({
    month,
    _count,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Dashboard"
        description={`Welcome back, ${session.user.name ?? session.user.email}`}
      />

      <div className="grid gap-4 md:grid-cols-5">
        <DashboardCard
          title="Total Defects"
          value={totalDefects}
          icon={BugIcon}
          subtitle="All assigned quality issues"
        />
        <DashboardCard
          title="Open"
          value={openDefects}
          icon={AlertTriangleIcon}
          subtitle="Awaiting your 8D report"
        />
        <DashboardCard
          title="In Progress"
          value={inProgress}
          icon={ClockIcon}
          subtitle="Being drafted"
        />
        <DashboardCard
          title="Awaiting Approval"
          value={waitingApproval}
          icon={TimerIcon}
          subtitle="Submitted to customer"
        />
        <DashboardCard
          title="Resolved"
          value={resolved}
          icon={CheckCircleIcon}
          subtitle="Successfully closed"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Defect Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusDonut data={defectCounts} total={totalDefects} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top Customers by Defects</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerBar data={customerChartData} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Monthly Defect Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendArea data={monthlyChartData} />
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-1 text-sm font-medium">Avg Resolution Time</h3>
        <p className="text-2xl font-bold">{avgResolutionDays !== null ? `${avgResolutionDays} days` : "—"}</p>
        <p className="text-xs text-muted-foreground">{avgResolutionDays !== null ? "Mean time from creation to resolution" : "No resolved defects yet"}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          title="Overdue Assigned"
          value={overdueAssigned}
          icon={AlertTriangleIcon}
          subtitle="Assigned to you and past due"
        />
        <DashboardCard
          title="Due This Week"
          value={dueThisWeek}
          icon={TimerIcon}
          subtitle="Active SLA dates in next 7 days"
        />
        <DashboardCard
          title="Customer Review"
          value={waitingApproval}
          icon={ClockIcon}
          subtitle="Waiting for OEM approval"
        />
      </div>
    </div>
  )
}
