import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/billing"
import type { DevPlanPriority, DevPlanStatus, DevPlanSourceType } from "@/generated/prisma/client"
import type {
  DevPlanListSummary,
  DevPlanListItem,
  DevPlanDetail,
} from "./types"

export async function getOemDevPlans(
  session: {
    user?: { companyId?: string | null; companyType?: string | null; role?: string | null; plan?: string | null }
  } | null,
  filters?: {
    status?: DevPlanStatus
    priority?: DevPlanPriority
    supplierId?: string
    sourceType?: DevPlanSourceType
    search?: string
  }
): Promise<DevPlanListSummary | null> {
  if (!session?.user?.companyId || session.user.companyType !== "OEM") return null

  const featureGate = requireFeature(session, "SUPPLIER_DEVELOPMENT")
  if (!featureGate.allowed) return null

  const companyId = session.user.companyId

  const where = {
    oemId: companyId,
    ...(filters?.status && { status: filters.status }),
    ...(filters?.priority && { priority: filters.priority }),
    ...(filters?.supplierId && { supplierId: filters.supplierId }),
    ...(filters?.sourceType && { sourceType: filters.sourceType }),
    ...(filters?.search && {
      OR: [
        { title: { contains: filters.search, mode: "insensitive" as const } },
        { description: { contains: filters.search, mode: "insensitive" as const } },
      ],
    }),
  }

  const [plans, totalCount, draftCount, openCount, supplierActionRequiredCount, oemReviewCount, completedCount] = await Promise.all([
    prisma.supplierDevelopmentPlan.findMany({
      where,
      include: {
        supplier: { select: { name: true } },
        owner: { select: { name: true } },
        createdBy: { select: { name: true } },
        actionItems: { select: { id: true, status: true, dueDate: true } },
        events: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplierDevelopmentPlan.count({ where }),
    prisma.supplierDevelopmentPlan.count({ where: { oemId: companyId, status: "DRAFT" } }),
    prisma.supplierDevelopmentPlan.count({ where: { oemId: companyId, status: "OPEN" } }),
    prisma.supplierDevelopmentPlan.count({ where: { oemId: companyId, status: "SUPPLIER_ACTION_REQUIRED" } }),
    prisma.supplierDevelopmentPlan.count({ where: { oemId: companyId, status: "OEM_REVIEW" } }),
    prisma.supplierDevelopmentPlan.count({ where: { oemId: companyId, status: "COMPLETED" } }),
  ])

  const allOverduePlans = await prisma.supplierDevelopmentPlan.count({
    where: {
      oemId: companyId,
      dueDate: { lt: new Date() },
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
  })

  const planItems: DevPlanListItem[] = plans.map((plan) => {
    const actionItems = plan.actionItems
    const completedItems = actionItems.filter((a) => a.status === "COMPLETED" || a.status === "ACCEPTED" || a.status === "CANCELLED")
    const overdueItems = actionItems.filter(
      (a) => a.dueDate && new Date(a.dueDate) < new Date() && a.status !== "COMPLETED" && a.status !== "ACCEPTED" && a.status !== "CANCELLED"
    )

    return {
      id: plan.id,
      title: plan.title,
      description: plan.description,
      priority: plan.priority,
      status: plan.status,
      sourceType: plan.sourceType,
      sourceId: plan.sourceId,
      dueDate: plan.dueDate,
      supplierId: plan.supplierId,
      supplierName: plan.supplier.name,
      oemId: plan.oemId,
      ownerId: plan.ownerId,
      ownerName: plan.owner?.name ?? null,
      createdById: plan.createdById,
      createdByName: plan.createdBy?.name ?? null,
      actionItemCount: actionItems.length,
      completedActionItemCount: completedItems.length,
      overdueActionItemCount: overdueItems.length,
      latestActivityAt: plan.events[0]?.createdAt ?? null,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }
  })

  return {
    totalCount,
    draftCount,
    openCount,
    supplierActionRequiredCount,
    oemReviewCount,
    completedCount,
    overdueCount: allOverduePlans,
    plans: planItems,
  }
}

export async function getOemDevPlanDetail(
  session: {
    user?: { companyId?: string | null; companyType?: string | null; role?: string | null; plan?: string | null }
  } | null,
  planId: string
): Promise<DevPlanDetail | null> {
  if (!session?.user?.companyId || session.user.companyType !== "OEM") return null

  const featureGate = requireFeature(session, "SUPPLIER_DEVELOPMENT")
  if (!featureGate.allowed) return null

  const plan = await prisma.supplierDevelopmentPlan.findFirst({
    where: { id: planId, oemId: session.user.companyId },
    include: {
      supplier: { select: { name: true } },
      oem: { select: { name: true } },
      owner: { select: { name: true } },
      createdBy: { select: { name: true } },
      completedBy: { select: { name: true } },
      actionItems: {
        orderBy: { createdAt: "asc" },
        include: { owner: { select: { name: true } } },
      },
      events: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true } } },
      },
    },
  })

  if (!plan) return null

  return {
    id: plan.id,
    title: plan.title,
    description: plan.description,
    priority: plan.priority,
    status: plan.status,
    sourceType: plan.sourceType,
    sourceId: plan.sourceId,
    dueDate: plan.dueDate,
    supplierId: plan.supplierId,
    supplierName: plan.supplier.name,
    oemId: plan.oemId,
    oemCompanyName: plan.oem.name,
    ownerId: plan.ownerId,
    ownerName: plan.owner?.name ?? null,
    createdById: plan.createdById,
    createdByName: plan.createdBy?.name ?? null,
    completedAt: plan.completedAt,
    completedById: plan.completedById,
    completedByName: plan.completedBy?.name ?? null,
    actionItems: plan.actionItems.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      ownerType: item.ownerType,
      ownerId: item.ownerId,
      ownerName: item.owner?.name ?? null,
      status: item.status,
      dueDate: item.dueDate,
      supplierResponse: item.supplierResponse,
      oemComment: item.oemComment,
      completedAt: item.completedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    events: plan.events.map((event) => ({
      id: event.id,
      actorId: event.actorId,
      actorName: event.actor?.name ?? null,
      type: event.type,
      message: event.message,
      metadata: event.metadata,
      createdAt: event.createdAt,
    })),
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  }
}

export async function getSupplierDevPlans(
  session: {
    user?: { companyId?: string | null; companyType?: string | null; role?: string | null; plan?: string | null }
  } | null
): Promise<DevPlanListItem[]> {
  if (!session?.user?.companyId || session.user.companyType !== "SUPPLIER") return []

  const supplierId = session.user.companyId

  const plans = await prisma.supplierDevelopmentPlan.findMany({
    where: { supplierId },
    include: {
      supplier: { select: { name: true } },
      owner: { select: { name: true } },
      createdBy: { select: { name: true } },
      actionItems: { select: { id: true, status: true, dueDate: true } },
      events: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return plans.map((plan) => {
    const actionItems = plan.actionItems
    const completedItems = actionItems.filter((a) => a.status === "COMPLETED" || a.status === "ACCEPTED" || a.status === "CANCELLED")
    const overdueItems = actionItems.filter(
      (a) => a.dueDate && new Date(a.dueDate) < new Date() && a.status !== "COMPLETED" && a.status !== "ACCEPTED" && a.status !== "CANCELLED"
    )

    return {
      id: plan.id,
      title: plan.title,
      description: plan.description,
      priority: plan.priority,
      status: plan.status,
      sourceType: plan.sourceType,
      sourceId: plan.sourceId,
      dueDate: plan.dueDate,
      supplierId: plan.supplierId,
      supplierName: plan.supplier.name,
      oemId: plan.oemId,
      ownerId: plan.ownerId,
      ownerName: plan.owner?.name ?? null,
      createdById: plan.createdById,
      createdByName: plan.createdBy?.name ?? null,
      actionItemCount: actionItems.length,
      completedActionItemCount: completedItems.length,
      overdueActionItemCount: overdueItems.length,
      latestActivityAt: plan.events[0]?.createdAt ?? null,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }
  })
}

export async function getSupplierDevPlanDetail(
  session: {
    user?: { companyId?: string | null; companyType?: string | null; role?: string | null; plan?: string | null }
  } | null,
  planId: string
): Promise<DevPlanDetail | null> {
  if (!session?.user?.companyId) return null

  const plan = await prisma.supplierDevelopmentPlan.findFirst({
    where: {
      id: planId,
      supplierId: session.user.companyId,
    },
    include: {
      supplier: { select: { name: true } },
      oem: { select: { name: true } },
      owner: { select: { name: true } },
      createdBy: { select: { name: true } },
      completedBy: { select: { name: true } },
      actionItems: {
        orderBy: { createdAt: "asc" },
        where: { ownerType: "SUPPLIER" },
        include: { owner: { select: { name: true } } },
      },
      events: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true } } },
      },
    },
  })

  if (!plan) return null

  return {
    id: plan.id,
    title: plan.title,
    description: plan.description,
    priority: plan.priority,
    status: plan.status,
    sourceType: plan.sourceType,
    sourceId: plan.sourceId,
    dueDate: plan.dueDate,
    supplierId: plan.supplierId,
    supplierName: plan.supplier.name,
    oemId: plan.oemId,
    oemCompanyName: plan.oem.name,
    ownerId: plan.ownerId,
    ownerName: plan.owner?.name ?? null,
    createdById: plan.createdById,
    createdByName: plan.createdBy?.name ?? null,
    completedAt: plan.completedAt,
    completedById: plan.completedById,
    completedByName: plan.completedBy?.name ?? null,
    actionItems: plan.actionItems.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      ownerType: item.ownerType,
      ownerId: item.ownerId,
      ownerName: item.owner?.name ?? null,
      status: item.status,
      dueDate: item.dueDate,
      supplierResponse: item.supplierResponse,
      oemComment: item.oemComment,
      completedAt: item.completedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    events: plan.events.map((event) => ({
      id: event.id,
      actorId: event.actorId,
      actorName: event.actor?.name ?? null,
      type: event.type,
      message: event.message,
      metadata: event.metadata,
      createdAt: event.createdAt,
    })),
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  }
}

export async function getSuppliersForOem(session: { user?: { companyId?: string | null; companyType?: string | null } } | null): Promise<{ id: string; name: string }[]> {
  if (!session?.user?.companyId || session.user.companyType !== "OEM") return []

  const suppliers = await prisma.company.findMany({
    where: { type: "SUPPLIER" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return suppliers
}

export async function getOemUsers(session: { user?: { companyId?: string | null; companyType?: string | null } } | null): Promise<{ id: string; name: string | null }[]> {
  if (!session?.user?.companyId || session.user.companyType !== "OEM") return []

  return prisma.user.findMany({
    where: { companyId: session.user.companyId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}

export async function getSupplierUsers(supplierId: string): Promise<{ id: string; name: string | null }[]> {
  return prisma.user.findMany({
    where: { companyId: supplierId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}