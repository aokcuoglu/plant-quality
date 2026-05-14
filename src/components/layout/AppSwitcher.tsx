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

type PlantXModule = "quality" | "logistic" | null

interface AppSwitcherProps {
  currentModule?: PlantXModule
}

const apps = [
  {
    id: "quality",
    name: "PlantQuality",
    description: "AI-Powered 8D & Quality Mgmt",
    icon: ShieldCheck,
    active: true,
    href: "/quality/oem",
    module: "quality" as const,
  },
  {
    id: "logistic",
    name: "PlantLogistic",
    description: "Vehicle Order & Delivery Control Tower",
    icon: TruckIcon,
    active: true,
    href: "/logistic",
    module: "logistic" as const,
  },
  {
    id: "dock",
    name: "PlantDock",
    description: "Warehouse Gate & Logistics",
    icon: TruckIcon,
    active: false,
    module: null as never,
  },
  {
    id: "quote",
    name: "PlantQuote",
    description: "RFQ & Supplier Bidding",
    icon: FileText,
    active: false,
    module: null as never,
  },
  {
    id: "trace",
    name: "PlantTrace / PlantGreen",
    description: "Traceability & Carbon Footprint",
    icon: Leaf,
    active: false,
    module: null as never,
  },
  {
    id: "audit",
    name: "PlantAudit",
    description: "Digital Auditing (LPA, VDA)",
    icon: ClipboardCheck,
    active: false,
    module: null as never,
  },
  {
    id: "asset",
    name: "PlantAsset",
    description: "Machinery Maintenance & OEE",
    icon: Settings,
    active: false,
    module: null as never,
  },
  {
    id: "flow",
    name: "PlantFlow",
    description: "Internal Material Flow & RFID",
    icon: MoveRight,
    active: false,
    module: null as never,
  },
  {
    id: "staff",
    name: "PlantStaff",
    description: "Skill Matrix & HSE Compliance",
    icon: Users,
    active: false,
    module: null as never,
  },
]

export function AppSwitcher({ currentModule }: AppSwitcherProps) {
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
            const isActiveModule = currentModule && app.module === currentModule
            return (
              <DropdownMenuItem
                key={app.id}
                disabled={!app.active}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-2.5",
                  app.active && "cursor-pointer hover:bg-sidebar-accent focus:bg-sidebar-accent",
                  isActiveModule && "bg-sidebar-accent/50"
                )}
                render={app.active && app.href ? <Link href={app.href} /> : undefined}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    isActiveModule
                      ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/30"
                      : app.active
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
                        isActiveModule ? "text-foreground" : app.active ? "text-sidebar-foreground" : "text-muted-foreground"
                      )}
                    >
                      {app.name}
                    </span>
                    {isActiveModule ? (
                      <Badge className="h-4 rounded-full border-emerald-400/30 bg-emerald-400/10 px-1.5 text-[9px] font-semibold tracking-wider text-emerald-500 uppercase">
                        Active
                      </Badge>
                    ) : app.active ? (
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
                      isActiveModule ? "text-foreground/70" : app.active ? "text-muted-foreground" : "text-muted-foreground/50"
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