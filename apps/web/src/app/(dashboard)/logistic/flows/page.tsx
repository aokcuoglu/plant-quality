import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { defaultHandleCounts } from "@/lib/logistic/flow-graph"
import { BusinessWorkflowDesigner } from "./business-workflow-designer"
import { FlowDesigner } from "./flow-designer"

export const dynamic = "force-dynamic"

export default async function FlowsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; group?: string; workflow?: string }>
}) {
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")
  const {
    type,
    group: selectedGroupId,
    workflow: selectedWorkflowId,
  } = await searchParams
  const companyId = session.user.companyId
  const currentUser = await prisma.user.findFirst({
    where: { id: session.user.id, companyId },
    select: { role: true },
  })
  const canManage = currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN"

  if (type !== "vehicle") {
    const [definitions, organizationUnits, users] = await Promise.all([
      prisma.logisticWorkflowDefinition.findMany({
        where: { companyId, active: true },
        orderBy: [{ subjectType: "asc" }, { name: "asc" }],
        include: {
          versions: {
            where: { companyId },
            orderBy: { version: "desc" },
            include: {
              nodes: { where: { companyId }, orderBy: { sequence: "asc" } },
              edges: { where: { companyId } },
            },
          },
        },
      }),
      prisma.organizationUnit.findMany({
        where: { companyId },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      }),
      prisma.user.findMany({
        where: { companyId, role: { in: ["EDITOR", "ADMIN", "SUPER_ADMIN"] } },
        orderBy: [{ name: "asc" }, { email: "asc" }],
        select: { id: true, name: true, email: true, orgUnitId: true },
      }),
    ])

    const selected =
      definitions.find((definition) => definition.id === selectedWorkflowId) ??
      definitions.find((definition) => definition.isDefault) ??
      definitions[0]
    const draft = selected?.versions.find((version) => version.status === "DRAFT")
    const published = selected?.versions.find((version) => version.status === "PUBLISHED")

    return (
      <BusinessWorkflowDesigner
        definitions={definitions.map((definition) => ({
          id: definition.id,
          code: definition.code,
          name: definition.name,
          description: definition.description,
          subjectType: definition.subjectType,
          isDefault: definition.isDefault,
          versions: definition.versions.map((version) => ({
            id: version.id,
            version: version.version,
            status: version.status,
          })),
        }))}
        selectedDefinitionId={selected?.id ?? null}
        draft={
          draft
            ? {
                id: draft.id,
                version: draft.version,
                nodes: draft.nodes.map((node) => ({
                  id: node.clientId,
                  kind: node.kind,
                  name: node.name,
                  description: node.description,
                  position: { x: node.positionX, y: node.positionY },
                  assignmentStrategy: node.assignmentStrategy,
                  organizationUnitId: node.organizationUnitId,
                  responsibleUserId: node.responsibleUserId,
                  taskScope: node.taskScope,
                  allowedActions: node.allowedActions,
                  automationActionKey: node.automationActionKey,
                  targetDurationMinutes: node.targetDurationMinutes,
                })),
                edges: draft.edges.map((edge) => ({
                  source: edge.sourceClientId,
                  target: edge.targetClientId,
                  actionKey: edge.actionKey,
                  label: edge.label,
                })),
              }
            : null
        }
        published={
          published
            ? {
                nodes: published.nodes.map((node) => ({
                  id: node.clientId,
                  kind: node.kind,
                  name: node.name,
                  description: node.description,
                  position: { x: node.positionX, y: node.positionY },
                  assignmentStrategy: node.assignmentStrategy,
                  organizationUnitId: node.organizationUnitId,
                  responsibleUserId: node.responsibleUserId,
                  taskScope: node.taskScope,
                  allowedActions: node.allowedActions,
                  automationActionKey: node.automationActionKey,
                  targetDurationMinutes: node.targetDurationMinutes,
                })),
                edges: published.edges.map((edge) => ({
                  source: edge.sourceClientId,
                  target: edge.targetClientId,
                  actionKey: edge.actionKey,
                  label: edge.label,
                })),
              }
            : null
        }
        organizationUnits={organizationUnits}
        users={users.map((user) => ({
          id: user.id,
          name: user.name ?? "",
          email: user.email,
          organizationUnitId: user.orgUnitId,
        }))}
        canManage={canManage}
      />
    )
  }

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
      },
    }),
  ])

  const usedProcessIds = new Set(
    processUsages.flatMap((usage) => (usage.processId ? [usage.processId] : [])),
  )

  const selected = groups.find((group) => group.id === selectedGroupId) ?? groups[0]
  const draft = selected?.flowVersions.find((flow) => flow.status === "DRAFT")
  const published = selected?.flowVersions.find((flow) => flow.status === "PUBLISHED")
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
              version: draft.version,
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
      published={
        published
          ? {
              nodes: published.nodes.map((node) => {
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
              edges: published.edges.map((edge) => ({
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
        isUsed: usedProcessIds.has(process.id),
      }))}
      canManage={canManage}
    />
  )
}
