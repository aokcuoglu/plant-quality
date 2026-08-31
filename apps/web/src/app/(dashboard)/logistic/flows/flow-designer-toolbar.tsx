"use client"

import Link from "next/link"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { useTranslations } from "@/i18n/context"

type FlowDesignerType = "business" | "vehicle"

export function FlowDesignerToolbar({
  title,
  description,
  activeType,
  children,
}: {
  title: string
  description: string
  activeType: FlowDesignerType
  children: ReactNode
}) {
  const t = useTranslations()

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2">
      <div className="mr-2 hidden min-w-0 flex-1 flex-col sm:flex">
        <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="ml-auto flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
        <Button
          nativeButton={activeType === "business"}
          render={
            activeType === "business" ? undefined : <Link href="/logistic/flows?type=business" />
          }
          variant={activeType === "business" ? "secondary" : "outline"}
          size="sm"
        >
          {t("logistic.workflow.businessFlows")}
        </Button>
        <Button
          nativeButton={activeType === "vehicle"}
          render={
            activeType === "vehicle" ? undefined : <Link href="/logistic/flows?type=vehicle" />
          }
          variant={activeType === "vehicle" ? "secondary" : "outline"}
          size="sm"
        >
          {t("logistic.workflow.vehicleFlows")}
        </Button>
        {children}
      </div>
    </header>
  )
}
