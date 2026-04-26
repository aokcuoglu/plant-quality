"use client"

import { useRouter } from "next/navigation"
import { ArrowLeftIcon, SearchXIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardNotFound() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <SearchXIcon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold">Page not found</h2>
      <p className="text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
      <Button variant="outline" className="gap-2" onClick={() => router.back()}>
        <ArrowLeftIcon className="h-4 w-4" /> Go back
      </Button>
    </div>
  )
}