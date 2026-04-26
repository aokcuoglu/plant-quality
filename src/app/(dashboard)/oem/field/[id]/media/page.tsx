import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { MediaUploader } from "./media-uploader"

export default async function FieldDefectMediaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM" || !["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)) {
    redirect("/login")
  }

  const { id } = await params

  const fd = await prisma.fieldDefect.findFirst({
    where: { id, oemId: session.user.companyId, deletedAt: null },
    include: { attachments: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } } },
  })

  if (!fd) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href={`/oem/field/${id}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Field Defect
        </Link>
      </div>
      <h1 className="text-xl font-semibold tracking-tight">Media & Attachments</h1>
      <p className="text-sm text-muted-foreground">{fd.title}</p>

      <MediaUploader fieldDefectId={id} existingAttachments={fd.attachments} />
    </div>
  )
}