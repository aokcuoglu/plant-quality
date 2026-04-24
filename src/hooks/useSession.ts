"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type SessionUser = {
  id: string
  email: string
  name?: string | null
  role: string
  plan: string
  companyId: string
  companyName: string
  companyType: string
  image?: string | null
}

type Session = {
  user: SessionUser
  expires: string
} | null

export function useSession() {
  const [session, setSession] = useState<Session>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    async function fetchSession() {
      try {
        const res = await fetch("/api/session")
        if (!res.ok) throw new Error("Failed to fetch session")
        const data = await res.json()
        if (cancelled) return
        if (!data?.user) {
          router.replace("/login?redirect=" + encodeURIComponent(window.location.pathname))
          return
        }
        setSession(data)
      } catch {
        if (!cancelled) {
          router.replace("/login?redirect=" + encodeURIComponent(window.location.pathname))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchSession()
    return () => { cancelled = true }
  }, [router])

  return { session, loading }
}
