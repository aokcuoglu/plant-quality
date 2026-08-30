import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import {
  ShieldCheck,
  TruckIcon,
  FileText,
  Leaf,
  ClipboardCheck,
  Settings,
  MoveRight,
  Users,
} from "lucide-react"
import { ModuleCard, type ModuleCardVariant } from "@/components/dashboard/ModuleCard"
import { MODULE_CATALOG, getModuleStatus, type ModuleStatus } from "@/lib/billing/features"
import { getTranslations } from "@/i18n/server"

export const dynamic = "force-dynamic"

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

const STATUS_VARIANT: Record<ModuleStatus, ModuleCardVariant> = {
  ACTIVE: "live",
  LIVE: "live",
  LOCKED: "locked",
  SOON: "soon",
}

export default async function CompanyModulesPage() {
  const t = await getTranslations()
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role === "SUPER_ADMIN") redirect("/admin")
  if (session.user.companyType !== "OEM" || session.user.role !== "ADMIN") {
    redirect(session.user.companyType === "SUPPLIER" ? "/quality/supplier" : "/quality/oem")
  }

  const companyId = session.user.companyId
  const companyType = session.user.companyType

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, modules: true },
  })

  const companyModules = company?.modules ?? []

  const entries = MODULE_CATALOG.map((entry) => ({
    entry,
    status: getModuleStatus(entry, companyId, companyType, null, companyModules),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("dashboard.company.catalog.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dashboard.company.catalog.description", { company: company?.name ?? t("dashboard.company.company") })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(({ entry, status }) => (
          <ModuleCard
            key={entry.id}
            name={entry.name}
            description={t(`dashboard.company.catalog.modules.${entry.id}` as "dashboard.company.catalog.modules.quality")}
            icon={MODULE_ICONS[entry.id] ?? ShieldCheck}
            variant={STATUS_VARIANT[status]}
            href={entry.href ?? undefined}
          />
        ))}
      </div>
    </div>
  )
}
