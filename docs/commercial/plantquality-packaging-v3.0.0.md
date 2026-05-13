# PlantQuality Packaging — v3.0.0

**Release:** PlantX v3.0.0
**Last Updated:** 2026-05-12

---

## Tier Overview

| Tier | Target | Positioning |
|------|--------|-------------|
| **Free** | Small OEMs starting quality management | Core defect and field quality workflows at no cost |
| **Pro** | Growing OEMs needing structured quality processes | Full quality toolkit — PPAP, IQC, FMEA, Intelligence, AI Classification |
| **Enterprise** | Large OEMs managing supplier ecosystems | Complete platform — Cockpit, Scorecard, Development, AI Review, API |

---

## Feature Matrix

| Feature | Route / Context | Free | Pro | Enterprise |
|---------|----------------|------|-----|------------|
| **Core Quality** | | | | |
| Defects / 8D | `/quality/oem/defects` | Yes | Yes | Yes |
| Field Quality | `/quality/oem/field` | Yes | Yes | Yes |
| Supplier Portal | `/quality/supplier/*` | Yes | Yes | Yes |
| Notifications | Bell icon | Yes | Yes | Yes |
| **Pro Modules** | | | | |
| PPAP | `/quality/oem/ppap` | Upgrade CTA | Yes | Yes |
| IQC | `/quality/oem/iqc` | Upgrade CTA | Yes | Yes |
| FMEA | `/quality/oem/fmea` | Upgrade CTA | Yes | Yes |
| Escalation | `/quality/oem/escalations` | Upgrade CTA | Yes | Yes |
| War Room | `/quality/oem/war-room` | Upgrade CTA | Yes | Yes |
| **Pro Intelligence & AI** | | | | |
| Quality Intelligence | `/quality/oem/quality-intelligence` | Upgrade CTA | Yes | Yes |
| Quality Linkage | Defect detail panel | Upgrade CTA | Yes | Yes |
| Similar Issues | 8D panel | — | Yes | Yes |
| AI Classification | Field defect | — | Yes | Yes |
| Category Intelligence | Field defect | — | Yes | Yes |
| **Enterprise Cockpit & Scoring** | | | | |
| Executive Cockpit | `/quality/oem/executive` | Upgrade CTA | Upgrade CTA | Yes |
| Supplier Scorecard | `/quality/oem/scorecard` | Upgrade CTA | Upgrade CTA | Yes |
| Supplier Development | `/quality/oem/supplier-development` | Upgrade CTA | Upgrade CTA | Yes |
| **Enterprise AI** | | | | |
| AI 8D Review | 8D panel | — | — | Yes |
| Root Cause Suggestion | 8D panel | — | — | Yes |
| **Enterprise Platform** | | | | |
| API Access | — | — | — | Planned |
| Webhooks | — | — | — | Planned |
| SSO / SAML | — | — | — | Planned |
| Multi-Plant | — | — | — | Planned |
| Advanced Audit Log | — | — | — | Planned |
| Email Notifications | — | — | — | Planned |

**Note:** Features marked "Planned" have feature gates defined but are not yet implemented. They appear as locked in the UI and are reserved for future Enterprise releases.

---

## Supplier Access Rules

Supplier users can access assigned modules regardless of their company's plan tier. The supplier experience is always determined by what the OEM has assigned:

| Module | Supplier Access | Scope |
|--------|----------------|-------|
| Defects / 8D | Yes | Only assigned defects |
| PPAP | Yes (if `supplierAccess: true` in feature gate) | Only assigned PPAPs |
| IQC | Yes (if `supplierAccess: true` in feature gate) | Only assigned IQC reports |
| FMEA | Yes (if `supplierAccess: true` in feature gate) | Only assigned FMEAs |
| Development Plans | Yes (if `supplierAccess: true` in feature gate) | Only assigned plans |
| Intelligence, Cockpit, Scorecard | No | OEM-only |

Supplier access is tenant-scoped: suppliers can never see data from other suppliers or other OEMs.

---

## Plan Limits

| Resource | Free | Pro | Enterprise |
|----------|------|-----|------------|
| Monthly Defects | 25 | Unlimited | Unlimited |
| Monthly Field Defects | 10 | Unlimited | Unlimited |
| Suppliers | 3 | 25 | Unlimited |
| Users | 3 | 30 | Unlimited |
| Storage (MB) | 1,024 | 204,800 | Unlimited |
| AI Classification Runs | 0 | 2,000 | Unlimited |
| AI 8D Review Runs | 0 | 0 | Unlimited |
| Similar Issue Searches | 0 | 2,500 | Unlimited |
| War Room Items | 0 | 50 | Unlimited |
| PPAP Packages | 0 | 25 | Unlimited |
| IQC Inspections | 0 | Unlimited | Unlimited |
| FMEA Records | 0 | 50 | Unlimited |

---

## Packaging Rules

1. **AI features are never Free.** AI Classification and Similar Issues require Pro. AI 8D Review and Root Cause Suggestion require Enterprise.
2. **Executive Cockpit, Supplier Scorecard, and Supplier Development are Enterprise-only.** These are leadership and strategic features above the Pro tier.
3. **Supplier participant access is plan-independent.** Suppliers can respond to assigned 8D, PPAP, IQC, FMEA, and development plan items regardless of the supplier company's plan.
4. **Upgrade CTA links to `/oem/settings/plan`.** The in-app upgrade flow uses an "Upgrade Request" dialog that collects user input and creates a notification for the system.
5. **No real billing integration exists yet.** Plan assignment is database-driven. No Stripe, Paddle, or payment gateway is integrated.
6. **Feature gate enforcement is server-side.** Both page-level and server-action-level `requireFeature()` checks exist for every gated module. Direct URL access does not bypass gating.
7. **Limits are tracked but not yet enforced.** Usage counters exist but hard blocking is not implemented in v3.0.0. This is deferred.

---

## Upgrade Flow

- **Free → Pro:** User sees upgrade CTA on Pro features (PPAP, IQC, FMEA, Intelligence, etc.). Clicking opens `UpgradeRequestDialog` which sends a notification to the system team.
- **Pro → Enterprise:** User sees upgrade CTA on Enterprise features (Cockpit, Scorecard, Development). Same dialog flow.
- **Supplier → no upgrade path:** Supplier users manage their portal access based on what OEMs assign to them. They do not see upgrade CTAs.

---

## Alignment with Code

This packaging document is aligned with the feature gates defined in:
- `src/lib/billing/features.ts` — Feature key to minPlan mapping
- `src/lib/billing/plans.ts` — Plan definitions, limits, and pricing metadata
- `src/app/(dashboard)/layout.tsx` — Sidebar nav items with `gate` property
- `src/lib/billing/feature-gate.tsx` — `requireFeature()` and `checkFeatureAccess()` implementations

Any changes to the feature matrix must be reflected in `features.ts` and `plans.ts`.