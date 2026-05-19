import { PlanAndUsageContent } from "./plan-content"

export const metadata = { title: "Plan & Usage — PlantX" }

export default async function PlatformPlanPage() {
  return <PlanAndUsageContent moduleContext="quality" />
}