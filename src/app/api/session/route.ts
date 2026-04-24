import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { Role, CompanyType, Plan } from "@/generated/prisma/client"

export async function GET(request: Request) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: false,
    cookieName: "authjs.session-token",
  })

  if (!token) {
    return NextResponse.json(null)
  }

  const expires = token.exp
    ? new Date(token.exp * 1000).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  return NextResponse.json({
    user: {
      id: token.sub as string,
      email: token.email as string,
      name: (token.name as string) ?? null,
      image: (token.picture as string) ?? null,
      role: token.role as Role,
      plan: token.plan as Plan,
      companyId: token.companyId as string,
      companyName: token.companyName as string,
      companyType: token.companyType as CompanyType,
    },
    expires,
  })
}
