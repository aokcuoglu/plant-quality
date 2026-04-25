import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  const { fmeaId, rows } = await req.json()

  if (!fmeaId || !Array.isArray(rows)) {
    return NextResponse.json({ error: "fmeaId and rows are required" }, { status: 400 })
  }

  const fmea = await prisma.fmea.findFirst({
    where: {
      id: fmeaId,
      status: { in: ["DRAFT", "IN_REVIEW"] },
    },
  })

  if (!fmea) {
    return NextResponse.json({ error: "FMEA not found or not editable" }, { status: 404 })
  }

  if (session.user.companyType === "SUPPLIER" && fmea.supplierId !== session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  if (session.user.companyType === "OEM" && fmea.oemId !== session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  await prisma.fmea.update({
    where: { id: fmeaId },
    data: { rows: rows as Prisma.InputJsonValue },
  })

  await prisma.fmeaEvent.create({
    data: {
      fmeaId,
      type: "FMEA_UPDATED",
      actorId: session.user.id,
      metadata: { rowCount: rows.length, maxRpn: Math.max(...rows.map((r: Record<string, unknown>) => Number(r.rpn) || 0), 0) },
    },
  })

  return NextResponse.json({ success: true })
}