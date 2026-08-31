import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ShieldAlertIcon } from "lucide-react"
import Link from "next/link"
import { getFmeaStatusColor, getRpnColor, isFmeaOverdue, FMEA_STATUS_LABELS, FMEA_TYPE_LABELS } from "@/lib/fmea"
import { getMaxRpn, type FmeaRow } from "@/lib/fmea/types"
import { requireFeature } from "@/lib/billing"
import type { FmeaStatus } from "@plantx/db/client"

export default async function SupplierFmeaPage() {
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "SUPPLIER") redirect("/quality/oem")

  const fmeaGate = requireFeature(session, "FMEA")
  if (!fmeaGate.allowed) redirect("/quality/supplier")

  const fmeas = await prisma.fmea.findMany({
    where: { supplierId: session.user.companyId },
    orderBy: { createdAt: "desc" },
    include: { oem: { select: { name: true } } },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">FMEA Analysis</h1>
        <p className="text-sm text-muted-foreground">Failure Mode and Effects Analysis</p>
      </div>

      {fmeas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <ShieldAlertIcon className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-sm font-medium text-foreground">No FMEA analyses yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">FMEA analyses will appear here when assigned by your OEM</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="w-full text-sm">
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/50">
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Number</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Title</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Part</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">OEM</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Max RPN</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {fmeas.map((f) => {
                  const rows = (f.rows as FmeaRow[] | null) ?? []
                  const maxRpn = getMaxRpn(rows)
                  const overdue = isFmeaOverdue(f.dueDate, f.status as FmeaStatus)
                  return (
                    <TableRow key={f.id} className="transition-colors hover:bg-muted/50">
                      <TableCell className="px-4 py-3">
                        <Link href={`/quality/supplier/fmea/${f.id}`} className="font-medium text-foreground hover:text-foreground">{f.fmeaNumber}</Link>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">{f.title}</TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">{FMEA_TYPE_LABELS[f.fmeaType] ?? f.fmeaType}</TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">{f.partNumber}</TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">{f.oem.name}</TableCell>
                      <TableCell className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getFmeaStatusColor(f.status as FmeaStatus)}`}>
                          {FMEA_STATUS_LABELS[f.status as FmeaStatus] ?? f.status.replaceAll("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell className={`px-4 py-3 font-semibold ${getRpnColor(maxRpn)}`}>{maxRpn || "—"}</TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">
                        {f.dueDate ? (
                          <span className={overdue ? "text-destructive" : ""}>
                            {f.dueDate.toLocaleDateString()}
                            {overdue && " (Overdue)"}
                          </span>
                        ) : "—"}
                      </TableCell>
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