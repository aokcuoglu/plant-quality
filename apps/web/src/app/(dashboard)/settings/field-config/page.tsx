import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { requireFeature } from "@/lib/billing"
import { FieldConfigPageClient } from "./client-page"
import { FEATURE_KEY } from "@/lib/custom-fields/constants"

export const metadata = { title: "Field Configuration — PlantX" }

export default async function FieldConfigPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isOemAdmin = session.user.companyType === "OEM" && session.user.role === "ADMIN"
  if (!isOemAdmin) {
    redirect("/quality/oem")
  }

  const access = requireFeature(session, FEATURE_KEY)
  if (!access.allowed) {
    redirect("/settings/plan")
  }

  return <FieldConfigPageClient companyId={session.user.companyId} />
}
