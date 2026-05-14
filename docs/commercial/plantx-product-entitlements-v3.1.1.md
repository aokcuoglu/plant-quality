# PlantX Product Entitlements — v3.1.1

**Release:** PlantX v3.1.1
**Last Updated:** 2026-05-14

---

## 1. PlantX Platform Packaging Strategy

PlantX is **one platform** with multiple independently purchasable modules. This is not a single monolithic product — it is a modular platform where each module addresses a distinct domain of manufacturing operations.

**Current modules:**

| Module Key | Product Name | Description |
|------------|-------------|-------------|
| `PLANT_QUALITY_MODULE` | PlantQuality | AI-Powered 8D & Quality Management |
| `PLANT_LOGISTIC_MODULE` | PlantLogistic | Vehicle Order & Delivery Control Tower |

**Key packaging principles:**

- PlantQuality and PlantLogistic are **separate modules** that can be purchased independently or together.
- A company may subscribe to only PlantQuality, only PlantLogistic, or both.
- **PlantX Suite** customers receive all modules at the ENTERPRISE tier.
- New modules in the future (e.g., PlantMaintenance, PlantProduction) will follow the same pattern — independently purchasable, with their own tier progression.

The platform exposes an **AppSwitcher** that shows only the modules a company is entitled to. Users never see navigation entries, routes, or features for modules they have not purchased.

---

## 2. Product Entitlement vs. Plan Tier

There are **two independent dimensions** that control what a user can access:

### 2.1 Product/Module Entitlement

A **module entitlement** determines which modules a company owns. It answers the question: *"Which products does this company have?"*

| Module Key | Label | Supplier Access |
|------------|-------|----------------|
| `PLANT_QUALITY_MODULE` | PlantQuality | Yes |
| `PLANT_LOGISTIC_MODULE` | PlantLogistic | No |

- Entitlements are stored per company, not per user.
- A company without a given module entitlement will never see that module in the UI.
- Entitlements are currently handled via `DEMO_MODULE_ENTITLEMENTS` in `features.ts` (see [Section 8](#8-current-implementation-limitations)).

### 2.2 Plan Tier

A **plan tier** determines the feature level **within** a module. It answers the question: *"How advanced are the features this company can use?"*

| Tier | Target | Positioning |
|------|--------|-------------|
| **FREE** | Small OEMs starting quality management | Core workflows at no cost |
| **PRO** | Growing OEMs needing structured processes | Full toolkit including AI classification, PPAP, IQC |
| **ENTERPRISE** | Large OEMs managing supplier ecosystems | Complete platform — Cockpit, Scorecard, AI Review, SSO |

### 2.3 Independence of the Two Dimensions

Module entitlement and plan tier are **orthogonal**. A company's tier applies per module, enabling combinations like:

| Company | PlantQuality | PlantLogistic |
|---------|-------------|---------------|
| Company A | PRO | — (not entitled) |
| Company B | — (not entitled) | ENTERPRISE |
| Company C | PRO | PRO |
| PlantX Suite | ENTERPRISE | ENTERPRISE (+ all future modules) |

> **Important:** In the current (v3.1.1) implementation, `Company.plan` is a single field shared across all modules. Per-module tier differentiation is planned for v3.2.0 (see [Section 8](#8-current-implementation-limitations)). When a company has both modules, the same `plan` value applies to both.

---

## 3. Example Scenarios

### Scenario 1: PlantQuality only (PRO)

- Company A has entitlement `PLANT_QUALITY_MODULE` and `plan = PRO`.
- AppSwitcher shows **only PlantQuality**.
- Users see all PRO features within PlantQuality (PPAP, IQC, FMEA, AI Classification, etc.).
- No PlantLogistic navigation or routes are visible.

### Scenario 2: PlantLogistic only (ENTERPRISE)

- Company B has entitlement `PLANT_LOGISTIC_MODULE` and `plan = ENTERPRISE`.
- AppSwitcher shows **only PlantLogistic**.
- Users see the full PlantLogistic feature set.
- No PlantQuality navigation or routes are visible.

### Scenario 3: Both modules (PRO)

- Company C has entitlements `PLANT_QUALITY_MODULE` + `PLANT_LOGISTIC_MODULE` and `plan = PRO`.
- AppSwitcher shows **both modules**.
- Users can switch between PlantQuality and PlantLogistic.
- PRO-tier features are available in both modules.

### Scenario 4: Supplier user

- Supplier companies always get `PLANT_QUALITY_MODULE` — they participate in OEM-initiated 8D workflows, PPAPs, IQCs, etc.
- Suppliers **never** get `PLANT_LOGISTIC_MODULE`.
- Supplier access within PlantQuality is limited to records explicitly assigned by the OEM (multi-tenant scoping).
- Suppliers never see upgrade CTAs or module selection.

### Scenario 5: PlantX Suite

- Suite customers receive **all current and future modules** at **ENTERPRISE** tier.
- AppSwitcher shows every available module.
- All features are unlocked across all modules.

---

## 4. Free/Pro/Enterprise Tier Logic within Modules

### 4.1 PlantQuality Tier Breakdown

| Category | Free | Pro | Enterprise |
|----------|------|-----|------------|
| **Core** | | | |
| Defects / 8D | Yes | Yes | Yes |
| Field Quality | Yes | Yes | Yes |
| Supplier Portal | Yes | Yes | Yes |
| Notifications | Yes | Yes | Yes |
| **Pro Modules** | | | |
| PPAP | — | Yes | Yes |
| IQC | — | Yes | Yes |
| FMEA | — | Yes | Yes |
| Escalation | — | Yes | Yes |
| War Room | — | Yes | Yes |
| **Pro Intelligence & AI** | | | |
| Quality Intelligence | — | Yes | Yes |
| Quality Linkage | — | Yes | Yes |
| Similar Issues | — | Yes | Yes |
| AI Classification | — | Yes | Yes |
| Category Intelligence | — | Yes | Yes |
| **Enterprise Cockpit & Scoring** | | | |
| Executive Cockpit | — | — | Yes |
| Supplier Scorecard | — | — | Yes |
| Supplier Development | — | — | Yes |
| **Enterprise AI** | | | |
| AI 8D Review | — | — | Yes |
| Root Cause Suggestion | — | — | Yes |
| **Enterprise Platform** | | | |
| API Access | — | — | Planned |
| Webhooks | — | — | Planned |
| SSO / SAML | — | — | Planned |
| Multi-Plant | — | — | Planned |
| Advanced Audit Log | — | — | Planned |
| Email Notifications | — | — | Planned |

### 4.2 PlantLogistic Tier Breakdown

| Category | Free | Pro | Enterprise |
|----------|------|-----|------------|
| Vehicle Order Tracking | Yes | Yes | Yes |
| Production Planning | — | Yes | Yes |
| Delivery Control Tower | — | Yes | Yes |
| Advanced Analytics | — | — | Yes |
| AI Dispatch Optimization | — | — | Yes |

> PlantLogistic tier details are preliminary and will be refined as the module matures.

---

## 5. Supplier Participant Access

Suppliers are **participants**, not customers. Their access model is fundamentally different from OEMs:

| Rule | Detail |
|------|--------|
| Supplier always gets PlantQuality | Suppliers participate in OEM-initiated 8D, PPAP, IQC, FMEA, and Development workflows. |
| Supplier never gets PlantLogistic | Logistics is an OEM-side control tower. Suppliers do not manage vehicle orders or deliveries. |
| Scope is limited to assigned records | Suppliers can only view and respond to defects, PPAPs, IQCs, etc., that the OEM has explicitly assigned to them. Multi-tenant scoping is enforced at the database layer (`companyId`). |
| No upgrade path | Suppliers do not see upgrade CTAs. Their experience is determined by the OEM's plan and feature assignments. |
| No cross-tenant visibility | A supplier working with OEM-A can never see data from OEM-B or from another supplier. |

Implementation notes:
- `checkModuleAccess("PLANT_LOGISTIC_MODULE", companyId, "SUPPLIER")` always returns `false` (see `features.ts:340`).
- `getCompanyModules(companyId, "SUPPLIER")` always returns `["PLANT_QUALITY_MODULE"]` (see `features.ts:331-332`).
- Feature gates with `supplierAccess: false` block supplier access regardless of plan tier.

---

## 6. AI Features Should Not Be Free

AI features incur per-use costs (LLM inference, embedding computation, etc.) and deliver significant operational value. They are never available on the FREE tier.

| AI Feature | Min Tier | Module | Supplier Access |
|-----------|---------|--------|----------------|
| AI Classification | PRO | PlantQuality | No |
| Similar Issues | PRO | PlantQuality | No |
| Category Intelligence | PRO | PlantQuality | No |
| AI 8D Review | ENTERPRISE | PlantQuality | No |
| Root Cause Suggestion | ENTERPRISE | PlantQuality | No |
| Quality Intelligence | PRO | PlantQuality | No |

**Rationale for tier placement:**

- **PRO-tier AI features** (Classification, Similar Issues, Category Intelligence, Quality Intelligence): These assist day-to-day quality work and justify the PRO upgrade.
- **ENTERPRISE-tier AI features** (AI 8D Review, Root Cause Suggestion): These provide expert-level analysis and are positioned as strategic differentiators for the ENTERPRISE tier.

This separation ensures:
1. FREE users see upgrade CTAs when encountering AI-powered features.
2. PRO users get meaningful AI value (classification, similar issues) while still having an upgrade path to ENTERPRISE (8D review, root cause).
3. AI cost is always covered by a paying tier.

---

## 7. Future Stripe/Billing Integration

The current module entitlement system is designed for future integration with Stripe. The data model is intentionally simple to allow a clean mapping from Stripe subscriptions.

### 7.1 Planned Schema: `CompanyModule` Table

```prisma
model CompanyModule {
  id          String   @id @default(cuid())
  companyId   String   @map("company_id")
  moduleKey   String   @map("module_key")   // "PLANT_QUALITY_MODULE" | "PLANT_LOGISTIC_MODULE" | ...
  tier        String   // "FREE" | "PRO" | "ENTERPRISE"
  activatedAt DateTime @map("activated_at") @default(now())
  expiresAt   DateTime? @map("expires_at")
  stripePriceId String? @map("stripe_price_id")
  stripeSubscriptionId String? @map("stripe_subscription_id")

  company Company @relation(fields: [companyId], references: [id])

  @@unique([companyId, moduleKey])
  @@map("company_modules")
}
```

### 7.2 Stripe Product Mapping

| Stripe Product | Module | Tier | Description |
|---------------|--------|------|-------------|
| `plant_quality_free` | PLANT_QUALITY_MODULE | FREE | PlantQuality Free |
| `plant_quality_pro` | PLANT_QUALITY_MODULE | PRO | PlantQuality Pro |
| `plant_quality_enterprise` | PLANT_QUALITY_MODULE | ENTERPRISE | PlantQuality Enterprise |
| `plant_logistic_free` | PLANT_LOGISTIC_MODULE | FREE | PlantLogistic Free |
| `plant_logistic_pro` | PLANT_LOGISTIC_MODULE | PRO | PlantLogistic Pro |
| `plant_logistic_enterprise` | PLANT_LOGISTIC_MODULE | ENTERPRISE | PlantLogistic Enterprise |
| `plantx_suite` | All modules | ENTERPRISE | PlantX Suite (all modules, ENTERPRISE tier) |

Each Stripe product maps to a `moduleKey` + `tier` combination. The `plantx_suite` product creates entries for **all** current and future modules at ENTERPRISE tier.

### 7.3 Provisioning Flow

1. Customer purchases a Stripe product (self-serve or sales-assisted).
2. Stripe webhook fires (`customer.subscription.created` or `customer.subscription.updated`).
3. Webhook handler upserts `CompanyModule` row(s) with `companyId`, `moduleKey`, `tier`, `activatedAt`, `expiresAt`.
4. On downgrade or cancellation (`customer.subscription.deleted`), the row is updated: `tier` is lowered or `expiresAt` is set.
5. Application reads `CompanyModule` rows at runtime to determine module access and feature tier.
6. Session JWT is enriched with the company's module entitlements and per-module tiers.

### 7.4 Migration Path (v3.2.0)

When the `CompanyModule` table is introduced:

1. Create the `company_modules` table and migrate existing `Company.plan` data into rows:
   - Every company gets a `PLANT_QUALITY_MODULE` row with their current `plan` tier.
   - Companies currently accessing PlantLogistic get a `PLANT_LOGISTIC_MODULE` row.
2. Replace `DEMO_MODULE_ENTITLEMENTS` lookups with `CompanyModule` database queries.
3. Replace `Company.plan` reads with per-module tier lookups from `CompanyModule.tier`.
4. Deprecate the `plan` field on `Company` in favor of the normalized `CompanyModule` structure.
5. Add admin UI for managing module entitlements (currently manual/database-only).

---

## 8. Current Implementation Limitations

Version 3.1.1 uses a **config-based** entitlement system. This is intentional for the current demo/early-access phase and is designed to be replaced.

### 8.1 What Exists Now

| Component | Location | Behavior |
|-----------|----------|----------|
| Module entitlement config | `src/lib/billing/features.ts:322-328` | `DEMO_MODULE_ENTITLEMENTS` hardcodes which companies get which modules |
| Module access check | `src/lib/billing/features.ts:339-346` | `checkModuleAccess()` uses demo config + supplier fallback |
| Module entitlement metadata | `src/lib/billing/features.ts:44-58` | `MODULE_ENTITLEMENTS` defines labels, descriptions, and `supplierAccess` |
| Plan tier | `Company.plan` field | Single field — same tier applies to all modules |
| Feature gates | `src/lib/billing/features.ts:80-305` | `FEATURE_GATES` maps every feature to `minPlan`, `supplierAccess`, and `module` |
| Guard functions | `src/lib/billing/guards.ts` | `requireModule()` and `requireFeature()` for server-side enforcement |
| Nav gating | `src/lib/billing/guards.ts:57-73` | `isFeatureGatedNav()` controls sidebar visibility |
| Proxy routing | `src/proxy.ts:48,75` | Module check before routing to PlantLogistic |

### 8.2 Known Limitations

1. **Module entitlements are config-based, not DB-backed.** `DEMO_MODULE_ENTITLEMENTS` is a hardcoded map of company IDs to module keys. Adding a new company requires a code change.
2. **Plan tier is a single field.** `Company.plan` applies to all modules equally. A company cannot have PlantQuality PRO and PlantLogistic FREE simultaneously (both will be PRO).
3. **No admin UI for managing module entitlements.** Changes require editing `features.ts` and redeploying.
4. **No Stripe integration.** There is no billing webhook, no subscription management, and no self-serve purchase flow.
5. **Default fallback grants all modules.** If a company ID is not found in `DEMO_MODULE_ENTITLEMENTS`, `getCompanyModules()` returns both modules (see `features.ts:336`). This is intentional for demo convenience but must be replaced with an explicit opt-in model for production.
6. **Supplier entitlement is implicit.** Suppliers always get `PLANT_QUALITY_MODULE` and never get `PLANT_LOGISTIC_MODULE`, enforced by `companyType` checks rather than a database row.

### 8.3 Access Check Flow (v3.1.1)

```
User request
  │
  ├─ AppSwitcher rendering
  │   └─ getCompanyModules(companyId, companyType)
  │       └─ DEMO_MODULE_ENTITLEMENTS[companyId] or supplier fallback
  │
  ├─ Server Action / API route
  │   └─ requireModule(session, "PLANT_LOGISTIC_MODULE")
  │       └─ checkModuleAccess(moduleKey, companyId, companyType)
  │
  ├─ Feature gate check
  │   └─ checkFeatureAccess(plan, companyType, featureKey, companyId)
  │       ├─ Is module entitled? → checkModuleAccess()
  │       ├─ Is supplier restricted? → gate.supplierAccess
  │       └─ Is plan sufficient? → isPlanAtLeast(plan, gate.minPlan)
  │
  └─ Sidebar navigation
      └─ isFeatureGatedNav(href) → FEATURE_GATES key
```

### 8.4 Planned Changes (v3.2.0)

| Change | Description |
|--------|-------------|
| `CompanyModule` database table | Replace `DEMO_MODULE_ENTITLEMENTS` with a proper DB-backed table |
| Per-module tiers | Allow different tiers per module (e.g., PlantQuality PRO + PlantLogistic FREE) |
| Stripe webhook handler | Automatically provision/de-provision module entitlements on subscription events |
| Admin UI | Manage module entitlements from the settings page |
| Module access from session | Enrich JWT session with module entitlements to avoid DB lookups on every request |
| Remove `DEMO_MODULE_ENTITLEMENTS` | Delete the hardcoded config map entirely |
| Deprecate `Company.plan` | Replace with per-module `CompanyModule.tier` |

---

## Alignment with Code

This document is aligned with the following source files:

| File | Purpose |
|------|---------|
| `src/lib/billing/features.ts` | Module entitlement definitions, feature gates, `DEMO_MODULE_ENTITLEMENTS`, `checkModuleAccess()` |
| `src/lib/billing/plans.ts` | Plan tier definitions, limit tables, `isPlanAtLeast()`, `isSupplierPlan()` |
| `src/lib/billing/guards.ts` | `requireModule()`, `requireFeature()`, `isFeatureGatedNav()`, `isEnterpriseOnlyNav()` |
| `src/proxy.ts` | Module access checks before routing to PlantLogistic |
| `src/app/(dashboard)/layout.tsx` | Sidebar navigation with `gate` property for feature gating |
| `src/app/(dashboard)/logistic/actions.ts` | `requireModule(session, "PLANT_LOGISTIC_MODULE")` on every server action |

Any changes to the module entitlement structure must be reflected in `features.ts`, `guards.ts`, and this document.