import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = new Set(["/", "/login", "/verify-request"])

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = await auth()

  if (session && (pathname === "/login" || pathname === "/verify-request")) {
    const dest = session.user.companyType === "OEM" ? "/quality/oem" : "/quality/supplier"
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = dest
    redirectUrl.search = ""
    return NextResponse.redirect(redirectUrl)
  }

  if (!session && !PUBLIC_PATHS.has(pathname) && !pathname.startsWith("/api")) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}