type RateLimitConfig = {
  maxRequests: number
  windowMs: number
}

type RateLimitEntry = {
  count: number
  resetAt: number
}

type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter: number
}

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  auth: { maxRequests: 40, windowMs: 60_000 },
  ai: { maxRequests: 15, windowMs: 60_000 },
  api: { maxRequests: 60, windowMs: 60_000 },
  general: { maxRequests: 200, windowMs: 60_000 },
}

const store = new Map<string, RateLimitEntry>()

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

let cleanupTimer: ReturnType<typeof setInterval> | null = null

function ensureCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS)
}

function getConfig(tier: string): RateLimitConfig {
  return DEFAULT_CONFIGS[tier] ?? DEFAULT_CONFIGS.api
}

function normalizeIp(ip: string): string {
  if (ip === "::1" || ip === "127.0.0.1") return "localhost"
  if (ip.startsWith("::ffff:")) return ip.slice(7)
  return ip
}

function extractIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const ips = forwarded.split(",")[0].trim()
    return normalizeIp(ips)
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp) return normalizeIp(realIp)

  return "unknown"
}

export function getRateLimitKey(request: Request, userId?: string): string {
  if (userId) return `u:${userId}`
  return `ip:${extractIp(request)}`
}

export function checkRateLimit(
  key: string,
  tier: string = "api",
): RateLimitResult {
  ensureCleanup()

  const config = getConfig(tier)
  const now = Date.now()

  const existing = store.get(key)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + config.windowMs
    store.set(key, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
      retryAfter: 0,
    }
  }

  existing.count++

  if (existing.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfter: Math.ceil((existing.resetAt - now) / 1000),
    }
  }

  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetAt: existing.resetAt,
    retryAfter: 0,
  }
}
