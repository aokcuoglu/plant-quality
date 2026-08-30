"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function OpenAppButton({
  children,
  className,
  size,
}: {
  children: React.ReactNode
  className?: string
  size?: "sm" | "lg"
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleOpen() {
    setPending(true)
    try {
      const res = await fetch("/api/session")
      const data = res.ok ? await res.json() : null
      if (data?.user?.id) {
        router.push("/dashboard")
      } else {
        router.push("/login?redirect=/dashboard")
      }
    } catch {
      router.push("/login?redirect=/dashboard")
    }
  }

  return (
    <Button size={size} className={cn(className)} onClick={handleOpen} disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : children}
    </Button>
  )
}