"use client"

import { Button } from "@/components/ui/button"
import { AlertTriangleIcon } from "lucide-react"

export default function AdminSuppliersError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangleIcon className="size-10 text-muted-foreground/30 mb-4" />
      <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
      <p className="mt-1 text-sm text-muted-foreground max-w-md">{error.message}</p>
      <Button variant="outline" className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
