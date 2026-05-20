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
import { checkModuleAccess, type ModuleKey, MODULE_ENTITLEMENTS } from "@/lib/billing/features"

type PlantXModule = "quality" | "logistic" | null | undefined
type ModuleBadgeState = "ACTIVE" | "LIVE" | "LOCKED" | "SOON"

const MODULE_MAP: Record<"quality" | "logistic", ModuleKey> = {
  quality: "PLANT_QUALITY_MODULE",
  logistic: "PLANT_LOGISTIC_MODULE",
}

const LIVE_MODULES: Set<string> = new Set(["quality", "logistic"])

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  quality: ShieldCheck,
  logistic: TruckIcon,
  dock: TruckIcon,
  quote: FileText,
  trace: Leaf,
  audit: ClipboardCheck,
  asset: Settings,
  flow: MoveRight,
  staff: Users,
}

const MODULE_DESCRIPTIONS: Record<string, string> = {
  quality: "AI-Powered 8D & Quality Mgmt",
  logistic: "Vehicle Order & Delivery Control Tower",
  dock: "Warehouse Gate & Logistics",
  quote: "RFQ & Supplier Bidding",
  trace: "Traceability & Carbon Footprint",
  audit: "Digital Auditing (LPA, VDA)",
  asset: "Machinery Maintenance & OEE",
  flow: "Internal Material Flow & RFID",
  staff: "Skill Matrix & HSE Compliance",
}

const MODULE_HREFS: Record<string, string> = {
  quality: "/quality/oem",
  logistic: "/logistic",
  logisticPortal: "/logistic/portal",
}

interface AppModule {
  id: string
  name: string
  moduleKey: "quality" | "logistic" | null
  supplierVisible: boolean
}

const apps: AppModule[] = [
  { id: "quality", name: "PlantQuality", moduleKey: "quality", supplierVisible: true },
  { id: "logistic", name: "PlantLogistic", moduleKey: "logistic", supplierVisible: false },
  { id: "dock", name: "PlantDock", moduleKey: null, supplierVisible: false },
  { id: "quote", name: "PlantQuote", moduleKey: null, supplierVisible: false },
  { id: "trace", name: "PlantTrace / PlantGreen", moduleKey: null, supplierVisible: false },
  { id: "audit", name: "PlantAudit", moduleKey: null, supplierVisible: false },
  { id: "asset", name: "PlantAsset", moduleKey: null, supplierVisible: false },
  { id: "flow", name: "PlantFlow", moduleKey: null, supplierVisible: false },
  { id: "staff", name: "PlantStaff", moduleKey: null, supplierVisible: false },
]

function getModuleBadge(
  moduleId: string,
  moduleKey: "quality" | "logistic" | null,
  currentModule: PlantXModule,
  companyId: string,
  companyType: string
): ModuleBadgeState {
  if (currentModule && moduleKey && moduleKey === currentModule) {
    return "ACTIVE"
  }

  const isLive = LIVE_MODULES.has(moduleId)
  if (!isLive) {
    return "SOON"
  }

  if (moduleKey) {
    const entitlementKey = MODULE_MAP[moduleKey]
    const hasModule = checkModuleAccess(entitlementKey, companyId, companyType)
    if (!hasModule) {
      return "LOCKED"
    }
  }

  return "LIVE"
}

interface AppSwitcherProps {
  currentModule?: PlantXModule
  userPlan?: string
  userCompanyType?: string
  userCompanyId?: string
}

export function AppSwitcher({ currentModule, userPlan: _userPlan = "FREE", userCompanyType = "OEM", userCompanyId = "" }: AppSwitcherProps) {
  const companyType = userCompanyType ?? "OEM"
  const companyId = userCompanyId ?? ""
  const isPortalUser = companyType === "DEALER" || companyType === "DISTRIBUTOR"

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
            const Icon = MODULE_ICONS[app.id] ?? ShieldCheck
            const description = MODULE_DESCRIPTIONS[app.id] ?? app.name

            if (isPortalUser && app.id === "logistic") {
              return null
            }
            if (!app.supplierVisible && companyType === "SUPPLIER") {
              return null
            }

            let href: string | undefined
            if (isPortalUser && app.id === "quality") {
              return null
            }
            if (app.moduleKey) {
              href = MODULE_HREFS[app.id]
            }

            const badge = getModuleBadge(app.id, app.moduleKey, currentModule, companyId, companyType)

            const isActive = badge === "ACTIVE"
            const isLive = badge === "LIVE"
            const isLocked = badge === "LOCKED"

            const canNavigate = (isActive || isLive) && !!href

            return (
              <DropdownMenuItem
                key={app.id}
                disabled={!canNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-2.5",
                  canNavigate && "cursor-pointer hover:bg-sidebar-accent focus:bg-sidebar-accent",
                  isActive && "bg-sidebar-accent/50"
                )}
                render={canNavigate && href ? <Link href={href} /> : undefined}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    isActive
                      ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/30"
                      : isLive
                        ? "bg-emerald-500/10 text-emerald-500"
                        : isLocked
                          ? "bg-muted text-muted-foreground"
                          : "bg-muted text-muted-foreground/50"
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isActive ? "text-foreground" : isLive ? "text-sidebar-foreground" : "text-muted-foreground"
                      )}
                    >
                      {app.name}
                    </span>
                    {isActive ? (
                      <Badge className="h-4 rounded-full border-emerald-400/30 bg-emerald-400/10 px-1.5 text-[9px] font-semibold tracking-wider text-emerald-500 uppercase">
                        Active
                      </Badge>
                    ) : isLive ? (
                      <Badge className="h-4 rounded-full border-emerald-400/30 bg-emerald-400/10 px-1.5 text-[9px] font-semibold tracking-wider text-emerald-500 uppercase">
                        Live
                      </Badge>
                    ) : isLocked ? (
                      <Badge className="h-4 rounded-full border-border bg-muted px-1.5 text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
                        <LockIcon className="size-2.5 mr-0.5" />Locked
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
                      isActive ? "text-foreground/70" : isLive ? "text-muted-foreground" : "text-muted-foreground/50"
                    )}
                  >
                    {isLocked && app.moduleKey
                      ? (MODULE_ENTITLEMENTS[MODULE_MAP[app.moduleKey]]?.description ?? description)
                      : description
                    }
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