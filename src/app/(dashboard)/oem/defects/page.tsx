import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getDefects } from "./queries"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import { formatDueDate, getActionOwnerLabel } from "@/lib/sla"

export default async function DefectsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") redirect("/login")

  const { filter } = await searchParams
  const defects = await getDefects(filter)

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

      <div className="flex flex-wrap gap-2">
        {[
          ["all", "All"],
          ["overdue", "Overdue"],
          ["supplier", "Action by Supplier"],
          ["oem", "Action by OEM"],
          ["mine", "Assigned to Me"],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={value === "all" ? "/oem/defects" : `/oem/defects?filter=${value}`}
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

      <div className="rounded-lg border bg-card">
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
                <Td className="max-w-xs truncate">
                  <a href={`/oem/defects/${d.id}`} className="block text-muted-foreground hover:text-foreground transition-colors">{d.description}</a>
                </Td>
                <Td>
                  <a href={`/oem/defects/${d.id}`} className="block text-muted-foreground hover:text-foreground transition-colors">{d.supplierName}</a>
                </Td>
                <Td className="text-muted-foreground">{d.oemOwnerName ?? "—"}</Td>
                <Td className="text-muted-foreground">{d.supplierAssigneeName ?? "Unassigned"}</Td>
                <Td className="text-muted-foreground">{getActionOwnerLabel(d)}</Td>
                <Td>
                  <span className={d.isOverdue ? "rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300" : "text-muted-foreground"}>
                    {d.isOverdue ? `Overdue · ${formatDueDate(d.activeDueDate)}` : formatDueDate(d.activeDueDate)}
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
                <Td colSpan={9} className="py-16 text-center text-muted-foreground">
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
    <td className={`p-3 align-middle whitespace-nowrap ${className ?? ""}`} colSpan={colSpan}>
      {children}
    </td>
  )
}
