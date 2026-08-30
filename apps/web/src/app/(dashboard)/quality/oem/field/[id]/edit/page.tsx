import { isEditorRole } from "@/lib/roles"
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { EditFieldDefectForm } from "./edit-form"
import { resolveFieldConfig, resolveFieldConfigSync } from "@/lib/custom-fields/resolver"
import type { ResolvedFields } from "@/lib/custom-fields/resolver"
import type { FieldDefectSource, FieldDefectSeverity } from "@plantx/db/client"

const sourceOptions: { value: FieldDefectSource; label: string }[] = [
  { value: "FIELD", label: "Field" },
  { value: "SERVICE", label: "Service" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "DEALER", label: "Dealer" },
  { value: "INTERNAL", label: "Internal" },
]

const severityOptions: { value: FieldDefectSeverity; label: string }[] = [
  { value: "MINOR", label: "Minor" },
  { value: "MAJOR", label: "Major" },
  { value: "CRITICAL", label: "Critical" },
]

export default async function EditFieldDefectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM" || !isEditorRole(session.user.role)) {
    redirect("/login")
  }

  const { id } = await params

  const fd = await prisma.fieldDefect.findFirst({
    where: { id, oemId: session.user.companyId, deletedAt: null },
  })

  if (!fd) notFound()

  let fieldConfig: ResolvedFields
  try {
    if (session.user.plan === "ENTERPRISE") {
      fieldConfig = await resolveFieldConfig(session.user.companyId, "FIELD_DEFECT")
    } else {
      const resolver = resolveFieldConfigSync("FIELD_DEFECT")
      fieldConfig = { all: resolver.resolve(), visible: resolver.visible, builtIn: resolver.builtIn, custom: resolver.custom }
    }
  } catch {
    const resolver = resolveFieldConfigSync("FIELD_DEFECT")
    fieldConfig = { all: resolver.resolve(), visible: resolver.visible, builtIn: resolver.builtIn, custom: resolver.custom }
  }

  const editableStatuses = ["DRAFT", "OPEN", "UNDER_REVIEW", "SUPPLIER_ASSIGNED"]
  if (!editableStatuses.includes(fd.status)) {
    redirect(`/quality/oem/field/${id}`)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href={`/quality/oem/field/${id}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Back to Field Defect
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">Edit Field Defect</h1>

      <EditFieldDefectForm fieldDefect={fd} sourceOptions={sourceOptions} severityOptions={severityOptions} fieldConfig={fieldConfig} />
    </div>
  )
}