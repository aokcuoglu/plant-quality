import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireFeature, requireModule } from "@/lib/billing/guards"
import {
  PLAN_SHEET_STATUS,
  PLAN_SHEET_STATUS_COLOR,
  PLAN_SHEET_CHANNEL,
} from "@/lib/logistic/plan-sheet"
import { canSalesExport } from "@/lib/logistic/roles"
import Link from "next/link"
import { PlusCircle, FileText } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function PlanSheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; periodMonth?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const companyId = session.user.companyId
  const canCreate = canSalesExport(session.user.role)
  const params = await searchParams
  const statusFilter = params.status ?? ""
  const periodFilter = params.periodMonth ?? ""

  const where: Record<string, unknown> = { companyId }
  if (statusFilter) where.status = statusFilter
  if (periodFilter) where.periodMonth = periodFilter

  const sheets = await prisma.plantLogisticPlanSheet.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { lines: true, orders: true } },
    },
  })

  const statusOptions = Object.entries(PLAN_SHEET_STATUS).map(([value, label]) => ({ value, label }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Aylık Şase Listeleri</h1>
          <p className="text-sm text-muted-foreground">
            Satış ekiplerinin paylaştığı şase listeleri ve üretim onay süreci
          </p>
        </div>
        <Link
          href="/logistic/plan-sheets/new"
          className={`inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-foreground/90 ${canCreate ? "" : "pointer-events-none opacity-40"}`}
          aria-disabled={!canCreate}
        >
          <PlusCircle className="size-4" />
          Yeni Liste
        </Link>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <NativeSelect
          name="status"
          defaultValue={statusFilter}
        >
          <NativeSelectOption value="">Tüm durumlar</NativeSelectOption>
          {statusOptions.map((opt) => (
            <NativeSelectOption key={opt.value} value={opt.value}>{opt.label}</NativeSelectOption>
          ))}
        </NativeSelect>
        <Input
          type="month"
          name="periodMonth"
          defaultValue={periodFilter}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
        <Button
          type="submit"
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Filtrele
        </Button>
      </form>

      {sheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-muted-foreground">
          <FileText className="mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm">Şase listesi bulunamadı</p>
          <Link href="/logistic/plan-sheets/new" className="mt-2 text-xs text-foreground hover:text-foreground">
            İlk listeyi oluştur
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-b text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <TableHead className="px-4 py-3 text-left">Plan #</TableHead>
                  <TableHead className="px-4 py-3 text-left">Başlık</TableHead>
                  <TableHead className="px-4 py-3 text-left">Dönem</TableHead>
                  <TableHead className="px-4 py-3 text-left">Kanal</TableHead>
                  <TableHead className="px-4 py-3 text-left">Durum</TableHead>
                  <TableHead className="px-4 py-3 text-left">Satır</TableHead>
                  <TableHead className="px-4 py-3 text-left">Sipariş</TableHead>
                  <TableHead className="px-4 py-3 text-left">Oluşturan</TableHead>
                  <TableHead className="px-4 py-3 text-left">Oluşturma</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {sheets.map((sheet) => (
                  <TableRow key={sheet.id} className="group hover:bg-muted/50">
                    <TableCell className="px-4 py-3">
                      <Link href={`/logistic/plan-sheets/${sheet.id}`} className="text-sm font-medium text-foreground hover:text-foreground">
                        {sheet.planNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">{sheet.title}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">{sheet.periodMonth}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">{PLAN_SHEET_CHANNEL[sheet.channel]}</TableCell>
                    <TableCell className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${PLAN_SHEET_STATUS_COLOR[sheet.status]}`}>
                        {PLAN_SHEET_STATUS[sheet.status]}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">{sheet._count.lines}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">{sheet._count.orders}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">{sheet.createdBy?.name ?? "—"}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">{sheet.createdAt.toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
