import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      company: { select: { name: true, type: true } },
    },
    orderBy: { email: "asc" },
  })

  return NextResponse.json({
    users: users.map((u) => ({
      email: u.email,
      label: `${u.email} (${u.role === "SUPER_ADMIN" ? "Super Admin" : u.company ? `${u.company.name} ${u.role === "ADMIN" ? "Admin" : u.role}` : u.role})`,
    })),
  })
}
