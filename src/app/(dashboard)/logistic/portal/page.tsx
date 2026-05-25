import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isPortalUser } from "@/lib/logistic/portal-access"
import { getPortalDashboardStats } from "./actions"
import { DashboardCard } from "@/components/layout/DashboardCard"
import { PackageIcon, Factory, TruckIcon, CheckCircle, BarChart3, Inbox, PlusCircle } from "lucide-react"
import Link from "next/link"

export default async function PortalOverviewPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!isPortalUser(session.user.companyType)) redirect("/logistic")

  const result = await getPortalDashboardStats()
  const stats = "data" in result && result.data ? result.data : { total: 0, inProduction: 0, readyForDispatch: 0, inTransit: 0, delivered: 0 }

  const companyTypeLabel = session.user.companyType === "DEALER" ? "Dealer" : "Distributor"

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Order Tracking Portal</h1>
          <p className="text-sm text-muted-foreground">
            Welcome, {session.user.name ?? session.user.email}. Viewing orders assigned to {session.user.companyName} ({companyTypeLabel}).
          </p>
        </div>
        <Link
          href="/logistic/portal/orders/new"
          className="inline-flex items-center gap-1.5 shrink-0 rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-emerald-600 transition-colors"
        >
          <PlusCircle className="size-4" />
          New Order
        </Link>
      </div>

      {stats.total === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Inbox className="size-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">No visible orders yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">Submit your first order request to get started.</p>
          <Link
            href="/logistic/portal/orders/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-emerald-600 transition-colors"
          >
            <PlusCircle className="size-4" />
            Create First Order
          </Link>
        </div>
      ) : (
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
      )}
    </div>
  )
}