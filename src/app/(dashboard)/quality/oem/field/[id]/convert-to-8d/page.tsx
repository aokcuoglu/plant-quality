import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ConvertTo8DConfirmation } from "./convert-confirmation"
import { FIELD_DEFECT_SEVERITY_LABELS } from "@/lib/field-defect"

export default async function ConvertTo8DPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM" || !["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)) {
    redirect("/login")
  }

  const { id } = await params

  const fd = await prisma.fieldDefect.findFirst({
    where: { id, oemId: session.user.companyId, deletedAt: null },
    include: {
      supplier: { select: { id: true, name: true } },
    },
  })

  if (!fd) notFound()

  if (fd.linkedDefectId) {
    redirect(`/quality/oem/field/${id}`)
  }

  if (!fd.supplierId) {
    redirect(`/quality/oem/field/${id}`)
  }

  const convertibleStatuses = ["OPEN", "UNDER_REVIEW", "SUPPLIER_ASSIGNED"]
  if (!convertibleStatuses.includes(fd.status)) {
    redirect(`/quality/oem/field/${id}`)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={`/quality/oem/field/${id}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Field Defect
        </Link>
      </div>

      <h1 className="text-xl font-semibold tracking-tight">Convert to 8D Report</h1>
      <p className="text-sm text-muted-foreground">
        This will create a new Defect and 8D Report from this field defect. The field defect will be marked as &ldquo;Linked to 8D&rdquo;.
      </p>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Data to be copied</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Title</dt>
          <dd>{fd.title}</dd>
          <dt className="text-muted-foreground">Description</dt>
          <dd className="line-clamp-3">{fd.description}</dd>
          <dt className="text-muted-foreground">Severity</dt>
          <dd>{FIELD_DEFECT_SEVERITY_LABELS[fd.severity]}</dd>
          <dt className="text-muted-foreground">Supplier</dt>
          <dd>{fd.supplier?.name ?? fd.supplierNameSnapshot ?? "—"}</dd>
          {fd.partNumber && (
            <>
              <dt className="text-muted-foreground">Part Number</dt>
              <dd className="font-mono">{fd.partNumber}</dd>
            </>
          )}
          {fd.partName && (
            <>
              <dt className="text-muted-foreground">Part Name</dt>
              <dd>{fd.partName}</dd>
            </>
          )}
          {fd.vin && (
            <>
              <dt className="text-muted-foreground">VIN</dt>
              <dd className="font-mono">{fd.vin}</dd>
            </>
          )}
          {fd.vehicleModel && (
            <>
              <dt className="text-muted-foreground">Vehicle Model</dt>
              <dd>{fd.vehicleModel}</dd>
            </>
          )}
          {fd.mileage && (
            <>
              <dt className="text-muted-foreground">Mileage</dt>
              <dd>{fd.mileage.toLocaleString()} km</dd>
            </>
          )}
          {fd.location && (
            <>
              <dt className="text-muted-foreground">Location</dt>
              <dd>{fd.location}</dd>
            </>
          )}
        </dl>
      </div>

      <ConvertTo8DConfirmation fieldDefectId={id} />
    </div>
  )
}