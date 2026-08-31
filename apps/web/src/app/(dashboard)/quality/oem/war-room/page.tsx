import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AlertTriangleIcon, ClockIcon, AlertCircleIcon, TimerIcon } from "lucide-react"
import { requireFeature } from "@/lib/billing"
import { PageHeader } from "@/components/layout/PageHeader"
import { DashboardCard } from "@/components/layout/DashboardCard"
import { EscalationBadge } from "@/components/field/EscalationBadge"
import { SlaStatusBadge } from "@/components/field/SlaStatusBadge"
import { FieldDefectSeverityBadge } from "@/components/field/FieldDefectSeverityBadge"
import { FieldDefectStatusBadge } from "@/components/field/FieldDefectStatusBadge"
import { getActiveEscalations } from "@/app/(dashboard)/_actions/escalations"
import { formatDueDate } from "@/lib/sla"
import type { EscalationLevel } from "@plantx/db/client"

export default async function WarRoomPage() {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") redirect("/login")
  const warRoomGate = requireFeature(session, "WAR_ROOM")
  if (!warRoomGate.allowed) redirect("/quality/oem")

  const { escalated, overdue, totalCount } = await getActiveEscalations()

  const criticalCount = escalated.filter((e) => e.escalationLevel === "LEVEL_3").length
  const highCount = escalated.filter((e) => e.escalationLevel === "LEVEL_2").length
  const mediumCount = escalated.filter((e) => e.escalationLevel === "LEVEL_1").length
  const overdueCount = overdue.filter((o) => o.slaStatus === "overdue").length
  const dueSoonCount = overdue.filter((o) => o.slaStatus === "due-soon").length

  const hasItems = totalCount > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="War Room"
        description="Active escalations and SLA alerts requiring immediate attention"
      />

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        <DashboardCard title="Level 3 (Critical)" value={criticalCount} icon={AlertTriangleIcon} />
        <DashboardCard title="Level 2 (High)" value={highCount} icon={AlertCircleIcon} />
        <DashboardCard title="Level 1 (Medium)" value={mediumCount} icon={AlertTriangleIcon} />
        <DashboardCard title="Overdue" value={overdueCount} icon={ClockIcon} />
        <DashboardCard title="Due Soon" value={dueSoonCount} icon={TimerIcon} />
      </div>

      {!hasItems ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <AlertTriangleIcon className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-muted-foreground">No active escalations or SLA alerts</p>
          <p className="text-sm text-muted-foreground mt-1">All field defects are within normal SLA thresholds</p>
        </div>
      ) : (
        <>
          {escalated.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Escalated Field Defects</h2>
              <div className="rounded-lg border bg-card overflow-x-auto">
                <Table className="w-full text-sm">
                  <TableHeader className="border-b">
                    <TableRow>
                      <TableHead className="h-11 px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Title</TableHead>
                      <TableHead className="px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Part #</TableHead>
                      <TableHead className="px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Severity</TableHead>
                      <TableHead className="px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</TableHead>
                      <TableHead className="px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Escalation</TableHead>
                      <TableHead className="px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Supplier</TableHead>
                      <TableHead className="px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Response Due</TableHead>
                      <TableHead className="px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {escalated.map((esc) => (
                      <TableRow key={esc.id} className="border-b transition-colors hover:bg-muted/50">
                        <TableCell className="p-3 align-middle">
                          <Link href={`/quality/oem/field/${esc.id}`} className="font-medium text-foreground hover:underline">
                            {esc.title.length > 35 ? esc.title.slice(0, 35) + "…" : esc.title}
                          </Link>
                        </TableCell>
                        <TableCell className="p-3 align-middle">
                          <span className="font-mono text-xs">{esc.partNumber ?? "—"}</span>
                        </TableCell>
                        <TableCell className="p-3 align-middle">
                          <FieldDefectSeverityBadge severity={esc.severity as "MINOR" | "MAJOR" | "CRITICAL"} />
                        </TableCell>
                        <TableCell className="p-3 align-middle">
                          <FieldDefectStatusBadge status={esc.status as "DRAFT" | "OPEN" | "UNDER_REVIEW" | "SUPPLIER_ASSIGNED" | "LINKED_TO_8D" | "CLOSED" | "CANCELLED"} />
                        </TableCell>
                        <TableCell className="p-3 align-middle">
                          <EscalationBadge level={esc.escalationLevel as EscalationLevel} />
                        </TableCell>
                        <TableCell className="p-3 align-middle text-muted-foreground">
                          {esc.supplierName ?? "—"}
                        </TableCell>
                        <TableCell className="p-3 align-middle text-xs">
                          {formatDueDate(esc.responseDueAt)}
                        </TableCell>
                        <TableCell className="p-3 align-middle max-w-xs truncate text-muted-foreground">
                          {esc.escalationReason ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {overdue.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-destructive" />
                SLA Alerts
              </h2>
              <div className="rounded-lg border bg-card overflow-x-auto">
                <Table className="w-full text-sm">
                  <TableHeader className="border-b">
                    <TableRow>
                      <TableHead className="h-11 px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Title</TableHead>
                      <TableHead className="px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Part #</TableHead>
                      <TableHead className="px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Severity</TableHead>
                      <TableHead className="px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</TableHead>
                      <TableHead className="px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">SLA</TableHead>
                      <TableHead className="px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Supplier</TableHead>
                      <TableHead className="px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Response Due</TableHead>
                      <TableHead className="px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Resolution Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdue.map((item) => (
                      <TableRow key={item.id} className="border-b transition-colors hover:bg-muted/50">
                        <TableCell className="p-3 align-middle">
                          <Link href={`/quality/oem/field/${item.id}`} className="font-medium text-foreground hover:underline">
                            {item.title.length > 35 ? item.title.slice(0, 35) + "…" : item.title}
                          </Link>
                        </TableCell>
                        <TableCell className="p-3 align-middle">
                          <span className="font-mono text-xs">{item.partNumber ?? "—"}</span>
                        </TableCell>
                        <TableCell className="p-3 align-middle">
                          <FieldDefectSeverityBadge severity={item.severity as "MINOR" | "MAJOR" | "CRITICAL"} />
                        </TableCell>
                        <TableCell className="p-3 align-middle">
                          <FieldDefectStatusBadge status={item.status as "DRAFT" | "OPEN" | "UNDER_REVIEW" | "SUPPLIER_ASSIGNED" | "LINKED_TO_8D" | "CLOSED" | "CANCELLED"} />
                        </TableCell>
                        <TableCell className="p-3 align-middle">
                          <SlaStatusBadge status={item.slaStatus as "overdue" | "due-soon" | "on-track" | "no-sla" | "completed"} />
                        </TableCell>
                        <TableCell className="p-3 align-middle text-muted-foreground">
                          {item.supplierName ?? "—"}
                        </TableCell>
                        <TableCell className="p-3 align-middle text-xs">
                          {formatDueDate(item.responseDueAt)}
                        </TableCell>
                        <TableCell className="p-3 align-middle text-xs">
                          {formatDueDate(item.resolutionDueAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}