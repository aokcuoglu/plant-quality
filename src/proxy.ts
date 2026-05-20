import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { checkModuleAccess } from "@/lib/billing/features"

const PUBLIC_PATHS = new Set(["/", "/login", "/verify-request"])

const PROTECTED_API_PREFIXES = [
  "/api/defects",
  "/api/field",
  "/api/fmea",
  "/api/ppap",
  "/api/ai",
  "/api/upload",
  "/api/image",
  "/api/users",
  "/api/session",
  "/api/logistic",
]

function isDealerOrDistributor(companyType: string | null | undefined): boolean {
  return companyType === "DEALER" || companyType === "DISTRIBUTOR"
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = await auth()

  if (session && (pathname === "/login" || pathname === "/verify-request")) {
    const companyType = session.user.companyType
    let dest: string
    if (companyType === "OEM") {
      dest = "/quality/oem"
    } else if (isDealerOrDistributor(companyType)) {
      dest = "/logistic/portal"
    } else {
      dest = "/quality/supplier"
    }
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = dest
    redirectUrl.search = ""
    return NextResponse.redirect(redirectUrl)
  }

  if (pathname.startsWith("/logistic/portal")) {
    if (!session) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = "/login"
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }
    const { companyType } = session.user
    if (isDealerOrDistributor(companyType)) {
      return NextResponse.next()
    }
    if (companyType === "OEM") {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/logistic"
      redirectUrl.search = ""
      return NextResponse.redirect(redirectUrl)
    }
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/quality/supplier"
    redirectUrl.search = ""
    return NextResponse.redirect(redirectUrl)
  }

  if (pathname.startsWith("/logistic")) {
    if (!session) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = "/login"
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }
    if (session.user.companyType !== "OEM") {
      const dest = isDealerOrDistributor(session.user.companyType) ? "/logistic/portal" : "/quality/supplier"
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = dest
      redirectUrl.search = ""
      return NextResponse.redirect(redirectUrl)
    }
    const companyId = session.user.companyId ?? ""
    const hasModule = checkModuleAccess("PLANT_LOGISTIC_MODULE", companyId, session.user.companyType ?? "OEM")
    if (!hasModule) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/quality/oem"
      redirectUrl.search = ""
      return NextResponse.redirect(redirectUrl)
    }
  }

  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/cron")) {
      return NextResponse.next()
    }

    const isProtectedApi = PROTECTED_API_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
    )

    if (isProtectedApi && !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (pathname.startsWith("/api/logistic/portal")) {
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      if (!isDealerOrDistributor(session.user.companyType)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      return NextResponse.next()
    }

    if (pathname.startsWith("/api/logistic")) {
      if (!session || session.user.companyType !== "OEM") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const companyId = session.user.companyId ?? ""
      const hasModule = checkModuleAccess("PLANT_LOGISTIC_MODULE", companyId, session.user.companyType ?? "OEM")
      if (!hasModule) {
        return NextResponse.json({ error: "Module not included in subscription" }, { status: 403 })
      }
    }

    return NextResponse.next()
  }

  if (!session && !PUBLIC_PATHS.has(pathname) && !pathname.startsWith("/_next")) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}