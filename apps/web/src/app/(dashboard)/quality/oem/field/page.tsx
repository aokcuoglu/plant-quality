import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { PlusCircleIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import { SearchInput } from "@/components/ui/search-input"
import { Button } from "@/components/ui/button"
import { FieldDefectStatusBadge } from "@/components/field/FieldDefectStatusBadge"
import { FieldDefectSeverityBadge } from "@/components/field/FieldDefectSeverityBadge"
import { SlaStatusBadge } from "@/components/field/SlaStatusBadge"
import { EscalationBadge } from "@/components/field/EscalationBadge"
import { getFieldDefects } from "@/app/(dashboard)/field/actions"
import { FIELD_DEFECT_SOURCE_LABELS } from "@/lib/field-defect"
import { FIELD_DEFECT_PAGE_SIZE } from "@/lib/field-defect-types"
import { getFieldDefectSlaStatus } from "@/lib/sla-field-defect"
import { SupplierFilterBadge } from "@/components/supplier-filter-badge"
import { getOemSupplierName } from "@/lib/get-oem-supplier-name"
import { resolveFieldConfig } from "@/lib/custom-fields/resolver"
import { getListVisibleFields, CustomFieldsTableHeaders, CustomFieldsTableCells } from "@/components/custom-fields/CustomFieldsTableColumns"
import { ExportCsvButton } from "@/components/custom-fields/ExportCsvButton"
import type { ResolvedFields } from "@/lib/custom-fields/resolver"

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "under-review", label: "Under Review" },
  { value: "supplier-assigned", label: "Supplier Assigned" },
  { value: "linked-to-8d", label: "Linked to 8D" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
]

const SEVERITY_FILTERS: { value: string; label: string }[] = [
  { value: "critical", label: "Critical" },
  { value: "major", label: "Major" },
  { value: "minor", label: "Minor" },
]

const SLA_FILTERS: { value: string; label: string }[] = [
  { value: "overdue", label: "Overdue" },
  { value: "escalated", label: "Escalated" },
]

function Th({ children }: { children: React.ReactNode }) {
  return (
    <TableHead className="h-11 px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </TableHead>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <TableCell className="p-3 align-middle">{children}</TableCell>
}

export default async function OemFieldPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; page?: string; supplierId?: string }>
}) {
  const session = await auth()
  if (!session?.user?.companyId || session.user.companyType !== "OEM") redirect("/login")

  const params = await searchParams
  const filter = params.filter ?? ""
  const search = params.q ?? ""
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const supplierId = params.supplierId ?? ""

  let supplierFilterName: string | null = null
  if (supplierId) {
    supplierFilterName = await getOemSupplierName(session.user.companyId, supplierId)
  }

  const { fieldDefects, totalCount } = await getFieldDefects(filter, search, page, supplierId || undefined)
  const totalPages = Math.ceil(totalCount / FIELD_DEFECT_PAGE_SIZE)

  let fieldConfig: ResolvedFields
  try {
    if (session.user.plan === "ENTERPRISE") {
      fieldConfig = await resolveFieldConfig(session.user.companyId, "FIELD_DEFECT")
    } else {
      fieldConfig = { all: [], visible: [], builtIn: [], custom: [] }
    }
  } catch {
    fieldConfig = { all: [], visible: [], builtIn: [], custom: [] }
  }
  const listVisibleFields = getListVisibleFields(fieldConfig.all)

  function buildUrl(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams()
    const f = overrides.filter ?? filter
    const q = overrides.q ?? search
    const p = overrides.page ?? String(page)
    if (f) sp.set("filter", f)
    if (q) sp.set("q", q)
    if (p !== "1") sp.set("page", p)
    if (supplierId && !overrides.hasOwnProperty("supplierId")) sp.set("supplierId", supplierId)
    else if (overrides.supplierId) sp.set("supplierId", overrides.supplierId)
    const qs = sp.toString()
    return qs ? `/quality/oem/field?${qs}` : "/quality/oem/field"
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field Quality"
        description="Track and manage field defects from the field"
        actions={
          <Link href="/quality/oem/field/new">
            <Button>
              <PlusCircleIcon className="mr-1.5 h-4 w-4" />
              New Field Defect
            </Button>
          </Link>
        }
      />

      {supplierFilterName && (
        <SupplierFilterBadge supplierName={supplierFilterName} clearHref="/quality/oem/field" />
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((sf) => (
          <Link
            key={sf.value}
            href={buildUrl({ filter: sf.value, page: undefined })}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === sf.value
                ? "border border-primary bg-primary/10 text-primary"
                : "border border-transparent text-muted-foreground hover:bg-muted"
            )}
          >
            {sf.label}
          </Link>
        ))}
        {SEVERITY_FILTERS.map((sf) => (
          <Link
            key={sf.value}
            href={buildUrl({ filter: sf.value, page: undefined })}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === sf.value
                ? "border border-primary bg-primary/10 text-primary"
                : "border border-transparent text-muted-foreground hover:bg-muted"
            )}
          >
            {sf.label}
          </Link>
        ))}
        {SLA_FILTERS.map((sf) => (
          <Link
            key={sf.value}
            href={buildUrl({ filter: sf.value, page: undefined })}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === sf.value
                ? "border border-primary bg-primary/10 text-primary"
                : "border border-transparent text-muted-foreground hover:bg-muted"
            )}
          >
            {sf.label}
          </Link>
        ))}
      </div>

      {fieldDefects.length > 0 && (() => {
        const catCounts = new Map<string, number>()
        const subcatCounts = new Map<string, number>()
        fieldDefects.forEach((fd) => {
          if (fd.category) catCounts.set(fd.category, (catCounts.get(fd.category) ?? 0) + 1)
          if (fd.subcategory) subcatCounts.set(fd.subcategory, (subcatCounts.get(fd.subcategory) ?? 0) + 1)
        })
        const uniqueCategories = Array.from(catCounts.entries()).sort((a, b) => b[1] - a[1])
        const uniqueSubcategories = Array.from(subcatCounts.entries()).sort((a, b) => b[1] - a[1])
        if (uniqueCategories.length === 0 && uniqueSubcategories.length === 0) return null
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium mr-1">Category:</span>
            {uniqueCategories.map(([cat, count]) => (
              <Link
                key={cat}
                href={buildUrl({ filter: `cat:${cat}`, page: undefined })}
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
                  filter === `cat:${cat}`
                    ? "border border-primary bg-primary/10 text-primary"
                    : "border border-transparent bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {cat} ({count})
              </Link>
            ))}
            {uniqueSubcategories.map(([subcat, count]) => (
              <Link
                key={subcat}
                href={buildUrl({ filter: `subcat:${subcat}`, page: undefined })}
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
                  filter === `subcat:${subcat}`
                    ? "border border-primary bg-primary/10 text-primary"
                    : "border border-transparent bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {subcat} ({count})
              </Link>
            ))}
          </div>
        )
      })()}

      <div className="flex items-center gap-3">
        <div className="w-full max-w-sm">
          <SearchInput placeholder="Search title, VIN, part number..." preserveParams={["filter", "supplierId"]} />
        </div>
        {fieldDefects.length > 0 && (
          <ExportCsvButton
            fileName="field-defects.csv"
            headers={[
              { key: "title", label: "Title" },
              { key: "status", label: "Status" },
              { key: "severity", label: "Severity" },
              { key: "category", label: "Category" },
              { key: "supplierName", label: "Supplier" },
              { key: "vin", label: "VIN" },
              { key: "vehicleModel", label: "Vehicle" },
              { key: "partNumber", label: "Part #" },
              { key: "reportDate", label: "Report Date" },
              { key: "createdAt", label: "Created" },
            ]}
            rows={fieldDefects.map((fd) => ({
              ...fd,
              reportDate: fd.reportDate.toISOString(),
              createdAt: fd.createdAt.toISOString(),
              status: String(fd.status),
              severity: String(fd.severity),
              supplierName: fd.supplierName ?? "",
              vin: fd.vin ?? "",
              vehicleModel: fd.vehicleModel ?? "",
              partNumber: fd.partNumber ?? "",
            }))}
            listVisibleFields={listVisibleFields}
          />
        )}
      </div>

      {fieldDefects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No field defects found</p>
          <Link href="/quality/oem/field/new" className="mt-4">
            <Button>
              <PlusCircleIcon className="mr-1.5 h-4 w-4" />
              Create First Field Defect
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader className="border-b">
              <TableRow>
                <Th>Title</Th>
                <Th>Status</Th>
                <Th>Severity</Th>
                <Th>Category</Th>
                <Th>SLA</Th>
                <Th>Escalation</Th>
                <Th>Source</Th>
                <Th>Supplier</Th>
                <Th>VIN</Th>
                <Th>Vehicle</Th>
                <Th>Part #</Th>
                <Th>Report Date</Th>
                <Th>Created</Th>
                <CustomFieldsTableHeaders fields={listVisibleFields} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fieldDefects.map((fd) => (
                <TableRow key={fd.id} className="border-b transition-colors hover:bg-muted/50">
                  <Td>
                    <Link href={`/quality/oem/field/${fd.id}`} className="font-medium text-foreground hover:underline">
                      {fd.title.length > 40 ? fd.title.slice(0, 40) + "…" : fd.title}
                    </Link>
                  </Td>
                  <Td>
                    <FieldDefectStatusBadge status={fd.status} />
                  </Td>
                  <Td>
                    <FieldDefectSeverityBadge severity={fd.severity} />
                  </Td>
                  <Td>
                    <span className="text-xs text-muted-foreground">
                      {fd.category ? (
                        <>
                          {fd.category}
                          {fd.subcategory ? ` / ${fd.subcategory}` : ""}
                        </>
                      ) : (
                        <span className="italic">Uncategorized</span>
                      )}
                    </span>
                  </Td>
                  <Td>
                    <SlaStatusBadge status={getFieldDefectSlaStatus(fd)} />
                  </Td>
                  <Td>
                    {fd.escalationLevel !== "NONE" ? (
                      <EscalationBadge level={fd.escalationLevel} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </Td>
                  <Td>
                    <span className="text-xs text-muted-foreground">{FIELD_DEFECT_SOURCE_LABELS[fd.source]}</span>
                  </Td>
                  <Td>
                    <span className="text-sm text-muted-foreground">{fd.supplierName ?? "—"}</span>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs text-muted-foreground">{fd.vin ?? "—"}</span>
                  </Td>
                  <Td>
                    <span className="text-sm text-muted-foreground">{fd.vehicleModel ?? "—"}</span>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs">{fd.partNumber ?? "—"}</span>
                  </Td>
                  <Td>
                    <span className="text-xs text-muted-foreground">
                      {fd.reportDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs text-muted-foreground">
                      {fd.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </Td>
                  <CustomFieldsTableCells fields={listVisibleFields} customFields={fd.customFields ?? null} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          {page > 1 ? (
            <Link
              href={buildUrl({ page: String(page - 1) })}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Previous
            </Link>
          ) : (
            <span className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground/50">
              Previous
            </span>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={buildUrl({ page: String(page + 1) })}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Next
            </Link>
          ) : (
            <span className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground/50">
              Next
            </span>
          )}
        </div>
      )}
    </div>
  )
}
