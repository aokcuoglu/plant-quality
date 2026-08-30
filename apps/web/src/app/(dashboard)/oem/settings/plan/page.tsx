import { redirect } from "next/navigation"

export const metadata = { title: "Plan & Usage — PlantX" }

export default function PlanSettingsRedirect() {
  redirect("/settings/plan")
}