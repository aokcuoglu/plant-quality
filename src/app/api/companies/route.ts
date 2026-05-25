import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.companyType !== "OEM") return NextResponse.json({ error: "Not authorized" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const requestedType = searchParams.get("companyType")
  const companyType = requestedType === "DEALER" || requestedType === "DISTRIBUTOR"
    ? (requestedType as "DEALER" | "DISTRIBUTOR")
    : "SUPPLIER" as const

  const companies = await prisma.company.findMany({
    where: { type: companyType },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(companies)
}