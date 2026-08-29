# PlantX — Agent Coding Guide & Roadmap

> **Last updated:** 2026-05-25  
> **Current version:** 3.7.0  
> **Stack:** Next.js 16 (App Router), TypeScript strict, Tailwind CSS, shadcn/ui, Prisma 7, PostgreSQL, Auth.js v5, Cloudflare R2

---

## 1. How to Read This Document

This file is the **single source of truth** for any AI coding agent (opencode, Cursor, etc.) to:
1. Understand where the project stands in its roadmap
2. Know what has been implemented and what's next
3. Follow coding conventions, patterns, and design system rules
4. Understand the multi-agent workflow (main / review / git-release)

**Always read this file first** before making any code changes.

---

## 2. Project Overview

**PlantX** is a multi-module B2B SaaS platform for heavy commercial vehicle OEMs and their suppliers. Two live modules exist:

| Module | Purpose | Status |
|--------|---------|--------|
| **PlantQuality** | Supplier Quality Management (8D, PPAP, IQC, FMEA, scorecard, escalation, AI) | v2.0+ (mature) |
| **PlantLogistic** | Vehicle Order & Delivery Control Tower (orders, milestones, yard, dispatch, dealer portal, SLA) | v3.1–3.5.1 |

**Company types:** OEM, SUPPLIER, DEALER, DISTRIBUTOR  
**Subscription tiers:** FREE, PRO, ENTERPRISE  
**Module entitlements:** PLANT_QUALITY_MODULE, PLANT_LOGISTIC_MODULE (independent of plan tier)

---

## 3. Architecture & Key Patterns

### 3.1 Auth & Multi-Tenancy
- JWT-only sessions (Auth.js v5) with enriched claims: `id`, `role`, `plan`, `companyId`, `companyName`, `companyType`
- **Every** Prisma query MUST include `companyId` (or `oemId`/`supplierId` derived from session)
- Client-provided companyId NEVER trusted — always sourced from `session.user.companyId`
- Server Actions verify `role` and `companyType` before mutations

### 3.2 Server vs. Client Boundaries
- Server Components by default. `'use client'` only for interactivity.
- `"use server"` files do NOT import client-only modules (React hooks, browser APIs).
- Data fetching in Server Components via Prisma. Mutations via Server Actions.

### 3.3 JSONB Fields
- 8D report: `team` → `d1_team`, `containmentActions` → `d3_containment`, etc.
- **In Prisma queries, use Prisma field names** (e.g., `team`, not `d1_team`). `@map` handles DB column mapping.
- JSON shapes documented in `src/app/(dashboard)/supplier/defects/actions/8d.ts`

### 3.4 Design System (CRITICAL)
- **ALL** colors must use semantic tokens: `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-card`, `bg-muted`, `bg-popover`, `border-border`, etc.
- **NEVER** use hardcoded hex colors (`bg-[#0a0c10]`) or `text-slate-*` / `bg-slate-*`
- Brand accent: `text-emerald-400`, `bg-emerald-500`, `bg-emerald-500/10`
- Tooltips/popovers: `bg-popover text-popover-foreground`
- Full design system reference in `AGENTS.md`

### 3.5 Feature Gating
- Two-layer: Module Entitlement (PLANT_QUALITY_MODULE, PLANT_LOGISTIC_MODULE) × Plan Tier (FREE, PRO, ENTERPRISE)
- AI features gated by PRO/ENTERPRISE plan
- Feature checks: `requireFeature(session, "FEATURE_KEY")` and `requireModule(session, "MODULE_KEY")`

### 3.6 Docker Development
```bash
docker-compose up -d --build app   # Rebuild after ANY code change
docker-compose logs -f app          # Tail logs
docker-compose down -v              # Reset everything
```
- App runs in **production mode** inside Docker — hot-reload NOT available
- `.env.docker` is Docker-only (never commit!)

---

## 4. Directory Structure (Key Files)

| File / Directory | Purpose |
|-----------------|---------|
| `prisma/schema.prisma` | Full DB schema with enums, JSONB, @map |
| `src/lib/auth.ts` | Auth.js config (JWT, magic link, token enrichment) |
| `src/lib/prisma.ts` | Prisma client singleton |
| `src/lib/billing/features.ts` | Feature gates, module entitlements |
| `src/lib/billing/guards.ts` | `requireFeature()`, `requireModule()` |
| `src/lib/event-labels.ts` | Event type → label, icon, color mapping (58 types) |
| `src/lib/sla.ts` | Defect SLA helpers |
| `src/lib/sla-field-defect.ts` | Field defect SLA helpers |
| `src/lib/evidence.ts` | Evidence upload constants & validation |
| `src/lib/evidence-server.ts` | Evidence DB helpers |
| `src/lib/escalation.ts` | Escalation level labels & colors |
| `src/components/AuditTimeline.tsx` | **NEW** — Unified audit trail component |
| `src/components/defects/DefectTimeline.tsx` | Backward-compat wrapper → AuditTimeline |
| `src/components/defects/EightDWizardForm.tsx` | 6-step 8D wizard |
| `src/components/defects/UserSearchSelect.tsx` | Portal-based user search dropdown |
| `src/app/(dashboard)/quality/oem/` | OEM quality pages |
| `src/app/(dashboard)/quality/supplier/` | Supplier quality pages |
| `src/app/(dashboard)/logistic/` | PlantLogistic pages |
| `src/app/api/ai/` | AI brainstorm endpoints |
| `docs/roadmap/` | Roadmap documents |
| `docs/product/` | Product specification documents |
| `docs/qa/` | QA checklists per version |
| `docs/release/` | Release readiness checklist |
| `versions/` | Per-version development notes |

---

## 5. Multi-Agent Workflow

When developing features, use **three sub-agents**:

### 5.1 Main Agent — Implementation
- Writes the code
- Follows patterns in this document and AGENTS.md
- Creates new files and modifies existing files
- Ensures multi-tenancy, type safety, design system compliance

### 5.2 Review Agent — Code Review
- Reads all changed files
- Checks against the review checklist in AGENTS.md (multi-tenancy, server/client boundaries, type safety, security, performance, UX, code quality)
- Reports findings as structured Markdown with severity levels
- Flags any design system violations

### 5.3 Git/Release Agent — Commit & Deploy
- Runs `npx tsc --noEmit` and `npx eslint` on all changed files
- Runs `docker-compose up -d --build app`
- Bumps version in `package.json`
- Tags Docker image: `docker tag plant-quality-app:latest ghcr.io/aokcuoglu/plantx:vX.Y.Z` + `:latest`
- Logs into GHCR: `echo $(gh auth token) | docker login ghcr.io -u aokcuoglu --password-stdin`
- Pushes to GHCR: `docker push ghcr.io/aokcuoglu/plantx:vX.Y.Z && docker push ghcr.io/aokcuoglu/plantx:latest`
- Verifies the app starts successfully
- Creates a git commit with proper message format:
  ```
  feat: add unified AuditTimeline component across all quality detail pages
  ```
  or:
  ```
  fix: resolve actor name fallback inconsistency in timeline rendering
  ```
- Updates version in `package.json` if needed
- Updates this DEVELOPMENT.md file with the change record

---

## 6. Roadmap Status

### 6.1 Completed Releases

| Version | Scope | Date |
|---------|-------|------|
| v1.0–1.1 | Core 8D, validation, audit events, revision lifecycle, RBAC | 2026-04 |
| v1.2 | Ownership, SLA, due dates, action owner, overdue, dashboard cards | 2026-04 |
| v1.2.1 | Evidence attachments (D3/D5/D6/D7), submission gating | 2026-04 |
| v1.3 | Supplier scorecard, advanced filters | 2026-05 |
| v1.4 | PPAP submissions, supplier document upload, OEM review | 2026-05 |
| v1.5 | IQC reports, checklists, create defect from IQC | 2026-05 |
| v1.6 | FMEA editor, RPN, AI suggestions, supplier/OEM workflows | 2026-05 |
| v1.7 | AI field defect classification, similar issue detection, accept/reject | 2026-05 |
| v2.0 | Plan gating (FREE/PRO/ENTERPRISE), upgrade modal | 2026-05 |
| v2.5+ | Quality linkage, related records | 2026-05 |
| v2.7 | Executive cockpit, AI 8D review | 2026-05 |
| v2.8 | Supplier scorecard v2, drilldown, filter | 2026-05 |
| v2.9 | Supplier development action plans | 2026-05 |
| v2.9.1–2.9.3 | Polish, security hardening, commercial readiness | 2026-05 |
| v3.0.0 | Commercial readiness, Docker, production validation | 2026-05-13 |
| v3.1.0 | PlantLogistic order tracking MVP | 2026-05-13 |
| v3.1.1 | Module entitlements, two-layer access model | 2026-05-14 |
| v3.2.0 | Production milestone tracking | 2026-05-15 |
| v3.2.1 | Milestone workflow polish | 2026-05-19 |
| v3.3.0 | Yard + Dispatch MVP | 2026-05-19 |
| v3.3.1 | Module switcher & subscription polish | 2026-05-19 |
| v3.3.2 | Settings shell context + module purchase flow | 2026-05-19 |
| v3.4.0 | Dealer/distributor portal MVP | 2026-05-20 |
| v3.4.1 | Dealer portal UX + access polish | 2026-05-20 |
| v3.5.0 | SLA + Delay Intelligence | 2026-05-21 |
| v3.5.1 | SLA/Delay UX & accuracy polish | 2026-05-23 |
| v3.6.0 | PlantQuality ↔ PlantLogistic Integration | 2026-05-25 |
| v3.7.0 | Dealer self-service order creation | 2026-05-25 |

### 6.2 In Progress (Current Sprint)

_No active sprint items — see Next Up below._

### 6.3 Next Up (Prioritized)

| Priority | Task | Description |
|----------|------|-------------|
| **P1** | Rate Limiting | API route rate limiting to prevent abuse |
| **P1** | Error Monitoring | Sentry or similar for production error tracking |
| **P1** | Production Deployment | Test on Supabase + Cloudflare R2, not just Docker |
| **P2** | PDF/Excel Export | 8D report PDF package, defect list Excel, PPAP package export |
| **P2** | Email Notification Delivery | Production email via Resend (currently Mailpit dev-only) |
| **P2** | Supplier-facing Scorecard Sharing | Suppliers view their own scorecard |
| **P2** | Custom KPI Weighting UI | Admin-configured scorecard weights |
| **P2** | Advanced Benchmarking | Cross-organization quality comparison |
| **P2** | Automated Email Digest | Weekly/monthly quality digest to executives |
| **Future** | ERP/MRP Integration | SAP, Oracle, Dynamics connector |
| **Future** | Mobile Yard Scan | QR/VIN scanning for yard operations |
| **Future** | AI Delay Prediction | Predictive ETA for PlantLogistic |
| **Future** | Carrier Portal | External carrier access for dispatch tracking |

### 6.4 Documentation References

| Document | Path | Purpose |
|----------|------|---------|
| PRD | `PRD.md` | Full product & architecture spec |
| Design System Agent | `AGENTS.md` | Design tokens, component patterns, review checklist |
| PlantQuality Roadmap | `docs/roadmap/plantquality-v3-commercial-readiness.md` | Commercial readiness checklist |
| PlantLogistic Roadmap | `docs/roadmap/plantlogistic-roadmap.md` | Logistic module feature history |
| 8D Gap Analysis | `docs/product/plantquality-8d-gap-roadmap.md` | 8D workflow gap analysis |
| v1.2 Ownership Plan | `docs/product/v1.2-ownership-sla-plan.md` | SLA & ownership spec |
| v1.2.1 Evidence Plan | `docs/product/v1.2.1-evidence-plan.md` | Evidence attachment spec |
| v1.7 AI Classification | `versions/v1.7.0.md` | AI defect classification notes |
| Release Notes | `RELEASE_NOTES.md` | Full version history |
| QA Checklists | `docs/qa/` | Per-version QA checklists |
| Subscription Strategy | `docs/commercial/plantx-subscription-strategy.md` | Pricing & entitlement model |
| Product Entitlements | `docs/commercial/plantx-product-entitlements-v3.1.1.md` | Module × plan matrix |

---

## 7. Change Log

### 2026-05-25 — Audit Trail UI Unification

**Files changed:**

| File | Change |
|------|--------|
| `src/components/AuditTimeline.tsx` | **NEW** — Unified audit timeline component. Uses `EVENT_META` for icons/labels/colors, renders metadata summary, show-more toggle, empty state. |
| `src/components/defects/DefectTimeline.tsx` | **MODIFIED** — Now a thin wrapper delegating to `AuditTimeline`. Added `initialLimit` prop forwarding. Added `email` field to actor interface. |
| `src/app/(dashboard)/quality/oem/field/[id]/page.tsx` | **MODIFIED** — Replaced inline activity section with `<AuditTimeline>`. Added `email` to actor query. |
| `src/app/(dashboard)/quality/supplier/field/[id]/page.tsx` | **MODIFIED** — Same. |
| `src/app/(dashboard)/quality/oem/ppap/[id]/page.tsx` | **MODIFIED** — Replaced inline event list with `<AuditTimeline>`. Added `email` to actor query. |
| `src/app/(dashboard)/quality/supplier/ppap/[id]/page.tsx` | **MODIFIED** — Same. |
| `src/app/(dashboard)/quality/oem/iqc/[id]/page.tsx` | **MODIFIED** — Same. |
| `src/app/(dashboard)/quality/supplier/iqc/[id]/page.tsx` | **MODIFIED** — Same. |
| `src/app/(dashboard)/quality/oem/fmea/[id]/page.tsx` | **MODIFIED** — Same. |
| `src/app/(dashboard)/quality/supplier/fmea/[id]/page.tsx` | **MODIFIED** — Same. |

**Key decisions:**
- `AuditTimeline` accepts `AuditTimelineEvent[]` with `{ id, type, actor, metadata, createdAt }` — unified shape for all entity types
- Actor fallback chain: `name` → `email` → `"System"`
- `isRecord()` type guard instead of `as` assertion for metadata
- Metadata summary renders: status transitions, revision numbers, section labels, file names, escalation levels, etc.
- `DefectTimeline` preserved as backward-compat wrapper — no changes to `DefectDetailView`
- All 6 detail page types (defect, field defect, PPAP, IQC, FMEA) now use the same component on both OEM and supplier sides

**Verified:**
- `npx tsc --noEmit` — zero errors
- ESLint on all changed files — zero warnings
- `docker-compose up -d --build app` — build successful, app running on localhost:3000

### 2026-05-25 — Responsive Layout & Design System Fixes

**Responsive Layout (critical):**

| File | Change |
|------|--------|
| `DefectDetailView.tsx` | `lg:grid-cols-[2fr_1fr]` → `xl:grid-cols-[2fr_1fr]` — sidebar + content overflow fix |
| `oem/field/[id]/page.tsx` | `lg:grid-cols-[3fr_1fr]` → `xl:grid-cols-[3fr_1fr]` — right column was only 192px |
| `oem/ppap/[id]/page.tsx` | `lg:grid-cols-[2fr_1fr]` → `xl:` |
| `oem/iqc/[id]/page.tsx` | Same |
| `oem/fmea/[id]/page.tsx` | Same |
| `oem/supplier-development/[id]/page.tsx` | Same |
| `oem/scorecard/[supplierId]/page.tsx` | Same |
| `supplier/ppap/[id]/page.tsx` | Same |
| `supplier/field/[id]/page.tsx` | Same |
| `supplier/iqc/[id]/page.tsx` | Same |
| `supplier/fmea/[id]/page.tsx` | Same |
| `supplier/development/[id]/page.tsx` | Same |
| `logistic/portal/orders/[id]/page.tsx` | Same |
| `oem/defects/[id]/loading.tsx` | `lg:grid-cols-3` → `xl:grid-cols-[2fr_1fr]` — matches actual layout |
| `supplier/defects/[id]/loading.tsx` | Same fix |
| `oem/defects/[id]/loading.tsx` | `bg-slate-*` → `bg-muted`/`bg-muted/80` design tokens |
| `oem/defects/loading.tsx` | Same |
| `oem/defects/new/loading.tsx` | Same |
| `supplier/defects/loading.tsx` | Same |
| `supplier/defects/[id]/8d/loading.tsx` | Same |

**Design System Violations Fixed:**

| File | Change |
|------|--------|
| `src/components/ui/tooltip.tsx` | `bg-slate-900 text-white dark:bg-slate-700` → `bg-popover text-popover-foreground` |
| `src/components/defects/DiagramNode.tsx` | `border-slate-300` → `border-border`, `bg-white` → `bg-card`, `text-slate-500` → `text-muted-foreground` |
| `src/components/defects/EightDWizardForm.tsx` | `overflow-visible` → `overflow-x-auto` (3 instances), `bg-white/50 dark:bg-black/10` → `bg-card/50` |
| `src/app/(dashboard)/quality/oem/fmea/page.tsx` | Raw `<button>` with `text-white` → `<Link>` with `text-primary-foreground` |

**Responsive Improvements:**

| Pattern | Change |
|---------|--------|
| 5 detail page `<dl>` grids | `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` — stacks on mobile |
| `min-w-0` added | 2 loading skeletons (defect detail OEM + supplier) — prevents content overflow |
| All `xl:grid-cols` pages | Two-column layouts now only activate at ≥1280px (was ≥1024px) |

**Key Decisions:**
- `lg` (1024px) breakpoint was too small for two-column layouts with sidebar (256px) — only 768px for content, right column was cramped
- `xl` (1280px) gives ~950px for content with sidebar, making `2fr/1fr` split usable
- Tooltip redesign uses semantic `bg-popover text-popover-foreground` tokens, automatically theme-safe
- DiagramNode now uses `bg-card` and `border-border` tokens for theme-safe rendering
- 8D wizard table wrappers now have `overflow-x-auto` instead of `overflow-visible` to prevent sidebar overflow

### 2026-05-25 — PlantQuality ↔ PlantLogistic Integration (v3.6.0)

**Prisma Schema Changes:**

| Change | Details |
|--------|---------|
| `QualityRecordType` | Added `LOGISTIC_ORDER` |
| `QualityLinkType` | Added `LOGISTIC_QUALITY_HOLD`, `ORDER_TO_DEFECT` |
| `PlantLogisticProductionMilestone` | Added `linkedDefectId` + `linkedDefect` relation (FK to Defect) |
| `Defect` | Added reverse relation `logisticMilestones` |

**New Files:**

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/logistic/orders/[id]/create-defect-from-hold.tsx` | Client component: "Create Defect" button + dialog for quality hold milestones |
| `src/app/api/companies/route.ts` | GET endpoint returning supplier companies (OEM-only) |

**Modified Files:**

| File | Change |
|------|--------|
| `src/app/(dashboard)/logistic/milestone-actions.ts` | Added `createDefectFromQualityHold()` — creates Defect from quality hold milestone, creates QualityRecordLink (ORDER_TO_DEFECT), events, notifications |
| `src/app/(dashboard)/logistic/orders/[id]/page.tsx` | Added `CreateDefectFromHoldButton` to milestone actions column when status === QUALITY_HOLD |
| `src/lib/quality-linkage/manual-links.ts` | Added `LOGISTIC_ORDER` to verifyRecordBelongsToCompany + revalidateRelatedPaths |
| `src/lib/quality-linkage/find-related.ts` | Added `LOGISTIC_ORDER` to buildHref + resolveRecord |
| `src/lib/quality-linkage/types.ts` | Added labels/colors/icons for new types |
| `src/components/quality-linkage/related-records-panel.tsx` | Added `LOGISTIC_ORDER` icon (Truck) + new link types to select |

**Integration Flow:**
1. OEM sees QUALITY_HOLD milestone → clicks "Create Defect"
2. Dialog: selects supplier, enters part number
3. Server creates: Defect + EightDReport + QualityRecordLink (ORDER_TO_DEFECT) + events + notifications
4. Milestone shows "View Defect" link to quality defect detail
5. Defect detail shows logistic order in Related Quality Records

**Verified:**
- `npx tsc --noEmit` — zero errors
- ESLint on all changed files — zero warnings
- `docker-compose up -d --build app` — build successful, app running on localhost:3000

### 2026-05-25 — Dealer Self-Service Order Creation (v3.7.0)

**New Files:**

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/logistic/portal/orders/new/form.tsx` | `PortalOrderForm` — dealer self-service order form with OEM selector, customer, vehicle, quantity, priority, delivery date |
| `src/app/(dashboard)/logistic/portal/orders/new/page.tsx` | New Order page at `/logistic/portal/orders/new` |
| `src/app/api/logistic/portal/create-order/route.ts` | POST endpoint accepting dealer-submitted order requests with OEM target selection |

**Modified Files:**

| File | Change |
|------|--------|
| `src/app/(dashboard)/logistic/portal/actions.ts` | Added `getAvailableOems()` — returns OEM companies with PLANT_LOGISTIC_MODULE for dealer target selection |
| `src/app/(dashboard)/layout.tsx` | Added `LOGISTIC_PORTAL_NAV` entry for "New Order" |
| `src/app/(dashboard)/logistic/portal/page.tsx` | Added "New Order" CTA button in dashboard header + empty state |
| `package.json` | Version bumped to 3.7.0 |

**Flow:**
1. Dealer navigates to `/logistic/portal/orders/new`
2. Selects target OEM, fills in customer name, vehicle model, quantity, priority, requested delivery date
3. Form validates all required fields client-side
4. POST to `/api/logistic/portal/create-order` creates order scoped by `dealerCompanyId`, auto-links to selected OEM
5. OEM sees new order in logistic order list

**Verified:**
- `npx tsc --noEmit` — zero errors
- ESLint on all changed files — zero warnings
- `docker-compose up -d --build app` — build successful, app running on localhost:3000