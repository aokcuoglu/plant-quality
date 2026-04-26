import type { Session } from "next-auth"
import { prisma } from "@/lib/prisma"

export async function canUserAccessFieldDefect(
  session: Session | null,
  fieldDefectId: string,
  mode: "read" | "write",
): Promise<{ ok: true; fieldDefect: Awaited<ReturnType<typeof prisma.fieldDefect.findFirst>> } | { ok: false; error: string }> {
  if (!session?.user?.companyId || !session.user.companyType || !session.user.role) {
    return { ok: false, error: "Unauthorized" }
  }

  const where =
    session.user.companyType === "OEM"
      ? { id: fieldDefectId, oemId: session.user.companyId }
      : { id: fieldDefectId, supplierId: session.user.companyId }

  const fieldDefect = await prisma.fieldDefect.findFirst({
    where,
    include: {
      oem: { select: { name: true } },
      supplier: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
      updatedBy: { select: { name: true, email: true } },
      convertedBy: { select: { name: true, email: true } },
      linkedDefect: { select: { id: true, partNumber: true, status: true } },
      attachments: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      comments: { include: { author: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } },
      events: { include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } },
    },
  })

  if (!fieldDefect) {
    return { ok: false, error: "Field defect not found" }
  }

  if (mode === "write") {
    if (session.user.companyType !== "OEM") {
      return { ok: false, error: "Only OEM users can modify field defects" }
    }
    if (!["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)) {
      return { ok: false, error: "Insufficient permissions" }
    }
  }

  return { ok: true, fieldDefect }
}

export function canOemManage(session: Session | null): session is Session {
  return Boolean(
    session &&
      session.user.companyType === "OEM" &&
      ["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role),
  )
}

export function canComment(session: Session | null): boolean {
  if (!session?.user?.companyId) return false
  if (session.user.companyType === "OEM") {
    return ["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)
  }
  return ["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)
}