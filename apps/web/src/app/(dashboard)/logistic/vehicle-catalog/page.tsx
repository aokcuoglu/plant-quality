import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/i18n/server";
import { VehicleCatalogTable } from "./vehicle-catalog-table";

export const dynamic = "force-dynamic";

export default async function VehicleCatalogPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");
  const t = await getTranslations();
  const groups = await prisma.logisticVehicleGroup.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { name: "asc" },
    include: { models: { orderBy: { name: "asc" } } },
  });
  const canManage =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("logistic.dynamicFlow.catalogTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("logistic.dynamicFlow.catalogDescription")}
        </p>
        </div>
        <p className="text-xs text-muted-foreground">{t("logistic.dynamicFlow.catalogHint")}</p>
      </div>
      <VehicleCatalogTable
        groups={groups.map((group) => ({
          id: group.id,
          name: group.name,
          code: group.code,
          description: group.description,
          models: group.models.map((model) => ({ id: model.id, name: model.name, code: model.code, groupId: group.id })),
        }))}
        canManage={canManage}
      />
    </div>
  );
}
