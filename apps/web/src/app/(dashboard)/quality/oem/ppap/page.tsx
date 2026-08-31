import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { requireFeature } from "@/lib/billing"
import { FileTextIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { getPpapStatusColor, PPAP_STATUS_LABELS, isPpapOverdue } from "@/lib/ppap"
import { Button } from "@/components/ui/button"
import { SupplierFilterBadge } from "@/components/supplier-filter-badge"
import { getOemSupplierName } from "@/lib/get-oem-supplier-name"
import { resolveFieldConfig } from "@/lib/custom-fields/resolver"
import { getListVisibleFields, CustomFieldsTableHeaders, CustomFieldsTableCells } from "@/components/custom-fields/CustomFieldsTableColumns"
import type { ResolvedFields } from "@/lib/custom-fields/resolver"

export default async function OemPpapPage({
  searchParams,
}: {
  searchParams: Promise<{ supplierId?: string }>
}) {
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")
  const ppapGate = requireFeature(session, "PPAP")
  if (!ppapGate.allowed) redirect("/quality/oem")

  const { supplierId } = await searchParams

  let supplierFilterName: string | null = null
  if (supplierId) {
    supplierFilterName = await getOemSupplierName(session.user.companyId, supplierId)
  }

  const whereCondition: Record<string, unknown> = { oemId: session.user.companyId }
  if (supplierId) {
    whereCondition.supplierId = supplierId
  }

  const submissions = await prisma.ppapSubmission.findMany({
    where: whereCondition,
    orderBy: { createdAt: "desc" },
    include: {
      supplier: { select: { name: true } },
      oemOwner: { select: { name: true, email: true } },
      evidences: { where: { deletedAt: null }, select: { id: true, status: true, requirement: true } },
    },
  })

  let fieldConfig: ResolvedFields
  try {
    if (session.user.plan === "ENTERPRISE") {
      fieldConfig = await resolveFieldConfig(session.user.companyId, "PPAP_SUBMISSION")
    } else {
      fieldConfig = { all: [], visible: [], builtIn: [], custom: [] }
    }
  } catch {
    fieldConfig = { all: [], visible: [], builtIn: [], custom: [] }
  }
  const listVisibleFields = getListVisibleFields(fieldConfig.all)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">PPAP Submissions</h1>
          <p className="text-sm text-muted-foreground">Production Part Approval Process tracking</p>
        </div>
        <Link href="/quality/oem/ppap/new">
          <Button className="gap-1.5">
            <PlusIcon className="h-4 w-4" />
            New PPAP Request
          </Button>
        </Link>
      </div>

      {supplierFilterName && (
        <SupplierFilterBadge supplierName={supplierFilterName} clearHref="/quality/oem/ppap" />
      )}

      {submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <FileTextIcon className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-sm font-medium text-foreground">No PPAP submissions yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">Create your first PPAP request to get started</p>
          <Link href="/quality/oem/ppap/new" className="mt-4">
            <Button className="gap-1.5">
              <PlusIcon className="h-4 w-4" />
              New PPAP Request
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <Table className="w-full text-sm">
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Request #</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Part</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Level</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Supplier</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Docs</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Due Date</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Created</TableHead>
                  <CustomFieldsTableHeaders fields={listVisibleFields} />
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {submissions.map((s) => {
                  const totalRequired = s.evidences.length
                  const completed = s.evidences.filter((e) => e.status === "APPROVED").length
                  const overdue = isPpapOverdue(s.dueDate, s.status)
                  return (
                    <TableRow key={s.id} className="transition-colors hover:bg-muted/50">
                      <TableCell className="px-4 py-3">
                        <Link href={`/quality/oem/ppap/${s.id}`} className="font-medium text-foreground hover:text-foreground">{s.requestNumber}</Link>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="text-foreground">{s.partNumber}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{s.partName}</div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">{s.level.replace("LEVEL_", "Level ")}</TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground truncate max-w-[150px]">{s.supplier.name}</TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">
                        {completed}/{totalRequired}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getPpapStatusColor(s.status)}`}>
                          {PPAP_STATUS_LABELS[s.status] ?? s.status}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {overdue ? (
                          <span className="text-xs font-medium text-destructive">Overdue</span>
                        ) : (
                          <span className="text-muted-foreground">{s.dueDate?.toLocaleDateString() ?? "—"}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">{s.createdAt.toLocaleDateString()}</TableCell>
                      <CustomFieldsTableCells fields={listVisibleFields} customFields={s.customFields as Record<string, unknown> | null} />
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}