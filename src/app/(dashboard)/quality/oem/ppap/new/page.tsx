import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { auth } from "@/lib/auth"
import { requireFeature } from "@/lib/billing"
import { getSuppliers } from "../../defects/queries"
import { PpapCreateForm } from "./form"
import { PageHeader } from "@/components/layout/PageHeader"

export default async function NewPpapPage() {
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const ppapGate = requireFeature(session, "PPAP")
  if (!ppapGate.allowed) redirect("/quality/oem/ppap")

  const suppliers = await getSuppliers()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/quality/oem/ppap"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to PPAP
      </Link>

      <PageHeader
        title="New PPAP Request"
        description="Create a production part approval process request for a supplier"
      />

      <PpapCreateForm suppliers={suppliers} />
    </div>
  )
}