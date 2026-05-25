import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { auth } from "@/lib/auth"
import { getSuppliers } from "../queries"
import { NewDefectForm } from "./form"
import { PageHeader } from "@/components/layout/PageHeader"
import { resolveFieldConfig, resolveFieldConfigSync } from "@/lib/custom-fields/resolver"
import type { ResolvedFields } from "@/lib/custom-fields/resolver"

interface _Supplier {
  id: string
  name: string
  users: { id: string; name: string | null; email: string }[]
}

export default async function NewDefectPage() {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") redirect("/login")

  const suppliers = await getSuppliers()

  let fieldConfig: ResolvedFields
  try {
    if (session.user.plan === "ENTERPRISE") {
      fieldConfig = await resolveFieldConfig(session.user.companyId, "DEFECT")
    } else {
      const resolver = resolveFieldConfigSync("DEFECT")
      fieldConfig = { all: resolver.resolve(), visible: resolver.visible, builtIn: resolver.builtIn, custom: resolver.custom }
    }
  } catch {
    const resolver = resolveFieldConfigSync("DEFECT")
    fieldConfig = { all: resolver.resolve(), visible: resolver.visible, builtIn: resolver.builtIn, custom: resolver.custom }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link
        href="/quality/oem/defects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to defects
      </Link>

      <PageHeader
        title="New Defect"
        description="Report a quality defect to a supplier"
      />

      <NewDefectForm suppliers={suppliers} fieldConfig={fieldConfig} />
    </div>
  )
}
