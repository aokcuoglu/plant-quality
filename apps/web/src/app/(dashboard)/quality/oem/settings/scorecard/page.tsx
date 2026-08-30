import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/layout/PageHeader"
import { ScorecardConfigForm } from "./form"

export default async function ScorecardSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.companyType !== "OEM" || session.user.role !== "ADMIN") {
    redirect("/quality/oem")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scorecard KPI Weights"
        description="Configure penalty weights and caps for supplier scorecard calculation"
      />
      <ScorecardConfigForm />
    </div>
  )
}
