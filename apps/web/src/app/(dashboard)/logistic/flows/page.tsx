import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { defaultHandleCounts } from "@/lib/logistic/flow-graph"
import { FlowDesigner } from "./flow-designer"

export const dynamic = "force-dynamic"

export default async function FlowsPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  const { group: selectedGroupId } = await searchParams
  const companyId = session.user.companyId
  const [groups, processes, processUsages] = await Promise.all([
    prisma.logisticVehicleGroup.findMany({
      where: { companyId, active: true },
      orderBy: { name: "asc" },
      include: {
        flowVersions: {
          orderBy: { version: "desc" },
          include: { nodes: { orderBy: { sequence: "asc" } }, edges: true },
        },
      },
    }),
    prisma.logisticProcess.findMany({
      where: { companyId, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.logisticFlowNode.findMany({
      where: {
        processId: { not: null },
        flowVersion: {
          companyId,
          status: { in: ["DRAFT", "PUBLISHED"] },
        },
      },
      select: {
        processId: true,
        flowVersion: {
          select: {
            group: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ])

  const usageByProcess = new Map<string, Map<string, string>>()
  for (const usage of processUsages) {
    if (!usage.processId) continue
    const group = usage.flowVersion.group
    const groupsForProcess = usageByProcess.get(usage.processId) ?? new Map<string, string>()
    groupsForProcess.set(group.id, group.name)
    usageByProcess.set(usage.processId, groupsForProcess)
  }

  const selected = groups.find((group) => group.id === selectedGroupId) ?? groups[0]
  const draft = selected?.flowVersions.find((flow) => flow.status === "DRAFT")
  return (
    <FlowDesigner
      groups={groups.map((group) => ({
        id: group.id,
        name: group.name,
        versions: group.flowVersions.map((flow) => ({
          id: flow.id,
          version: flow.version,
          status: flow.status,
        })),
      }))}
      selectedGroupId={selected?.id ?? null}
      draft={
        draft
          ? {
              id: draft.id,
              nodes: draft.nodes.map((node) => {
                const defaults = defaultHandleCounts(node.kind)
                return {
                  id: node.clientId,
                  kind: node.kind,
                  processId: node.processId,
                  name: node.nameSnapshot,
                  position: { x: node.positionX, y: node.positionY },
                  inputCount: node.inputCount ?? defaults.inputCount,
                  outputCount: node.outputCount ?? defaults.outputCount,
                }
              }),
              edges: draft.edges.map((edge) => ({
                id: edge.id,
                source: edge.sourceClientId,
                target: edge.targetClientId,
                sourceHandle: edge.sourceHandle,
                targetHandle: edge.targetHandle,
              })),
            }
          : null
      }
      processes={processes.map((process) => ({
        id: process.id,
        name: process.name,
        type: process.type,
        description: process.description,
        targetDurationMinutes: process.targetDurationMinutes,
        usedInGroups: [...(usageByProcess.get(process.id)?.values() ?? [])].sort(),
      }))}
      canManage={session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN"}
    />
  )
}
