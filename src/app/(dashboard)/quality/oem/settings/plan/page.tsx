import { redirect } from "next/navigation"

export const metadata = { title: "Plan & Billing — PlantQuality" }

export default function PlanSettingsRedirect() {
  redirect("/oem/settings/plan")
}