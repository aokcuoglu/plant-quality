# PlantX Subscription Strategy v3.5.0

> Last updated: 2026-05-21

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
| Dealers/Distributors are participants | Dealer and distributor companies have no module subscriptions. Their access to PlantLogistic is through the external portal, controlled by order-level visibility assignments (`externalVisible`, `dealerCompanyId`, `distributorCompanyId`). |
| AppSwitcher respects entitlements | Shows Active/Live/Locked/Soon based on module access and liveness. Dealers/Distributors see only PlantLogistic portal; Suppliers see only PlantQuality. |

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

### AppSwitcher Badge Logic (v3.3.2)

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

### Plan & Usage — Module-Context-Aware (v3.3.2)

Plan & Usage preserves the **module shell context** of the user's current location:

- **From PlantQuality**: `/settings/plan` — shows PlantQuality sidebar/header
- **From PlantLogistic**: `/logistic/settings/plan` — shows PlantLogistic sidebar/header

Both routes render the **same platform-level content** (current plan, module access, usage, features, upgrade requests) via the shared `PlanAndUsageContent` server component, but each route stays within its layout context so the sidebar and header reflect the correct module.

**Legacy redirects preserved:**
- `/oem/settings/plan` → `/settings/plan`
- `/quality/oem/settings/plan` → `/settings/plan`

**Sidebar behavior:**
- In PlantQuality context, the "Plan & Usage" link points to `/settings/plan`
- In PlantLogistic context, the "Plan & Usage" link points to `/logistic/settings/plan`

### Available PlantX Modules Section (v3.3.2)

The Plan & Usage page now includes a **Module Catalog** section organized into three groups:

| Group | Status | Behavior |
|-------|--------|----------|
| **Active — Included in your plan** | Module is live and company has entitlement | Shows "Active" or "Live" badge with module description |
| **Locked — Request access** | Module is live but company does NOT have entitlement | Shows "Locked" badge + "Request access" CTA button |
| **Coming soon** | Module is not yet a live product | Shows "Soon" badge, no action available |

**Module Catalog entries:**

| Module | Status | Supplier Visible |
|--------|--------|-----------------|
| PlantQuality | Live | Yes |
| PlantLogistic | Live | No |
| PlantDock | Soon | No |
| PlantQuote | Soon | No |
| PlantTrace | Soon | No |
| PlantAudit | Soon | No |
| PlantAsset | Soon | No |
| PlantFlow | Soon | No |
| PlantStaff | Soon | No |

### Module Purchase / Request Access Flow (v3.3.2)

**Current state: Sales-led Request Access**

- Online billing is **not enabled yet**. The Plan & Usage page clearly labels this.
- "Request access" sends a request to the PlantX team / workspace admin.
- Module access requests use the existing `UpgradeRequest` model with `sourceFeature` set to `MODULE_ACCESS:{moduleKey}`.
- This does **not** require a database schema change — it reuses the existing `UpgradeRequest` table with a convention for `sourceFeature`.
- Commercial activation is handled manually for now.
- Fake purchase success is **never** shown.

**Request Access CTA behavior:**

- Locked modules show a "Request access" button
- Clicking opens a small form with optional message textarea
- Submitting creates an `UpgradeRequest` with `sourceFeature: "MODULE_ACCESS:PLANT_LOGISTIC_MODULE"`
- If an open request already exists for that module, a "Request already exists" message is shown
- The page header states: "Online billing is not enabled yet"

**Supplier behavior:**
- Supplier users cannot access Plan & Usage (redirected to `/login`)
- Supplier users never see PlantLogistic or locked module purchase CTAs

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
| Dealer | No access | Portal (limited visibility) | Future | Future |
| Distributor | No access | Portal (limited visibility) | Future | Future |
| Carrier (future) | No access | Dispatch only | Future | Future |

### PlantQuality Supplier Portal

- Supplier users access PlantQuality through a dedicated supplier portal.
- They see assigned defects, field quality, PPAPs, IQC, FMEA (plan-gated).
- They do **not** see PlantLogistic, executive dashboards, or other OEM-only features.

### PlantLogistic External Persona Access (v3.4.0+)

| Persona | Access Level | v3.4.0 Status |
|---------|-------------|---------------|
| Dealer | Portal: order tracking, delivery status, ETA, safe delay visibility | **Implemented** |
| Distributor | Portal: order visibility, regional tracking, safe delay visibility | **Implemented** |
| Customer | Limited delivery status view | Not implemented |
| Carrier / Logistics Partner | Dispatch updates, proof of delivery | Not implemented |

**Dealer/Distributor Portal Access Model:**
- Dealer and distributor users are **external participants**, not module subscribers.
- Their access is controlled by order-level visibility assignments (`externalVisible`, `dealerCompanyId`, `distributorCompanyId`).
- OEM company owns the PlantLogistic module subscription.
- Dealer/distributor users see only orders explicitly assigned to their company via the dealer/distributor company relation.
- Access is read-only; they cannot create orders, change status, or modify internal data.
- Sensitive internal data (VIN, chassis, production details, quality hold root cause, internal notes) is masked from portal view.

---

## Subscription Status Display

### Plan & Usage Module Access Card

The Plan & Usage page shows a **Module Access** section with:

| Module | Status | Description |
|--------|--------|-------------|
| PlantQuality | Active (green badge) | AI-Powered 8D & Quality Management |
| PlantLogistic | Active/Locked | Vehicle Order & Delivery Control Tower |

- **Active**: Company has entitlement. Shown with emerald badge.
- **Locked**: Company does not have entitlement. Shown with lock icon + muted badge.
- A note below: "Module access is based on your subscription. Contact sales to add modules."

### Available PlantX Modules Section

Shows all current and future modules organized by status:
- **Active — Included in your plan**: Modules the company can access
- **Locked — Request access**: Live modules the company hasn't purchased yet, with "Request access" CTA
- **Coming soon**: Future modules not yet available

### Important Constraints

- **No fake billing UI**: The Plan & Usage page does NOT simulate payment processing.
- **No "Purchase" buttons**: Module access requests go through the existing UpgradeRequest flow, not automated billing.
- **Clear labeling**: The page clearly states "Online billing is not enabled yet" in the Module Catalog header.
- **Request access is honest**: Submitting a request shows "Request submitted" or "Request already exists" — never a fake "Purchase successful" message.
- **Billing integration note**: A callout mentions that module additions currently require contacting sales, with billing integration coming in a future update.

---

## v3.3.2 Changes

- Plan & Usage now preserves module shell context via dual routes (`/settings/plan` and `/logistic/settings/plan`).
- Plan & Usage includes a full Module Catalog showing Live/Locked/Soon modules.
- Locked modules show "Request access" CTA that creates a `MODULE_ACCESS:{moduleKey}` upgrade request.
- PlantLogistic Plan & Usage no longer falls into PlantQuality sidebar.
- Hardcoded `/oem/settings/plan` links updated to `/settings/plan`.
- `MODULE_CATALOG` and `getModuleStatus` added to `features.ts` for future module listings.
- `createModuleAccessRequest` server action added for module-specific access requests.

---

## Deferred Items (Not in v3.3.2)

- Stripe / iyzico billing integration
- `CompanyModuleSubscription` database table
- Admin module assignment UI
- Dealer / Distributor Portal
- Carrier Portal
- Per-module plan tier differentiation
- Trial period management
- Seat-based licensing
- Self-service upgrade flow