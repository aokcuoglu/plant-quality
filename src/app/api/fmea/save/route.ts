import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/billing"
import { calcRpn, calcRevisedRpn, validateSod, type FmeaRow } from "@/lib/fmea/types"
import type { Prisma } from "@/generated/prisma/client"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  const featureGate = requireFeature(session, "FMEA")
  if (!featureGate.allowed) {
    return NextResponse.json({ error: featureGate.reason ?? "FMEA requires a higher plan" }, { status: 403 })
  }

  const { fmeaId, rows } = await req.json()

  if (!fmeaId || !Array.isArray(rows)) {
    return NextResponse.json({ error: "fmeaId and rows are required" }, { status: 400 })
  }

  const fmea = await prisma.fmea.findFirst({
    where: { id: fmeaId },
  })

  if (!fmea) {
    return NextResponse.json({ error: "FMEA not found" }, { status: 404 })
  }

  if (session.user.companyType === "SUPPLIER" && fmea.supplierId !== session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  if (session.user.companyType === "OEM" && fmea.oemId !== session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const editableStatuses = ["DRAFT", "REQUESTED", "SUPPLIER_IN_PROGRESS", "REVISION_REQUIRED"]
  if (!editableStatuses.includes(fmea.status)) {
    return NextResponse.json({ error: "FMEA is not in an editable status" }, { status: 400 })
  }

  for (const row of rows as FmeaRow[]) {
    for (const [field, value] of [["severity", row.severity], ["occurrence", row.occurrence], ["detection", row.detection]] as const) {
      const v = validateSod(value)
      if (!v.valid) {
        return NextResponse.json({ error: `Invalid ${field} in row "${row.failureMode || row.id}": ${v.error}` }, { status: 400 })
      }
    }

    if (row.revisedSeverity != null) {
      const v = validateSod(row.revisedSeverity)
      if (!v.valid) {
        return NextResponse.json({ error: `Invalid revisedSeverity in row "${row.failureMode || row.id}": ${v.error}` }, { status: 400 })
      }
    }
    if (row.revisedOccurrence != null) {
      const v = validateSod(row.revisedOccurrence)
      if (!v.valid) {
        return NextResponse.json({ error: `Invalid revisedOccurrence in row "${row.failureMode || row.id}": ${v.error}` }, { status: 400 })
      }
    }
    if (row.revisedDetection != null) {
      const v = validateSod(row.revisedDetection)
      if (!v.valid) {
        return NextResponse.json({ error: `Invalid revisedDetection in row "${row.failureMode || row.id}": ${v.error}` }, { status: 400 })
      }
    }

    row.rpn = calcRpn(row.severity, row.occurrence, row.detection)
    const revisedRpn = calcRevisedRpn(row.revisedSeverity, row.revisedOccurrence, row.revisedDetection)
    if (revisedRpn != null) row.revisedRpn = revisedRpn
    else if (row.revisedSeverity != null || row.revisedOccurrence != null || row.revisedDetection != null) {
      row.revisedRpn = undefined
    }
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