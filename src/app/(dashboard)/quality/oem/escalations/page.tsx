import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { requireFeature } from "@/lib/billing"
import { PageHeader } from "@/components/layout/PageHeader"
import { EscalationBadge } from "@/components/field/EscalationBadge"
import { getEscalations } from "@/app/(dashboard)/_actions/escalations"

const LEVEL_FILTERS = [
  { value: "", label: "All" },
  { value: "level-1", label: "Level 1" },
  { value: "level-2", label: "Level 2" },
  { value: "level-3", label: "Level 3" },
]

export default async function OemEscalationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>
}) {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") redirect("/login")
  const escalationGate = requireFeature(session, "ESCALATION")
  if (!escalationGate.allowed) redirect("/quality/oem")

  const params = await searchParams
  const filter = params.filter ?? ""
  const page = parseInt(params.page ?? "1", 10)

  const { escalations } = await getEscalations(filter || undefined, page)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Escalations"
        description="Escalation history for field defects in your organization"
      />

      <div className="flex flex-wrap items-center gap-2">
        {LEVEL_FILTERS.map((lf) => (
          <Link
            key={lf.value}
            href={lf.value ? `/quality/oem/escalations?filter=${lf.value}` : "/quality/oem/escalations"}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === lf.value
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {lf.label}
          </Link>
        ))}
      </div>

      {escalations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No escalations found</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="h-11 px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Field Defect</th>
                <th className="px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">From → To</th>
                <th className="px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Reason</th>
                <th className="px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Escalated By</th>
                <th className="px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {escalations.map((esc) => (
                <tr key={esc.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-3 align-middle">
                    <Link href={`/quality/oem/field/${esc.entityId}`} className="font-medium text-foreground hover:underline">
                      {esc.fieldDefectTitle}
                    </Link>
                    {esc.partNumber && (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">({esc.partNumber})</span>
                    )}
                  </td>
                  <td className="p-3 align-middle">
                    <div className="flex items-center gap-1">
                      <EscalationBadge level={esc.previousLevel} />
                      <span className="text-muted-foreground">→</span>
                      <EscalationBadge level={esc.newLevel} />
                    </div>
                  </td>
                  <td className="p-3 align-middle max-w-xs truncate text-muted-foreground">
                    {esc.reason}
                  </td>
                  <td className="p-3 align-middle text-muted-foreground">
                    {esc.createdByName}
                  </td>
                  <td className="p-3 align-middle text-xs text-muted-foreground">
                    {new Date(esc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}