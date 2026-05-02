import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { auth } from "@/lib/auth"
import { requireFeature } from "@/lib/billing"
import { getSuppliers } from "../../defects/queries"
import { IqcCreateForm } from "./form"
import { PageHeader } from "@/components/layout/PageHeader"

export default async function NewIqcPage() {
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const iqcGate = requireFeature(session, "IQC")
  if (!iqcGate.allowed) redirect("/quality/oem/iqc")

  const suppliers = await getSuppliers()

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

      <IqcCreateForm suppliers={suppliers} />
    </div>
  )
}