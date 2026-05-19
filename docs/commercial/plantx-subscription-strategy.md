# PlantX Subscription Strategy v3.3.1

> Last updated: 2026-05-19

## Current Implementation

### Two-Layer Access Model

PlantX uses a **two-layer access control** system:

1. **Module Entitlement** — Determines which product modules a company has access to.
   - `PLANT_QUALITY_MODULE` — AI-Powered 8D & Quality Management
   - `PLANT_LOGISTIC_MODULE` — Vehicle Order & Delivery Control Tower
   - Future modules: PlantDock, PlantQuote, PlantTrace, PlantAudit, PlantAsset, PlantFlow, PlantStaff

2. **Plan Tier** — Determines feature depth within each module.
   - `FREE` — Core features for adoption
   - `PRO` — Operational depth
   - `ENTERPRISE` — Intelligence & scale

### Module Entitlement Rules

| Rule | Description |
|------|-------------|
| PlantQuality is always active | Every company gets PlantQuality. `checkModuleAccess("PLANT_QUALITY_MODULE", ...)` always returns `true`. |
| PlantLogistic requires entitlement | `DEMO_MODULE_ENTITLEMENTS` determines which demo companies get PlantLogistic. Non-demo OEM companies default to both modules. |
| Suppliers never see PlantLogistic | Supplier users are restricted to `PLANT_QUALITY_MODULE` only. |
| AppSwitcher respects entitlements | Shows Active/Live/Locked/Soon based on module access and liveness. |

### Current Module Entitlement (Config-Based)

Module entitlements are currently controlled by `DEMO_MODULE_ENTITLEMENTS` in `src/lib/billing/features.ts`:

```typescript
const DEMO_MODULE_ENTITLEMENTS: Record<string, ModuleKey[]> = {
  "oem-free-company": ["PLANT_QUALITY_MODULE"],
  "oem-company": ["PLANT_QUALITY_MODULE", "PLANT_LOGISTIC_MODULE"],
  "oem-enterprise-company": ["PLANT_QUALITY_MODULE", "PLANT_LOGISTIC_MODULE"],
  "supplier-company": ["PLANT_QUALITY_MODULE"],
  "supplier-company-2": ["PLANT_QUALITY_MODULE"],
}
```

Unknown companies default to both modules. This is a **demo/config-based** approach — no database table or billing integration exists yet.

### AppSwitcher Badge Logic (v3.3.1)

| Badge | Meaning |
|-------|---------|
| **Active** | The module the user is currently in (matches `currentModule` prop) |
| **Live** | The module is a live product AND the user's company has entitlement for it. Clickable. |
| **Locked** | The module is a live product BUT the user's company does NOT have entitlement. Shows lock icon. Not clickable. |
| **Soon** | The module is not yet a live product (future module). Not clickable. |

**Critical rules:**
- PlantQuality and PlantLogistic are **never** shown as "Soon".
- PlantQuality is always shown as either "Active" or "Live" for OEM users.
- Supplier users never see PlantLogistic in the AppSwitcher.

### Plan & Usage (Platform-Level)

Plan & Usage is now a **platform-level** page at `/settings/plan`. It shows:
- Current plan (Free/Pro/Enterprise) with upgrade CTA
- **Module Access** card showing PlantQuality and PlantLogistic with Active/Locked status
- Usage metrics (defects, field defects, suppliers, etc.)
- Feature access grid
- Upgrade requests

This page is accessible from both PlantQuality and PlantLogistic via the sidebar "Plan & Usage" link, and redirects from the legacy `/oem/settings/plan` and `/quality/oem/settings/plan` routes.

---

## Short-Term Roadmap

### DB-Backed Company Module Subscription

Replace `DEMO_MODULE_ENTITLEMENTS` with a database table:

```prisma
model CompanyModuleSubscription {
  id        String   @id @default(cuid())
  companyId String
  moduleKey String   // PLANT_QUALITY_MODULE, PLANT_LOGISTIC_MODULE, etc.
  status    String   // ACTIVE, SUSPENDED, TRIAL, etc.
  planTier  String   // FREE, PRO, ENTERPRISE
  startedAt DateTime @default(now())
  expiresAt DateTime?
  company   Company  @relation(fields: [companyId], references: [id])

  @@unique([companyId, moduleKey])
}
```

### Admin UI for Module Assignment

- Admin panel to toggle module entitlements per company.
- Admin panel to change plan tier per module.
- Audit log for module assignment changes.

---

## Mid-Term Roadmap

### Upgrade Request Workflow

- Users request module addition or plan upgrade from Plan & Usage.
- Admin approves/rejects from admin panel.
- Notification to user on status change.
- Manual invoicing support for enterprise module additions.

### Per-Module Plan Tiers

- Currently, one `Company.plan` applies across all modules.
- Future: Each `CompanyModuleSubscription` can have its own `planTier`.
- PlantQuality FREE + PlantLogistic PRO should be supported.
- PlantQuality ENTERPRISE + PlantLogistic FREE should be supported.

---

## Long-Term Roadmap

### Billing Integration

- Stripe / iyzico integration for automated payments.
- Per-module pricing with seat limits.
- Trial periods (14-day or 30-day) for new modules.
- Self-service upgrade flow (no admin approval needed for standard tiers).

### Seat & User Licensing

- Per-seat pricing for PRO and ENTERPRISE.
- Seat limits enforced at the module level.
- User provisioning/deprovisioning tied to seat count.

### Advanced Features

- Cross-module data linking (PlantQuality defective parts → PlantLogistic orders affected).
- Unified analytics dashboard across modules.
- Module marketplace for third-party integrations.

---

## PlantX Module Persona Matrix

| Persona | PlantQuality | PlantLogistic | PlantDock | PlantQuote |
|---------|-------------|--------------|-----------|------------|
| OEM Admin | Full access | If entitled | Future | Future |
| OEM User | Plan-gated | If entitled | Future | Future |
| Supplier User | Supplier Portal only | **No access** | Future | Future |
| Dealer (future) | No access | Limited visibility | Future | Future |
| Distributor (future) | No access | Limited visibility | Future | Future |
| Carrier (future) | No access | Dispatch only | Future | Future |

### PlantQuality Supplier Portal

- Supplier users access PlantQuality through a dedicated supplier portal.
- They see assigned defects, field quality, PPAPs, IQC, FMEA (plan-gated).
- They do **not** see PlantLogistic, executive dashboards, or other OEM-only features.

### PlantLogistic External Persona Plans (Future)

| Persona | Access Level | v3.3.1 Status |
|---------|-------------|---------------|
| Dealer | Order tracking, delivery confirmation | Not implemented |
| Distributor | Order visibility, regional tracking | Not implemented |
| Customer | Limited delivery status view | Not implemented |
| Carrier / Logistics Partner | Dispatch updates, proof of delivery | Not implemented |

These external personas are deferred to v3.4.0 (Dealer/Distributor Portal) and later versions.

---

## Subscription Status Display

### Plan & Usage Module Access Card

The Plan & Usage page now shows a **Module Access** section with:

| Module | Status | Description |
|--------|--------|-------------|
| PlantQuality | Active (green badge) | AI-Powered 8D & Quality Management |
| PlantLogistic | Active/Locked | Vehicle Order & Delivery Control Tower |

- **Active**: Company has entitlement. Shown with emerald badge.
- **Locked**: Company does not have entitlement. Shown with lock icon + muted badge.
- A note below: "Module access is based on your subscription. Contact sales to add modules."

### Important Constraints

- **No fake billing UI**: The Plan & Usage page does NOT simulate payment processing.
- **No "Purchase" buttons**: Upgrade requests go through an admin approval flow, not automated billing.
- **Clear labeling**: The page is clearly labeled as "Plan & Usage" with subtitle "Manage your subscription, modules, and usage for [company]".
- **Billing integration note**: A callout should mention that module additions currently require contacting sales, with billing integration coming in a future update.

---

## Deferred Items (Not in v3.3.1)

- Stripe / iyzico billing integration
- `CompanyModuleSubscription` database table
- Admin module assignment UI
- Dealer / Distributor Portal
- Carrier Portal
- Per-module plan tier differentiation
- Trial period management
- Seat-based licensing
- Self-service upgrade flow