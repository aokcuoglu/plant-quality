"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function LoginRedirectHandler({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data?.user) {
          router.replace(redirectTo ?? "/quality/oem")
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [router, redirectTo])

  return null
}
