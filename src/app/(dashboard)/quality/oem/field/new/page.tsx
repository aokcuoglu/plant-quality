import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getSuppliersForField } from "@/app/(dashboard)/field/actions"
import { NewFieldDefectForm } from "./form"

export default async function NewFieldDefectPage() {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM" || !["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)) {
    redirect("/login")
  }

  const suppliers = await getSuppliersForField()

  return <NewFieldDefectForm suppliers={suppliers} />
}