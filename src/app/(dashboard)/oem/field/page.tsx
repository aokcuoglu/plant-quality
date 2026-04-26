import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { PageHeader } from "@/components/layout/PageHeader"
import { SearchInput } from "@/components/ui/search-input"
import { FieldDefectStatusBadge } from "@/components/field/FieldDefectStatusBadge"
import { FieldDefectSeverityBadge } from "@/components/field/FieldDefectSeverityBadge"
import { getFieldDefects } from "@/app/(dashboard)/field/actions"
import { PlusCircleIcon } from "lucide-react"
import { FIELD_DEFECT_SOURCE_LABELS } from "@/lib/field-defect"
import { FIELD_DEFECT_PAGE_SIZE } from "@/lib/field-defect-types"

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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="h-11 px-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="p-3 align-middle">{children}</td>
}

export default async function OemFieldPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; page?: string }>
}) {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") redirect("/login")

  const params = await searchParams
  const filter = params.filter ?? ""
  const search = params.q ?? ""
  const page = parseInt(params.page ?? "1", 10)

  const { fieldDefects, totalCount } = await getFieldDefects(filter, search, page)
  const totalPages = Math.ceil(totalCount / FIELD_DEFECT_PAGE_SIZE)

  function buildUrl(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams()
    const f = overrides.filter ?? filter
    const q = overrides.q ?? search
    const p = overrides.page ?? String(page)
    if (f) sp.set("filter", f)
    if (q) sp.set("q", q)
    if (p !== "1") sp.set("page", p)
    const qs = sp.toString()
    return qs ? `/oem/field?${qs}` : "/oem/field"
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field Quality"
        description="Track and manage field defects from the field"
        actions={
          <Link
            href="/oem/field/new"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
          >
            <PlusCircleIcon className="h-4 w-4" />
            New Field Defect
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((sf) => (
          <Link
            key={sf.value}
            href={buildUrl({ filter: sf.value, page: undefined })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === sf.value
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {sf.label}
          </Link>
        ))}
        {SEVERITY_FILTERS.map((sf) => (
          <Link
            key={sf.value}
            href={buildUrl({ filter: sf.value, page: undefined })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === sf.value
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {sf.label}
          </Link>
        ))}
      </div>

      <div className="w-full max-w-sm">
        <SearchInput placeholder="Search title, VIN, part number..." preserveParams={["filter"]} />
      </div>

      {fieldDefects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No field defects found</p>
          <Link
            href="/oem/field/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            <PlusCircleIcon className="h-4 w-4" />
            Create First Field Defect
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <Th>Title</Th>
                <Th>Status</Th>
                <Th>Severity</Th>
                <Th>Source</Th>
                <Th>Supplier</Th>
                <Th>VIN</Th>
                <Th>Vehicle</Th>
                <Th>Part #</Th>
                <Th>Report Date</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {fieldDefects.map((fd) => (
                <tr key={fd.id} className="border-b transition-colors hover:bg-muted/50">
                  <Td>
                    <Link href={`/oem/field/${fd.id}`} className="font-medium text-foreground hover:underline">
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
                </tr>
              ))}
            </tbody>
          </table>
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