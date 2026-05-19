import { redirect } from "next/navigation"

export const metadata = { title: "Plan & Usage — PlantX" }

export default function QualityPlanSettingsRedirect() {
  redirect("/settings/plan")
}