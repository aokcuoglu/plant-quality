import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isPortalUser } from "@/lib/logistic/portal-access"
import { getPortalDashboardStats } from "./actions"
import { DashboardCard } from "@/components/layout/DashboardCard"
import { PackageIcon, Factory, TruckIcon, CheckCircle, BarChart3 } from "lucide-react"

export default async function PortalOverviewPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!isPortalUser(session.user.companyType)) redirect("/logistic")

  const result = await getPortalDashboardStats()
  const stats = "data" in result ? result.data : { total: 0, inProduction: 0, readyForDispatch: 0, inTransit: 0, delivered: 0 }

  const companyTypeLabel = session.user.companyType === "DEALER" ? "Dealer" : "Distributor"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Order Tracking Portal</h1>
        <p className="text-sm text-muted-foreground">
          Welcome, {session.user.name ?? session.user.email}. Viewing orders assigned to {session.user.companyName} ({companyTypeLabel}).
        </p>
      </div>

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <DashboardCard
          title="Total Orders"
          value={String(stats?.total ?? 0)}
          icon={BarChart3}
        />
        <DashboardCard
          title="In Production"
          value={String(stats?.inProduction ?? 0)}
          icon={Factory}
        />
        <DashboardCard
          title="Ready for Dispatch"
          value={String(stats?.readyForDispatch ?? 0)}
          icon={PackageIcon}
        />
        <DashboardCard
          title="In Transit"
          value={String(stats?.inTransit ?? 0)}
          icon={TruckIcon}
        />
        <DashboardCard
          title="Delivered"
          value={String(stats?.delivered ?? 0)}
          icon={CheckCircle}
        />
      </div>
    </div>
  )
}