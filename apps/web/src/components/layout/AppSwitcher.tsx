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
  Factory,
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
import { useTranslations } from "@/i18n/context"
import type { MessageKey } from "@/i18n/types"

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

const MODULE_DESCRIPTION_KEYS: Record<string, MessageKey> = {
  quality: "landing.productTaglines.quality",
  logistic: "landing.productTaglines.logistic",
  dock: "landing.productTaglines.dock",
  quote: "landing.productTaglines.quote",
  trace: "landing.productTaglines.trace",
  audit: "landing.productTaglines.audit",
  asset: "landing.productTaglines.asset",
  flow: "landing.productTaglines.flow",
  staff: "landing.productTaglines.staff",
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
  companyType: string,
  role?: string | null,
  userModules?: string[] | null,
  companyModules?: string[] | null
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
    const hasModule = checkModuleAccess(entitlementKey, companyId, companyType, role, userModules, companyModules)
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
  userRole?: string
  userModules?: string[]
  userCompanyModules?: string[]
}

export function AppSwitcher({ currentModule, userPlan: _userPlan = "FREE", userCompanyType = "OEM", userCompanyId = "", userRole, userModules, userCompanyModules }: AppSwitcherProps) {
  const companyType = userCompanyType ?? "OEM"
  const companyId = userCompanyId ?? ""
  const isPortalUser = companyType === "DEALER" || companyType === "DISTRIBUTOR"
  const canManageCompany = companyType === "OEM" && userRole === "ADMIN"
  const t = useTranslations()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-8 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:border-sidebar-ring data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground data-open:border-sidebar-ring"
        aria-label={t("shell.switchApp")}
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
            {t("shell.ecosystem")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-sidebar-border" />
          {canManageCompany && (
            <>
              <DropdownMenuItem
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-sidebar-accent focus:bg-sidebar-accent",
                  currentModule === null && "bg-sidebar-accent/50"
                )}
                render={<Link href="/dashboard" />}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Factory className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">PlantX</span>
                  <p className="truncate text-xs text-muted-foreground">{t("nav.companyPanel")}</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-sidebar-border" />
            </>
          )}
          {apps.map((app) => {
            const Icon = MODULE_ICONS[app.id] ?? ShieldCheck
            const description = MODULE_DESCRIPTION_KEYS[app.id] ? t(MODULE_DESCRIPTION_KEYS[app.id]) : app.name

            if (isPortalUser && app.id === "logistic") {
              const portalHref = "/logistic/portal"
              return (
                <DropdownMenuItem
                  key={app.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 cursor-default"
                  render={<Link href={portalHref} />}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-blue-600/30">
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{app.name}</span>
                      <Badge className="h-4 rounded-full border-border bg-blue-500/10 px-1.5 text-[9px] font-semibold tracking-wider text-foreground uppercase">{t("shell.active")}</Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{t("shell.orderTrackingPortal")}</p>
                  </div>
                </DropdownMenuItem>
              )
            }
            if (isPortalUser) {
              return null
            }
            if (!app.supplierVisible && companyType === "SUPPLIER") {
              return null
            }

            const href = app.moduleKey ? MODULE_HREFS[app.id] : undefined

            const badge = getModuleBadge(app.id, app.moduleKey, currentModule, companyId, companyType, userRole, userModules, userCompanyModules)

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
                      ? "bg-muted text-muted-foreground ring-1 ring-blue-600/30"
                      : isLive
                        ? "bg-muted text-muted-foreground"
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
                      <Badge className="h-4 rounded-full border-border bg-blue-500/10 px-1.5 text-[9px] font-semibold tracking-wider text-foreground uppercase">
                        {t("shell.active")}
                      </Badge>
                    ) : isLive ? (
                      <Badge className="h-4 rounded-full border-border bg-blue-500/10 px-1.5 text-[9px] font-semibold tracking-wider text-foreground uppercase">
                        {t("shell.live")}
                      </Badge>
                    ) : isLocked ? (
                      <Badge className="h-4 rounded-full border-border bg-muted px-1.5 text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
                        <LockIcon className="size-2.5 mr-0.5" />{t("shell.locked")}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="h-4 rounded-full border-border bg-muted px-1.5 text-[9px] font-normal tracking-wider text-muted-foreground uppercase"
                      >
                        {t("shell.soon")}
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
