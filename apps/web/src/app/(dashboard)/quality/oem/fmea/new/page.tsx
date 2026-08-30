import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/billing"
import { FmeaCreateForm } from "./form"
import { resolveFieldConfig, resolveFieldConfigSync } from "@/lib/custom-fields/resolver"
import type { ResolvedFields } from "@/lib/custom-fields/resolver"

export default async function NewFmeaPage() {
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const featureGate = requireFeature(session, "FMEA")
  if (!featureGate.allowed) redirect("/quality/oem")

  const suppliers = await prisma.company.findMany({
    where: {
      type: "SUPPLIER",
      OR: [
        { primaryOemId: session.user.companyId },
        { defectsAsSup: { some: { oemId: session.user.companyId } } },
        { ppapAsSup: { some: { oemId: session.user.companyId } } },
        { iqcAsSup: { some: { oemId: session.user.companyId } } },
        { fmeaAsSup: { some: { oemId: session.user.companyId } } },
        { fieldDefectsAsSup: { some: { oemId: session.user.companyId } } },
        { devPlansAsSupplier: { some: { oemId: session.user.companyId } } },
      ],
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  let fieldConfig: ResolvedFields
  try {
    if (session.user.plan === "ENTERPRISE") {
      fieldConfig = await resolveFieldConfig(session.user.companyId, "FMEA")
    } else {
      const resolver = resolveFieldConfigSync("FMEA")
      fieldConfig = { all: resolver.resolve(), visible: resolver.visible, builtIn: resolver.builtIn, custom: resolver.custom }
    }
  } catch {
    const resolver = resolveFieldConfigSync("FMEA")
    fieldConfig = { all: resolver.resolve(), visible: resolver.visible, builtIn: resolver.builtIn, custom: resolver.custom }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Create FMEA</h1>
        <p className="text-sm text-muted-foreground">Create a new Failure Mode and Effects Analysis request</p>
      </div>
      <FmeaCreateForm suppliers={suppliers} fieldConfig={fieldConfig} />
    </div>
  )
}