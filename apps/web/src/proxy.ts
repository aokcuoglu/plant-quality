import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { checkModuleAccess } from "@/lib/billing/features"
import { getRateLimitKey, checkRateLimit } from "@/lib/rate-limit"

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

interface ProxySessionUser {
  companyId: string | null
  companyType: string | null
  role: string | null
  modules: string[] | null
}

function sessionHasModule(
  session: { user?: ProxySessionUser } | null,
  moduleKey: "PLANT_QUALITY_MODULE" | "PLANT_LOGISTIC_MODULE"
): boolean {
  const user = session?.user
  if (!user) return false
  return checkModuleAccess(
    moduleKey,
    user.companyId ?? "",
    user.companyType ?? "OEM",
    user.role,
    user.modules
  )
}

function landsOnLogistic(session: { user?: ProxySessionUser } | null): boolean {
  return sessionHasModule(session, "PLANT_QUALITY_MODULE") === false
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = await auth()

  if (session && (pathname === "/login" || pathname === "/verify-request")) {
    const companyType = session.user.companyType
    let dest: string
    if (companyType === "OEM") {
      // Users without quality access land on the logistic app (their home).
      dest = landsOnLogistic(session) ? "/logistic" : "/quality/oem"
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

  // Users without quality module access must never reach the quality module.
  if (session && pathname.startsWith("/quality") && landsOnLogistic(session) && !pathname.startsWith("/quality/supplier")) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/logistic"
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
    const hasModule = checkModuleAccess("PLANT_LOGISTIC_MODULE", companyId, session.user.companyType ?? "OEM", session.user.role, session.user.modules)
    if (!hasModule) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/quality/oem"
      redirectUrl.search = ""
      return NextResponse.redirect(redirectUrl)
    }
  }

  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/cron")) {
      return NextResponse.next()
    }

    if (pathname.startsWith("/api/auth")) {
      // Whitelist read-only endpoints that are needed before every sign-in / sign-out
      if (pathname === "/api/auth/csrf" || pathname === "/api/auth/providers" || pathname === "/api/auth/session") {
        return NextResponse.next()
      }

      const rlResult = checkRateLimit(
        getRateLimitKey(request),
        "auth",
      )
      if (!rlResult.allowed) {
        return NextResponse.json(
          { error: "Too many authentication attempts. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(rlResult.retryAfter),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(rlResult.resetAt),
            },
          },
        )
      }
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

      const rlResult = checkRateLimit(
        getRateLimitKey(request, session.user.id),
        "api",
      )
      if (!rlResult.allowed) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(rlResult.retryAfter),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(rlResult.resetAt),
            },
          },
        )
      }

      return NextResponse.next()
    }

    if (pathname.startsWith("/api/logistic")) {
      if (!session || session.user.companyType !== "OEM") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const companyId = session.user.companyId ?? ""
      const hasModule = checkModuleAccess("PLANT_LOGISTIC_MODULE", companyId, session.user.companyType ?? "OEM", session.user.role, session.user.modules)
      if (!hasModule) {
        return NextResponse.json({ error: "Module not included in subscription" }, { status: 403 })
      }

      const rlResult = checkRateLimit(
        getRateLimitKey(request, session.user.id),
        "api",
      )
      if (!rlResult.allowed) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(rlResult.retryAfter),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(rlResult.resetAt),
            },
          },
        )
      }

      return NextResponse.next()
    }

    if (pathname.startsWith("/api/ai")) {
      const rlResult = checkRateLimit(
        getRateLimitKey(request, session?.user?.id),
        "ai",
      )
      if (!rlResult.allowed) {
        return NextResponse.json(
          { error: "AI service rate limit reached. Please wait a moment and try again." },
          {
            status: 429,
            headers: {
              "Retry-After": String(rlResult.retryAfter),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(rlResult.resetAt),
            },
          },
        )
      }
    }

    if (isProtectedApi) {
      const rlResult = checkRateLimit(
        getRateLimitKey(request, session?.user?.id),
        "api",
      )
      if (!rlResult.allowed) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(rlResult.retryAfter),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(rlResult.resetAt),
            },
          },
        )
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