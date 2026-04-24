import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { auth } from "@/lib/auth"
import { getSuppliers } from "../queries"
import { NewDefectForm } from "./form"
import { PageHeader } from "@/components/layout/PageHeader"

interface Supplier {
  id: string
  name: string
  users: { id: string; name: string | null; email: string }[]
}

export default async function NewDefectPage() {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") redirect("/login")

  const suppliers: Supplier[] = await getSuppliers()

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link
        href="/oem/defects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to defects
      </Link>

      <PageHeader
        title="New Defect"
        description="Report a quality defect to a supplier"
      />

      <NewDefectForm suppliers={suppliers} />
    </div>
  )
}
