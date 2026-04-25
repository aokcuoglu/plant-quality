import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getDefects, PAGE_SIZE } from "./queries"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { PlusIcon } from "lucide-react"
import { formatDueDate, getActionOwnerLabel } from "@/lib/sla"

export default async function DefectsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; page?: string }>
}) {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") redirect("/login")

  const { filter, q, page: pageStr } = await searchParams
  const search = q || undefined
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1)
  const { defects, totalCount } = await getDefects(filter, search, page)
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  function buildUrl(params: { filter?: string; q?: string; page?: number }) {
    const sp = new URLSearchParams()
    if (params.filter && params.filter !== "all") sp.set("filter", params.filter)
    if (params.q) sp.set("q", params.q)
    if (params.page && params.page > 1) sp.set("page", String(params.page))
    const qs = sp.toString()
    return qs ? `/oem/defects?${qs}` : "/oem/defects"
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Defects"
        description="Manage quality defect reports"
        actions={
          <Link href="/oem/defects/new">
            <Button>
              <PlusIcon className="mr-1.5 h-4 w-4" />
              New Defect
            </Button>
          </Link>
        }
      />

      <SearchInput placeholder="Search by part number or description…" />

      <div className="flex flex-wrap gap-2">
        {[
          ["all", "All"],
          ["open", "Open"],
          ["waiting-approval", "Waiting Approval"],
          ["in-progress", "In Progress"],
          ["overdue", "Overdue"],
          ["supplier", "Action by Supplier"],
          ["oem", "Action by OEM"],
          ["mine", "Assigned to Me"],
          ["evidence-missing", "Evidence Missing"],
          ["evidence-ready", "Evidence Ready"],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={buildUrl({ filter: value, q: search })}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              (value === "all" && !filter) || filter === value
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full caption-bottom text-sm">
          <thead>
            <tr className="border-b">
              <Th>Part Number</Th>
              <Th>Description</Th>
              <Th>Supplier</Th>
              <Th>Owner</Th>
              <Th>Assignee</Th>
              <Th>Action</Th>
              <Th>Due</Th>
              <Th>Evidence</Th>
              <Th>Status</Th>
              <Th>Created</Th>
            </tr>
          </thead>
          <tbody>
            {defects.map((d) => (
              <tr key={d.id} className="border-b transition-colors hover:bg-muted/50 cursor-pointer">
                <Td className="font-mono text-xs">
                  <a href={`/oem/defects/${d.id}`} className="text-foreground hover:text-primary transition-colors">{d.partNumber}</a>
                </Td>
                <Td>
                  <a href={`/oem/defects/${d.id}`} className="block max-w-[160px] truncate text-muted-foreground hover:text-foreground transition-colors">{d.description}</a>
                </Td>
                <Td>
                  <a href={`/oem/defects/${d.id}`} className="block max-w-[100px] truncate text-muted-foreground hover:text-foreground transition-colors">{d.supplierName}</a>
                </Td>
                <Td className="text-muted-foreground">{d.oemOwnerName ?? "—"}</Td>
                <Td className="text-muted-foreground">{d.supplierAssigneeName ?? "Unassigned"}</Td>
                <Td className="text-muted-foreground">{getActionOwnerLabel(d)}</Td>
                <Td>
                  <span className={d.isOverdue ? "inline-block max-w-[140px] truncate rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300" : "inline-block max-w-[120px] truncate text-muted-foreground"}>
                    {d.isOverdue ? `Overdue · ${formatDueDate(d.activeDueDate)}` : formatDueDate(d.activeDueDate)}
                  </span>
                </Td>
                <Td>
                  <span className={d.evidenceReady ? "inline-block rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "inline-block rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"}>
                    {d.evidenceReady ? "Ready" : "Missing"}
                  </span>
                </Td>
                <Td>
                  <StatusBadge status={d.status} />
                </Td>
                <Td className="text-muted-foreground">
                  {d.createdAt.toLocaleDateString()}
                </Td>
              </tr>
            ))}
            {defects.length === 0 && (
              <tr>
                <Td colSpan={10} className="py-16 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm">No defects reported yet.</p>
                    <Link href="/oem/defects/new" className="text-xs text-primary hover:underline">
                      Report your first defect
                    </Link>
                  </div>
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={buildUrl({ filter, q: search, page: page - 1 })} className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                Previous
              </Link>
            ) : (
              <span className="rounded-md border px-3 py-1.5 text-xs font-medium opacity-50 cursor-not-allowed">Previous</span>
            )}
            {page < totalPages ? (
              <Link href={buildUrl({ filter, q: search, page: page + 1 })} className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                Next
              </Link>
            ) : (
              <span className="rounded-md border px-3 py-1.5 text-xs font-medium opacity-50 cursor-not-allowed">Next</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="h-11 px-3 text-left align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </th>
  )
}

function Td({ children, className, colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) {
  return (
    <td className={`p-3 align-middle ${className ?? ""}`} colSpan={colSpan}>
      {children}
    </td>
  )
}