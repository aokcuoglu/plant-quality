import { PlanAndUsageContent } from "@/app/(dashboard)/settings/plan/plan-content"

export const metadata = { title: "Plan & Usage — PlantX" }

export default async function LogisticPlanSettingsPage() {
  return <PlanAndUsageContent moduleContext="logistic" />
}