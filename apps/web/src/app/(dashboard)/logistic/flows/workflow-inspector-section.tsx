import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function WorkflowInspectorSection({
  title,
  description,
  icon: Icon,
  meta,
  children,
}: {
  title: string
  description?: string
  icon: LucideIcon
  meta?: ReactNode
  children: ReactNode
}) {
  return (
    <Card size="sm" className="gap-0 py-0 shadow-none">
      <CardHeader className="grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 border-b border-border px-3 py-3">
        <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0">
          <CardTitle className="text-xs font-semibold">{title}</CardTitle>
          {description && (
            <CardDescription className="mt-0.5 text-xs leading-relaxed">
              {description}
            </CardDescription>
          )}
        </div>
        {meta && <div className="self-start">{meta}</div>}
      </CardHeader>
      <CardContent className="space-y-3 px-3 py-3">{children}</CardContent>
    </Card>
  )
}

export function WorkflowInspectorField({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string
  htmlFor: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs leading-normal text-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}
