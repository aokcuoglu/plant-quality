import "dotenv/config"
import { createHash } from "node:crypto"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
const LEGACY_STEPS = ["Production", "Quality Hold", "Wash", "PDI", "Yard", "Ready", "Dispatch", "Delivered"] as const

function codeFor(value: string) {
  const base = value.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toUpperCase().slice(0, 36) || "MODEL"
  return `${base}-${createHash("sha1").update(value).digest("hex").slice(0, 6).toUpperCase()}`
}

async function main() {
  const companies = await prisma.company.findMany({ where: { logisticOrders: { some: {} } }, select: { id: true } })
  for (const company of companies) {
    const orders = await prisma.plantLogisticOrder.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "asc" }, include: { lines: true } })
    const groupByType = new Map<string, string>()
    for (const vehicleType of [...new Set(orders.map((order) => order.vehicleType))]) {
      const group = await prisma.logisticVehicleGroup.upsert({ where: { companyId_code: { companyId: company.id, code: vehicleType } }, update: {}, create: { companyId: company.id, code: vehicleType, name: vehicleType.replaceAll("_", " ") } })
      groupByType.set(vehicleType, group.id)
      let legacy = await prisma.logisticFlowVersion.findFirst({ where: { companyId: company.id, groupId: group.id, name: "Legacy Flow" }, include: { nodes: { orderBy: { sequence: "asc" } } } })
      if (!legacy) legacy = await prisma.logisticFlowVersion.create({ data: { companyId: company.id, groupId: group.id, version: 0, name: "Legacy Flow", status: "ARCHIVED", nodes: { create: [{ clientId: "legacy-start", kind: "START", sequence: 0, nameSnapshot: "Start" }, ...LEGACY_STEPS.map((name, index) => ({ clientId: `legacy-${index}`, kind: "PROCESS" as const, sequence: index + 1, nameSnapshot: name, typeSnapshot: "OTHER" as const })), { clientId: "legacy-end", kind: "END", sequence: LEGACY_STEPS.length + 1, nameSnapshot: "End" }] }, edges: { create: Array.from({ length: LEGACY_STEPS.length + 1 }, (_, index) => ({ sourceClientId: index === 0 ? "legacy-start" : `legacy-${index - 1}`, targetClientId: index === LEGACY_STEPS.length ? "legacy-end" : `legacy-${index}` })) } }, include: { nodes: { orderBy: { sequence: "asc" } } } })
    }
    for (const order of orders) {
      if (order.lines.length) continue
      const groupId = groupByType.get(order.vehicleType)!
      const modelCode = codeFor(order.vehicleModel)
      const model = await prisma.logisticVehicleModel.upsert({ where: { companyId_code: { companyId: company.id, code: modelCode } }, update: {}, create: { companyId: company.id, groupId, code: modelCode, name: order.vehicleModel } })
      const legacy = await prisma.logisticFlowVersion.findFirstOrThrow({ where: { companyId: company.id, groupId, name: "Legacy Flow" }, include: { nodes: { orderBy: { sequence: "asc" } } } })
      const statusIndex = order.status === "DELIVERED" || order.status === "CLOSED" ? 7 : order.status === "DISPATCHED" ? 6 : order.status === "READY_FOR_DISPATCH" ? 5 : order.status === "QUALITY_HOLD" ? 1 : 0
      const currentNode = legacy.nodes.find((node) => node.clientId === `legacy-${statusIndex}`)!
      const line = await prisma.logisticOrderLine.create({ data: { companyId: company.id, orderId: order.id, vehicleModelId: model.id, sequence: 1, quantity: order.quantity, variant: order.vehicleVariant, powertrain: order.powertrain, priority: order.priority } })
      for (let index = 1; index <= order.quantity; index++) {
        const code = `${order.orderNumber}-01-${String(index).padStart(3, "0")}`
        const unit = await prisma.logisticVehicleUnit.create({ data: { companyId: company.id, orderLineId: line.id, vehicleModelId: model.id, temporaryUnitCode: code, vin: order.quantity === 1 ? order.vin : null, chassisNumber: order.quantity === 1 ? order.chassisNumber : null, flowVersionId: legacy.id, currentNodeId: currentNode.id, flowStatus: statusIndex === 7 ? "COMPLETED" : "ACTIVE", startedAt: order.createdAt, completedAt: statusIndex === 7 ? order.deliveredAt : null } })
        await prisma.logisticVehicleProcessVisit.create({ data: { companyId: company.id, vehicleUnitId: unit.id, nodeId: currentNode.id, enteredAt: order.updatedAt, transitionType: "START" } })
      }
    }
  }
}

main().finally(() => prisma.$disconnect())
