export type PortalUserRole = "DEALER" | "DISTRIBUTOR"

export function isPortalUser(companyType: string | null | undefined): boolean {
  return companyType === "DEALER" || companyType === "DISTRIBUTOR"
}

export function isDealerUser(companyType: string | null | undefined): boolean {
  return companyType === "DEALER"
}

export function isDistributorUser(companyType: string | null | undefined): boolean {
  return companyType === "DISTRIBUTOR"
}

export function isSupplierUser(companyType: string | null | undefined): boolean {
  return companyType === "SUPPLIER"
}

export function isOemUser(companyType: string | null | undefined): boolean {
  return companyType === "OEM"
}

export function getPortalUserRole(companyType: string | null | undefined): PortalUserRole | null {
  if (companyType === "DEALER") return "DEALER"
  if (companyType === "DISTRIBUTOR") return "DISTRIBUTOR"
  return null
}

export interface PortalSession {
  userId: string
  companyId: string
  companyType: string
  companyName: string
  role: string
}

export function requirePortalAccess(
  session: { user?: { companyType?: string | null; companyId?: string | null } } | null
): { allowed: boolean; reason: string | null } {
  if (!session?.user) {
    return { allowed: false, reason: "Authentication required." }
  }
  const { companyType } = session.user
  if (isPortalUser(companyType)) {
    return { allowed: true, reason: null }
  }
  if (isSupplierUser(companyType)) {
    return { allowed: false, reason: "Supplier accounts cannot access the dealer portal." }
  }
  return { allowed: false, reason: "This portal is for dealer and distributor accounts only." }
}

export function requireOemLogisticAccess(
  session: { user?: { companyType?: string | null; companyId?: string | null; plan?: string | null } } | null
): { allowed: boolean; reason: string | null } {
  if (!session?.user) {
    return { allowed: false, reason: "Authentication required." }
  }
  const { companyType } = session.user
  if (isOemUser(companyType)) {
    return { allowed: true, reason: null }
  }
  if (isPortalUser(companyType)) {
    return { allowed: false, reason: "Dealer/distributor accounts cannot access internal logistic management." }
  }
  if (isSupplierUser(companyType)) {
    return { allowed: false, reason: "Supplier accounts cannot access PlantLogistic." }
  }
  return { allowed: false, reason: "Access denied." }
}

export function getPortalScopes(companyType: string, companyId: string): {
  dealerCompanyId?: string
  distributorCompanyId?: string
} {
  if (companyType === "DEALER") {
    return { dealerCompanyId: companyId }
  }
  if (companyType === "DISTRIBUTOR") {
    return { distributorCompanyId: companyId }
  }
  return {}
}