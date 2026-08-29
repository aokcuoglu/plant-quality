import type {
  LogisticOrderStatus,
  DispatchStatus,
  ProductionMilestoneStatus,
  ExternalOrderStatus,
} from "@/generated/prisma/client"

export type SlaStatus =
  | "ON_TRACK"
  | "AT_RISK"
  | "DELAYED"
  | "BLOCKED"
  | "DELIVERED"
  | "CANCELLED"

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export type DelayCategory =
  | "PRODUCTION_DELAY"
  | "MILESTONE_OVERDUE"
  | "QUALITY_HOLD_AGING"
  | "YARD_AGING"
  | "DISPATCH_DELAY"
  | "DELIVERY_RISK"
  | "ETA_OVERDUE"
  | "EXTERNAL_COMMITMENT_RISK"
  | "NONE"

export type ExternalDelayStatus =
  | "ON_TRACK"
  | "AT_RISK"
  | "DELAYED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CONTACT_OEM"

export const SLA_STATUS_LABELS: Record<SlaStatus, string> = {
  ON_TRACK: "On Track",
  AT_RISK: "At Risk",
  DELAYED: "Delayed",
  BLOCKED: "Blocked",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
}

export const DELAY_CATEGORY_LABELS: Record<DelayCategory, string> = {
  PRODUCTION_DELAY: "Production Delay",
  MILESTONE_OVERDUE: "Milestone Overdue",
  QUALITY_HOLD_AGING: "Quality Hold Aging",
  YARD_AGING: "Yard Aging",
  DISPATCH_DELAY: "Dispatch Delay",
  DELIVERY_RISK: "Delivery Risk",
  ETA_OVERDUE: "ETA Overdue",
  EXTERNAL_COMMITMENT_RISK: "External Commitment Risk",
  NONE: "—",
}

export const EXTERNAL_DELAY_STATUS_LABELS: Record<ExternalDelayStatus, string> = {
  ON_TRACK: "On Track",
  AT_RISK: "At Risk",
  DELAYED: "Delayed",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  CONTACT_OEM: "Contact OEM",
}

export const SLA_STATUS_COLORS: Record<SlaStatus, string> = {
  ON_TRACK: "bg-muted text-muted-foreground",
  AT_RISK: "bg-muted text-muted-foreground",
  DELAYED: "bg-destructive/10 text-destructive",
  BLOCKED: "bg-destructive/10 text-destructive",
  DELIVERED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-muted text-muted-foreground",
}

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-muted text-muted-foreground",
  HIGH: "bg-destructive/10 text-destructive",
  CRITICAL: "bg-destructive/10 text-destructive",
}

export const EXTERNAL_DELAY_STATUS_COLORS: Record<ExternalDelayStatus, string> = {
  ON_TRACK: "bg-muted text-muted-foreground",
  AT_RISK: "bg-muted text-muted-foreground",
  DELAYED: "bg-destructive/10 text-destructive",
  IN_TRANSIT: "bg-accent text-accent-foreground",
  DELIVERED: "bg-muted text-muted-foreground",
  CONTACT_OEM: "bg-destructive/10 text-destructive",
}

export const DELIVERED_STATUSES: LogisticOrderStatus[] = ["DELIVERED", "CLOSED"]
export const CANCELLED_STATUSES: LogisticOrderStatus[] = ["REJECTED", "CANCELLED"]
export const BLOCKED_ORDER_STATUSES: LogisticOrderStatus[] = ["QUALITY_HOLD"]

export interface MilestoneDelayInfo {
  milestoneId: string
  gate: string
  title: string
  status: ProductionMilestoneStatus
  plannedFinish: Date | null
  overdue: boolean
  daysOverdue: number
  qualityHold: boolean
  blocked: boolean
  responsibleDepartment: string | null
  delayReason: string | null
}

export interface YardDelayInfo {
  readyForDispatch: boolean
  blockedForDispatch: boolean
  blockReason: string | null
  daysInYard: number | null
}

export interface DispatchDelayInfo {
  dispatchId: string
  status: DispatchStatus
  plannedLoadingDate: Date | null
  loadingOverdue: boolean
  daysLoadingOverdue: number
  estimatedArrivalDate: Date | null
  etaOverdue: boolean
  daysEtaOverdue: number
}

export interface OrderSlaSummary {
  orderId: string
  orderNumber: string
  slaStatus: SlaStatus
  riskLevel: RiskLevel
  targetDate: Date | null
  daysUntilOrOverdue: number | null
  delayCategory: DelayCategory
  currentBlockingStage: string | null
  milestoneDelays: MilestoneDelayInfo[]
  yardDelay: YardDelayInfo | null
  dispatchDelays: DispatchDelayInfo[]
  internalReason: string | null
  suggestedAction: string | null
  responsibleDepartment: string | null
}

export interface OrderSlaInput {
  id: string
  orderNumber: string
  status: LogisticOrderStatus
  requestedDeliveryDate: Date | null
  plannedDeliveryDate: Date | null
  deliveredAt: Date | null
  closedAt: Date | null
  externalVisible: boolean
  externalStatus: ExternalOrderStatus | null
  externalStatusNote: string | null
  milestones: {
    id: string
    gate: string
    title: string
    status: ProductionMilestoneStatus
    plannedFinish: Date | null
    qualityHold: boolean
    responsibleDepartment: string | null
    delayReason: string | null
  }[]
  yardStatus: {
    readyForDispatch: boolean
    blockedForDispatch: boolean
    blockReason: string | null
    lastMovementAt: Date | null
  } | null
  dispatches: {
    id: string
    status: DispatchStatus
    plannedLoadingDate: Date | null
    estimatedArrivalDate: Date | null
  }[]
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function daysBetween(from: Date, to: Date): number {
  const fromDay = startOfDay(from)
  const toDay = startOfDay(to)
  return Math.round((toDay.getTime() - fromDay.getTime()) / 86400000)
}

function daysDiffFromNow(date: Date): number {
  return daysBetween(new Date(), date)
}

export function getSlaTargetDate(order: OrderSlaInput): Date | null {
  if (order.deliveredAt || order.closedAt) return null
  const requested = order.requestedDeliveryDate ? new Date(order.requestedDeliveryDate) : null
  const planned = order.plannedDeliveryDate ? new Date(order.plannedDeliveryDate) : null
  if (requested && !isNaN(requested.getTime())) return requested
  if (planned && !isNaN(planned.getTime())) return planned
  return null
}

export function getOrderSlaStatus(order: OrderSlaInput): SlaStatus {
  if (DELIVERED_STATUSES.includes(order.status)) return "DELIVERED"
  if (CANCELLED_STATUSES.includes(order.status)) return "CANCELLED"

  const hasBlockedMilestone = order.milestones.some(
    (m) => m.status === "BLOCKED" || m.status === "QUALITY_HOLD"
  )
  const yardBlocked = order.yardStatus?.blockedForDispatch === true

  if (hasBlockedMilestone || yardBlocked || BLOCKED_ORDER_STATUSES.includes(order.status)) {
    return "BLOCKED"
  }

  const target = getSlaTargetDate(order)
  if (!target) return "ON_TRACK"

  const daysToTarget = daysDiffFromNow(target)

  if (daysToTarget < 0) return "DELAYED"
  if (daysToTarget <= 7) return "AT_RISK"

  const hasOverdueMilestone = order.milestones.some(
    (m) =>
      m.status !== "COMPLETED" &&
      m.status !== "SKIPPED" &&
      m.status !== "CANCELLED" &&
      m.plannedFinish &&
      new Date(m.plannedFinish) < new Date()
  )
  const hasDispatchDelay = order.dispatches.some(
    (d) =>
      d.status !== ("DELIVERED" as DispatchStatus) &&
      d.status !== ("CANCELLED" as DispatchStatus) &&
      ((d.plannedLoadingDate && new Date(d.plannedLoadingDate) < new Date() && d.status !== ("LOADED" as DispatchStatus) && d.status !== ("IN_TRANSIT" as DispatchStatus) && d.status !== ("ARRIVED" as DispatchStatus) && d.status !== ("DELIVERED" as DispatchStatus)) ||
        (d.estimatedArrivalDate && new Date(d.estimatedArrivalDate) < new Date() && d.status !== ("ARRIVED" as DispatchStatus) && d.status !== ("DELIVERED" as DispatchStatus)))
  )

  if (hasOverdueMilestone || hasDispatchDelay) return "AT_RISK"

  return "ON_TRACK"
}

export function getOrderRiskLevel(order: OrderSlaInput): RiskLevel {
  const sla = getOrderSlaStatus(order)

  if (sla === "DELIVERED" || sla === "CANCELLED") return "LOW"

  if (sla === "BLOCKED") {
    const target = getSlaTargetDate(order)
    if (target && daysDiffFromNow(target) < 0) return "CRITICAL"
    return "HIGH"
  }

  if (sla === "DELAYED") {
    const target = getSlaTargetDate(order)
    if (!target) return "MEDIUM"
    const daysOverdue = Math.abs(daysDiffFromNow(target))
    if (daysOverdue > 14) return "CRITICAL"
    if (daysOverdue > 7) return "HIGH"
    return "MEDIUM"
  }

  if (sla === "AT_RISK") {
    const hasHold = order.milestones.some((m) => m.status === "QUALITY_HOLD" || m.status === "BLOCKED")
    if (hasHold) return "HIGH"
    return "MEDIUM"
  }

  return "LOW"
}

export function getOrderDelayCategory(order: OrderSlaInput): DelayCategory {
  const sla = getOrderSlaStatus(order)
  if (sla === "DELIVERED" || sla === "CANCELLED") return "NONE"

  if (sla === "BLOCKED") {
    const qHold = order.milestones.find((m) => m.status === "QUALITY_HOLD")
    if (qHold) return "QUALITY_HOLD_AGING"
    const blocked = order.milestones.find((m) => m.status === "BLOCKED")
    if (blocked) return "PRODUCTION_DELAY"
    if (order.yardStatus?.blockedForDispatch) return "YARD_AGING"
    return "PRODUCTION_DELAY"
  }

  if (sla === "DELAYED" || sla === "AT_RISK") {
    const overdueMilestone = order.milestones.find(
      (m) =>
        m.status !== "COMPLETED" &&
        m.status !== "SKIPPED" &&
        m.status !== "CANCELLED" &&
        m.plannedFinish &&
        new Date(m.plannedFinish) < new Date()
    )
    if (overdueMilestone) return "MILESTONE_OVERDUE"

    const loadingDelay = order.dispatches.find(
      (d) =>
        d.plannedLoadingDate &&
        new Date(d.plannedLoadingDate) < new Date() &&
        d.status !== "LOADED" &&
        d.status !== "IN_TRANSIT" &&
        d.status !== "ARRIVED" &&
        d.status !== "DELIVERED" &&
        d.status !== "CANCELLED"
    )
    if (loadingDelay) return "DISPATCH_DELAY"

    const etaDelay = order.dispatches.find(
      (d) =>
        d.estimatedArrivalDate &&
        new Date(d.estimatedArrivalDate) < new Date() &&
        d.status === "IN_TRANSIT"
    )
    if (etaDelay) return "ETA_OVERDUE"

    if (order.requestedDeliveryDate && daysDiffFromNow(new Date(order.requestedDeliveryDate)) < 0) {
      return "EXTERNAL_COMMITMENT_RISK"
    }

    return "DELIVERY_RISK"
  }

  return "NONE"
}

export function getDaysUntilOrOverdue(order: OrderSlaInput): number | null {
  const target = getSlaTargetDate(order)
  if (!target) return null
  return daysDiffFromNow(target)
}

export function getCurrentBlockingStage(order: OrderSlaInput): string | null {
  const blockedMilestone = order.milestones.find(
    (m) => m.status === "BLOCKED" || m.status === "QUALITY_HOLD"
  )
  if (blockedMilestone) return blockedMilestone.title

  if (order.yardStatus?.blockedForDispatch) return "Dispatch Blocked (Yard)"

  return null
}

export function getMilestoneDelays(order: OrderSlaInput): MilestoneDelayInfo[] {
  return order.milestones
    .filter((m) => {
      if (m.status === "COMPLETED" || m.status === "SKIPPED" || m.status === "CANCELLED") return false
      if (m.status === "BLOCKED" || m.status === "QUALITY_HOLD") return true
      if (m.plannedFinish && new Date(m.plannedFinish) < new Date()) return true
      return false
    })
    .map((m) => ({
      milestoneId: m.id,
      gate: m.gate,
      title: m.title,
      status: m.status,
      plannedFinish: m.plannedFinish ? new Date(m.plannedFinish) : null,
      overdue: m.plannedFinish ? new Date(m.plannedFinish) < new Date() : false,
      daysOverdue: m.plannedFinish
        ? Math.max(0, Math.abs(daysDiffFromNow(new Date(m.plannedFinish))))
        : 0,
      qualityHold: m.qualityHold,
      blocked: m.status === "BLOCKED" || m.status === "QUALITY_HOLD",
      responsibleDepartment: m.responsibleDepartment,
      delayReason: m.delayReason,
    }))
}

export function getYardDelay(order: OrderSlaInput): YardDelayInfo | null {
  if (!order.yardStatus) return null

  let daysInYard: number | null = null
  if (order.yardStatus.lastMovementAt) {
    daysInYard = Math.max(0, daysBetween(new Date(order.yardStatus.lastMovementAt), new Date()))
  }

  return {
    readyForDispatch: order.yardStatus.readyForDispatch,
    blockedForDispatch: order.yardStatus.blockedForDispatch,
    blockReason: order.yardStatus.blockReason ?? null,
    daysInYard,
  }
}

export function getDispatchDelays(order: OrderSlaInput): DispatchDelayInfo[] {
  return order.dispatches
    .filter((d) => d.status !== "DELIVERED" && d.status !== "CANCELLED")
    .map((d) => {
      const loadingOverdue =
        d.plannedLoadingDate &&
        new Date(d.plannedLoadingDate) < new Date() &&
        d.status !== "LOADED" &&
        d.status !== "IN_TRANSIT" &&
        d.status !== "ARRIVED" &&
        d.status !== "DELIVERED"

      const etaOverdue =
        d.estimatedArrivalDate &&
        new Date(d.estimatedArrivalDate) < new Date() &&
        d.status === "IN_TRANSIT"

      return {
        dispatchId: d.id,
        status: d.status,
        plannedLoadingDate: d.plannedLoadingDate ? new Date(d.plannedLoadingDate) : null,
        loadingOverdue: !!loadingOverdue,
        daysLoadingOverdue: loadingOverdue && d.plannedLoadingDate
          ? Math.max(0, Math.abs(daysDiffFromNow(new Date(d.plannedLoadingDate))))
          : 0,
        estimatedArrivalDate: d.estimatedArrivalDate ? new Date(d.estimatedArrivalDate) : null,
        etaOverdue: !!etaOverdue,
        daysEtaOverdue: etaOverdue && d.estimatedArrivalDate
          ? Math.max(0, Math.abs(daysDiffFromNow(new Date(d.estimatedArrivalDate))))
          : 0,
      }
    })
}

export function getInternalDelayReason(order: OrderSlaInput): string | null {
  const cat = getOrderDelayCategory(order)
  if (cat === "NONE") return null

  const blocked = getCurrentBlockingStage(order)
  if (blocked) return blocked

  const catLabels: Record<DelayCategory, string | null> = {
    PRODUCTION_DELAY: "Production delay detected",
    MILESTONE_OVERDUE: "Production milestone overdue",
    QUALITY_HOLD_AGING: "Quality hold unresolved",
    YARD_AGING: "Vehicle waiting in yard",
    DISPATCH_DELAY: "Dispatch loading overdue",
    DELIVERY_RISK: "Delivery target at risk",
    ETA_OVERDUE: "Estimated arrival overdue",
    EXTERNAL_COMMITMENT_RISK: "Customer commitment date at risk",
    NONE: null,
  }

  return catLabels[cat]
}

export function getResponsibleDepartment(order: OrderSlaInput): string | null {
  const blockedMilestone = order.milestones.find(
    (m) => m.status === "BLOCKED" || m.status === "QUALITY_HOLD"
  )
  if (blockedMilestone?.responsibleDepartment) return blockedMilestone.responsibleDepartment

  const cat = getOrderDelayCategory(order)
  const deptMap: Partial<Record<DelayCategory, string>> = {
    PRODUCTION_DELAY: "Production",
    MILESTONE_OVERDUE: "Production Planning",
    QUALITY_HOLD_AGING: "Quality",
    YARD_AGING: "Logistics",
    DISPATCH_DELAY: "Logistics",
    DELIVERY_RISK: "Logistics",
    ETA_OVERDUE: "Logistics",
    EXTERNAL_COMMITMENT_RISK: "Sales",
  }

  return deptMap[cat] ?? null
}

export function getSuggestedAction(order: OrderSlaInput): string | null {
  const cat = getOrderDelayCategory(order)
  const actionMap: Record<DelayCategory, string | null> = {
    PRODUCTION_DELAY: "Review blocked milestone and resolve production issue",
    MILESTONE_OVERDUE: "Escalate overdue milestone to responsible department",
    QUALITY_HOLD_AGING: "Initiate quality review to resolve hold",
    YARD_AGING: "Clear dispatch block and arrange transport",
    DISPATCH_DELAY: "Confirm carrier and loading schedule",
    DELIVERY_RISK: "Assess delivery timeline and notify customer",
    ETA_OVERDUE: "Track shipment and verify arrival status",
    EXTERNAL_COMMITMENT_RISK: "Review customer commitment and adjust plan",
    NONE: null,
  }

  return actionMap[cat]
}

export function getOrderSlaSummary(order: OrderSlaInput): OrderSlaSummary {
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    slaStatus: getOrderSlaStatus(order),
    riskLevel: getOrderRiskLevel(order),
    targetDate: getSlaTargetDate(order),
    daysUntilOrOverdue: getDaysUntilOrOverdue(order),
    delayCategory: getOrderDelayCategory(order),
    currentBlockingStage: getCurrentBlockingStage(order),
    milestoneDelays: getMilestoneDelays(order),
    yardDelay: getYardDelay(order),
    dispatchDelays: getDispatchDelays(order),
    internalReason: getInternalDelayReason(order),
    suggestedAction: getSuggestedAction(order),
    responsibleDepartment: getResponsibleDepartment(order),
  }
}

export function getExternalDelayStatus(order: OrderSlaInput): ExternalDelayStatus {
  const sla = getOrderSlaStatus(order)
  const dispatchStatus = order.dispatches[0]?.status

  if (sla === "DELIVERED") return "DELIVERED"
  if (sla === "CANCELLED") return "CONTACT_OEM"
  if (sla === "BLOCKED") return "CONTACT_OEM"

  if (dispatchStatus === "IN_TRANSIT") {
    const eta = order.dispatches[0]?.estimatedArrivalDate
    if (eta && new Date(eta) < new Date()) return "DELAYED"
    return "IN_TRANSIT"
  }

  if (sla === "DELAYED") return "DELAYED"
  if (sla === "AT_RISK") return "AT_RISK"

  return "ON_TRACK"
}

export function getExternalEta(order: OrderSlaInput): Date | null {
  const dispatch = order.dispatches[0]
  if (dispatch?.estimatedArrivalDate) {
    const d = new Date(dispatch.estimatedArrivalDate)
    if (!isNaN(d.getTime())) return d
  }
  if (order.plannedDeliveryDate) {
    const d = new Date(order.plannedDeliveryDate)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

export const NOT_SCHEDULED = "Not scheduled"

export function formatSlaDate(date: Date | null | undefined): string {
  if (!date) return NOT_SCHEDULED
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return NOT_SCHEDULED
  return d.toLocaleDateString()
}

export function formatDaysValue(days: number | null): string {
  if (days === null) return NOT_SCHEDULED
  if (days > 0) return `${days}d left`
  if (days < 0) return `${Math.abs(days)}d overdue`
  return "Today"
}