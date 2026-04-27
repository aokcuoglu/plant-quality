import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { BugIcon, AlertTriangleIcon, ClockIcon, GaugeIcon, SparklesIcon, PlusCircleIcon } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { DashboardCard } from "@/components/layout/DashboardCard"
import { Button } from "@/components/ui/button"
import { getQualityIntelligenceSummary } from "@/app/(dashboard)/quality/intelligence-actions"

function RankingTable({
  title,
  items,
  hrefPrefix,
  emptyMessage,
}: {
  title: string
  items: { name: string; count: number }[]
  hrefPrefix?: string
  emptyMessage: string
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="divide-y">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5">
              {hrefPrefix ? (
                <Link href={`${hrefPrefix}${encodeURIComponent(item.name)}`} className="text-sm text-foreground hover:underline truncate max-w-[calc(100%-3rem)]">
                  {item.name}
                </Link>
              ) : (
                <span className="text-sm text-foreground truncate max-w-[calc(100%-3rem)]">{item.name}</span>
              )}
              <span className="text-sm font-medium text-muted-foreground ml-4 shrink-0">{item.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default async function QualityIntelligencePage() {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") redirect("/login")

  const data = await getQualityIntelligenceSummary()
  if (!data) redirect("/login")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality Intelligence"
        description="Category trends, AI acceptance, and field defect analytics"
      />

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        <DashboardCard
          title="Total Field Defects"
          value={data.totalDefects}
          icon={BugIcon}
          subtitle="All reported defects"
          href="/quality/oem/field"
        />
        <DashboardCard
          title="Open Field Defects"
          value={data.openDefects}
          icon={AlertTriangleIcon}
          subtitle="Active defects"
          href="/quality/oem/field?filter=active"
        />
        <DashboardCard
          title="Overdue Field Defects"
          value={data.overdueDefects}
          icon={ClockIcon}
          subtitle="Past SLA deadline"
          href="/quality/oem/field?filter=overdue"
        />
        <DashboardCard
          title="Critical Field Defects"
          value={data.criticalDefects}
          icon={GaugeIcon}
          subtitle="Critical severity"
          href="/quality/oem/field?filter=critical"
        />
      </div>

      {data.aiAcceptanceRate !== null ? (
        <DashboardCard
          title="AI Suggestion Acceptance Rate"
          value={`${data.aiAcceptanceRate}%`}
          icon={SparklesIcon}
          subtitle={`${data.acceptedClassificationSuggestions} of ${data.totalClassificationSuggestions} classification suggestions accepted`}
        />
      ) : data.totalDefects > 0 ? (
        <DashboardCard
          title="AI Suggestion Acceptance Rate"
          value="—"
          icon={SparklesIcon}
          subtitle="No classification suggestions generated yet"
        />
      ) : null}

      {data.totalDefects === 0 && (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center">
          <BugIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No field defects yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Create your first field defect to see quality intelligence analytics.</p>
          <Link href="/quality/oem/field/new" className="mt-4 inline-block">
            <Button>
              <PlusCircleIcon className="mr-1.5 h-4 w-4" />
              Create First Field Defect
            </Button>
          </Link>
        </div>
      )}

      {data.totalDefects > 0 && (
        <h2 className="text-lg font-semibold text-foreground pt-2">Top Categories & Subcategories</h2>
      )}
      {data.totalDefects > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <RankingTable
            title="Top Categories"
            items={data.topCategories}
            hrefPrefix="/quality/oem/field?filter=cat:"
            emptyMessage="No categories assigned yet"
          />
          <RankingTable
            title="Top Subcategories"
            items={data.topSubcategories}
            hrefPrefix="/quality/oem/field?filter=subcat:"
            emptyMessage="No subcategories assigned yet"
          />
        </div>
      )}

      {data.totalDefects > 0 && (
        <h2 className="text-lg font-semibold text-foreground pt-2">Affected Vehicles, Suppliers & Parts</h2>
      )}

      {data.totalDefects > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <RankingTable
            title="Top Vehicle Models"
            items={data.topVehicleModels}
            emptyMessage="No vehicle data yet"
          />
          <RankingTable
            title="Top Suppliers"
            items={data.topSuppliers.map((s) => ({ name: s.name, count: s.count }))}
            emptyMessage="No supplier data yet"
          />
          <RankingTable
            title="Top Recurring Part Numbers"
            items={data.topPartNumbers}
            emptyMessage="No part number data yet"
          />
        </div>
      )}
    </div>
  )
}