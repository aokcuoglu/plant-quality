import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatDueDate, getActionOwnerLabel, isDefectOverdue, getActiveDueDate } from "@/lib/sla"
import { hasRequiredSubmissionEvidence } from "@/lib/evidence"
import Link from "next/link"
import type { EightDSection } from "@/generated/prisma/client"

function getEvidenceReady(evidences: { section: EightDSection }[]) {
  const counts = evidences.reduce<Partial<Record<EightDSection, number>>>((acc, item) => {
    acc[item.section] = (acc[item.section] ?? 0) + 1
    return acc
  }, {})
  return hasRequiredSubmissionEvidence(counts)
}

export default async function SupplierDefectsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const session = await auth()
  if (!session || session.user.companyType !== "SUPPLIER") redirect("/login")
  const { filter } = await searchParams

  const defects = await prisma.defect.findMany({
    where: { supplierId: session.user.companyId },
    include: {
      oem: { select: { name: true } },
      supplierAssignee: { select: { name: true, email: true } },
      evidences: { where: { deletedAt: null }, select: { section: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  const rows = defects
    .map((d) => ({
      ...d,
      activeDueDate: getActiveDueDate(d),
      isOverdue: isDefectOverdue(d),
      supplierAssigneeName: d.supplierAssignee?.name ?? d.supplierAssignee?.email ?? null,
      evidenceReady: getEvidenceReady(d.evidences),
    }))
    .filter((d) => {
      if (filter === "overdue") return d.isOverdue
      if (filter === "mine") return d.supplierAssigneeId === session.user.id
      if (filter === "waiting-customer") return d.currentActionOwner === "OEM"
      if (filter === "evidence-ready") return d.evidenceReady
      if (filter === "evidence-missing") return !d.evidenceReady
      return true
    })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Defects"
        description="Quality defect reports from your customers"
      />

      <div className="flex flex-wrap gap-2">
        {[
          ["all", "All"],
          ["overdue", "Overdue"],
          ["mine", "Assigned to Me"],
          ["waiting-customer", "Waiting Customer Review"],
          ["evidence-missing", "Evidence Missing"],
          ["evidence-ready", "Evidence Ready"],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={value === "all" ? "/supplier/defects" : `/supplier/defects?filter=${value}`}
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
              <Th>Customer</Th>
              <Th>Assignee</Th>
              <Th>Action</Th>
              <Th>Due</Th>
              <Th>Evidence</Th>
              <Th>Status</Th>
              <Th>Received</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-b transition-colors hover:bg-muted/50 cursor-pointer">
                <Td className="font-mono text-xs">
                  <a href={`/supplier/defects/${d.id}`} className="text-foreground hover:text-primary transition-colors">{d.partNumber}</a>
                </Td>
                <Td>
                  <a href={`/supplier/defects/${d.id}`} className="block max-w-[160px] truncate text-muted-foreground hover:text-foreground transition-colors">{d.description}</a>
                </Td>
                <Td>
                  <a href={`/supplier/defects/${d.id}`} className="block max-w-[100px] truncate text-muted-foreground hover:text-foreground transition-colors">{d.oem.name}</a>
                </Td>
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
            {rows.length === 0 && (
              <tr>
                <Td colSpan={9} className="py-16 text-center text-muted-foreground">
                  <p className="text-sm">No defects reported yet.</p>
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
    <td className={`p-3 align-middle ${className ?? ""}`} colSpan={colSpan}>
      {children}
    </td>
  )
}
