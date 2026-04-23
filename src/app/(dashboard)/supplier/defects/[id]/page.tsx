import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DefectDetailView } from "@/components/defects/DefectDetailView"

export default async function SupplierDefectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || session.user.companyType !== "SUPPLIER") redirect("/login")

  const { id } = await params

  const defect = await prisma.defect.findFirst({
    where: {
      id,
      supplierId: session.user.companyId,
    },
    include: {
      supplier: { select: { name: true } },
      oem: { select: { name: true } },
      eightDReport: { select: { id: true } },
    },
  })

  if (!defect) notFound()

  return (
    <DefectDetailView
      defect={{
        id: defect.id,
        partNumber: defect.partNumber,
        description: defect.description,
        status: defect.status,
        imageUrls: defect.imageUrls,
        createdAt: defect.createdAt,
        supplierName: defect.supplier.name,
        oemName: defect.oem.name,
        eightDSubmitted: !!defect.eightDReport?.id,
      }}
      companyType="SUPPLIER"
    />
  )
}
