import { redirect } from "next/navigation"

export const metadata = { title: "Plan & Usage — PlantQuality" }

export default function PlanSettingsRedirect() {
  redirect("/oem/settings/plan")
}