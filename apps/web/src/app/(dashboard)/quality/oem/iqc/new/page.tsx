import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { auth } from "@/lib/auth"
import { requireFeature } from "@/lib/billing"
import { getSuppliers } from "../../defects/queries"
import { IqcCreateForm } from "./form"
import { PageHeader } from "@/components/layout/PageHeader"
import { resolveFieldConfig, resolveFieldConfigSync } from "@/lib/custom-fields/resolver"
import type { ResolvedFields } from "@/lib/custom-fields/resolver"

export default async function NewIqcPage() {
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const iqcGate = requireFeature(session, "IQC")
  if (!iqcGate.allowed) redirect("/quality/oem/iqc")

  const suppliers = await getSuppliers()

  let fieldConfig: ResolvedFields
  try {
    if (session.user.plan === "ENTERPRISE") {
      fieldConfig = await resolveFieldConfig(session.user.companyId, "IQC_REPORT")
    } else {
      const resolver = resolveFieldConfigSync("IQC_REPORT")
      fieldConfig = { all: resolver.resolve(), visible: resolver.visible, builtIn: resolver.builtIn, custom: resolver.custom }
    }
  } catch {
    const resolver = resolveFieldConfigSync("IQC_REPORT")
    fieldConfig = { all: resolver.resolve(), visible: resolver.visible, builtIn: resolver.builtIn, custom: resolver.custom }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/quality/oem/iqc"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to IQC
      </Link>

      <PageHeader
        title="New IQC Inspection"
        description="Create a new incoming quality control inspection record"
      />

      <IqcCreateForm suppliers={suppliers} fieldConfig={fieldConfig} />
    </div>
  )
}