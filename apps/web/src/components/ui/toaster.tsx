"use client"

import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-start gap-3 rounded-lg border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg animate-in slide-in-from-right",
            t.type === "destructive" && "border-destructive/50 bg-destructive/5 text-destructive",
            t.type === "info" && "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20",
          )}
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium">{t.title}</p>
            {t.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
