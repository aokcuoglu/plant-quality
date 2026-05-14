"use client"

import Link from "next/link"
import {
  ShieldCheck,
  TruckIcon,
  FileText,
  Leaf,
  ClipboardCheck,
  Settings,
  MoveRight,
  Users,
  Grid3X3,
  LockIcon,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { checkFeatureAccess, type FeatureKey } from "@/lib/billing/features"
import type { PlanKey } from "@/lib/billing/plans"

type PlantXModule = "quality" | "logistic" | null

interface AppModule {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  featureGate?: FeatureKey
  href?: string
  module: PlantXModule
  supplierVisible: boolean
}

const apps: AppModule[] = [
  {
    id: "quality",
    name: "PlantQuality",
    description: "AI-Powered 8D & Quality Mgmt",
    icon: ShieldCheck,
    featureGate: undefined,
    href: "/quality/oem",
    module: "quality",
    supplierVisible: true,
  },
  {
    id: "logistic",
    name: "PlantLogistic",
    description: "Vehicle Order & Delivery Control Tower",
    icon: TruckIcon,
    featureGate: "PLANT_LOGISTIC",
    href: "/logistic",
    module: "logistic",
    supplierVisible: false,
  },
  {
    id: "dock",
    name: "PlantDock",
    description: "Warehouse Gate & Logistics",
    icon: TruckIcon,
    featureGate: undefined,
    module: null,
    supplierVisible: false,
  },
  {
    id: "quote",
    name: "PlantQuote",
    description: "RFQ & Supplier Bidding",
    icon: FileText,
    featureGate: undefined,
    module: null,
    supplierVisible: false,
  },
  {
    id: "trace",
    name: "PlantTrace / PlantGreen",
    description: "Traceability & Carbon Footprint",
    icon: Leaf,
    featureGate: undefined,
    module: null,
    supplierVisible: false,
  },
  {
    id: "audit",
    name: "PlantAudit",
    description: "Digital Auditing (LPA, VDA)",
    icon: ClipboardCheck,
    featureGate: undefined,
    module: null,
    supplierVisible: false,
  },
  {
    id: "asset",
    name: "PlantAsset",
    description: "Machinery Maintenance & OEE",
    icon: Settings,
    featureGate: undefined,
    module: null,
    supplierVisible: false,
  },
  {
    id: "flow",
    name: "PlantFlow",
    description: "Internal Material Flow & RFID",
    icon: MoveRight,
    featureGate: undefined,
    module: null,
    supplierVisible: false,
  },
  {
    id: "staff",
    name: "PlantStaff",
    description: "Skill Matrix & HSE Compliance",
    icon: Users,
    featureGate: undefined,
    module: null,
    supplierVisible: false,
  },
]

interface AppSwitcherProps {
  currentModule?: PlantXModule
  userPlan?: string
  userCompanyType?: string
}

export function AppSwitcher({ currentModule, userPlan = "FREE", userCompanyType = "OEM" }: AppSwitcherProps) {
  const normalizedPlan = (userPlan ?? "FREE").toUpperCase() as PlanKey
  const companyType = userCompanyType ?? "OEM"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-8 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:border-sidebar-ring data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground data-open:border-sidebar-ring"
        aria-label="Switch app"
      >
        <Grid3X3 className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-72 border-sidebar-border bg-sidebar p-2 text-sidebar-foreground"
      >
        <DropdownMenuGroup className="space-y-0.5">
          <DropdownMenuLabel className="px-2 pb-1 pt-1 text-xs font-medium text-muted-foreground">
            PlantX Ecosystem
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-sidebar-border" />
          {apps.map((app) => {
            const Icon = app.icon
            const isActiveModule = currentModule !== null && currentModule !== undefined && app.module !== null && app.module === currentModule

            if (app.featureGate) {
              const access = checkFeatureAccess(normalizedPlan, companyType, app.featureGate)
              const isVisible = app.supplierVisible || companyType !== "SUPPLIER"
              if (!isVisible) {
                return null
              }
              if (!access.allowed) {
                return (
                  <DropdownMenuItem
                    key={app.id}
                    disabled
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 opacity-50"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">{app.name}</span>
                        <LockIcon className="size-3 text-muted-foreground" />
                      </div>
                      <p className="truncate text-xs text-muted-foreground/50">{app.description}</p>
                    </div>
                  </DropdownMenuItem>
                )
              }
            }

            const isLive = !app.featureGate ? false : true

            return (
              <DropdownMenuItem
                key={app.id}
                disabled={!app.featureGate && !isLive && app.module === null}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-2.5",
                  app.featureGate && "cursor-pointer hover:bg-sidebar-accent focus:bg-sidebar-accent",
                  isActiveModule && "bg-sidebar-accent/50"
                )}
                render={app.featureGate && app.href ? <Link href={app.href} /> : undefined}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    isActiveModule
                      ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/30"
                      : app.featureGate
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isActiveModule ? "text-foreground" : app.featureGate ? "text-sidebar-foreground" : "text-muted-foreground"
                      )}
                    >
                      {app.name}
                    </span>
                    {isActiveModule ? (
                      <Badge className="h-4 rounded-full border-emerald-400/30 bg-emerald-400/10 px-1.5 text-[9px] font-semibold tracking-wider text-emerald-500 uppercase">
                        Active
                      </Badge>
                    ) : app.featureGate ? (
                      <Badge className="h-4 rounded-full border-emerald-400/30 bg-emerald-400/10 px-1.5 text-[9px] font-semibold tracking-wider text-emerald-500 uppercase">
                        Live
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="h-4 rounded-full border-border bg-muted px-1.5 text-[9px] font-normal tracking-wider text-muted-foreground uppercase"
                      >
                        Soon
                      </Badge>
                    )}
                  </div>
                  <p
                    className={cn(
                      "truncate text-xs",
                      isActiveModule ? "text-foreground/70" : app.featureGate ? "text-muted-foreground" : "text-muted-foreground/50"
                    )}
                  >
                    {app.description}
                  </p>
                </div>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}