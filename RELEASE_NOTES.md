# PlantQuality v2.5.2 — Release Notes

## Quality Linkage False Positive Reduction + UX Polish

**Release Date:** 2026-05-04  
**Version:** 2.5.2

---

## Summary

PlantQuality v2.5.2 significantly improves the Quality Linkage layer by reducing false positives in deterministic matching, adding numeric confidence scoring, and polishing the Related Quality Records panel. Same-supplier-only matches (which were too broad) are now clearly labeled and scored below the display threshold by default. Exact part-number matches are weighted strongly. Manual and direct links always appear first. Reason badges are more descriptive, and the panel is clearer and more compact.

No AI linkage, graph visualization, supplier scorecard, or ERP integration is introduced.

---

## Changes

### Deterministic Match Scoring

- Added a numeric scoring system for deterministic matches:
  - Manual link: 100
  - Direct 8D/IQC/PPAP/FMEA link: 95
  - Exact part number match: 60
  - Same supplier with part match: +15
  - Same supplier only: 15 (below threshold)
  - Same failure mode (keyword overlap): 25–30
  - Same vehicle/project: 10 (supporting signal only)
  - IQC rejection/on-hold for same part: +20
  - PPAP approved for same part: +15
  - FMEA failure mode coverage: +25
- Minimum display threshold: score >= 50 for automatic matches
- Manual and direct links always bypass the threshold
- "Same supplier only" matches (score 15) are filtered out by default

### False Positive Reduction

- Empty/null values no longer contribute to matching (e.g., null partNumber, empty category)
- Same supplier alone is no longer sufficient to display as a strong match — it must be combined with at least one other meaningful signal (same part, same failure mode, etc.)
- `SAME_SUPPLIER_ONLY` is now a distinct reason badge when supplier is the only signal
- FMEA coverage badge only appears when there is actual keyword overlap between the source category/failure mode and the FMEA title (not just because a FMEA exists)
- Field defect → Defect keyword matching uses token overlap with stop-word filtering and minimum token length of 4 characters
- Vehicle/project matching is only shown as a supporting reason, never as primary
- IQC rejection history is specifically tagged with `IQC_REJECTION` badge for rejected/on-hold IQC records matching the same part

### Result Ranking and Grouping

- Results are now sorted by score (descending) within each group
- Group order: Field Defects → Defects/8D → PPAP → IQC → FMEA
- Per-group limit of 5 records
- Total maximum of 20 related records across all groups
- Manual links always shown first, before deterministic groups

### Reason Badge Clarity

- Updated badge labels to be more descriptive:
  - "Same Part" → "Same part number"
  - "Same Supplier" → "Same supplier + part"
  - "Same Failure Mode" → "Same failure mode"
  - "Same Vehicle/Project" → "Same vehicle/project"
  - "PPAP Reference" → "PPAP same part"
  - "FMEA Coverage" → "FMEA coverage"
  - "IQC → Defect" → "IQC → Defect" (unchanged)
  - "Field → 8D" → "Direct 8D link"
  - "Manual Link" → "Manual link"
  - "Related History" → "Related history"
- New badge types:
  - `IQC_REJECTION` — "IQC rejection history" (red accent)
  - `SAME_SUPPLIER_ONLY` — "Same supplier only" (muted)

### Confidence Labels

- Added numeric confidence labels with tooltip showing score:
  - Direct (100) — dark badge
  - Strong (70–99) — emerald badge
  - Moderate (50–69) — amber badge
  - Low (<50) — muted badge (filtered by default)

### Related Panel UX Polish

- Manual links section moved above deterministic matches for visibility
- Manual links highlighted with emerald border/background
- Manual link badge reads "Manual" instead of raw link type
- Empty state now includes helpful hint text
- Score shown in confidence badge tooltip
- Per-group count badges unchanged
- Part number shown before supplier name for better scannability

### Database

- Added `IQC_REJECTION` and `SAME_SUPPLIER_ONLY` to `QualityLinkType` enum
- Migration: `20260504080000_add_link_type_enums_v252`

### Seed Data

- Added 2 quality record link seed records for demo:
  - Manual link between field defect fd-001 and defect-001
  - Same-part link between IQC iqc-001 and defect-001

### Security

- Supplier isolation preserved — all queries remain scoped by oemId + supplierId
- Manual link creation/removal remains OEM-only
- Feature gating for Quality Linkage (PRO+) preserved
- No cross-tenant or cross-supplier data leakage introduced

### PPAP Detail Pages

- PPAP field defect and defect queries now require partNumber match in the base condition, eliminating loose same-supplier-only results that previously appeared in PPAP related records

---

## Deferred

The following remain explicitly out of scope:

- AI linkage suggestions / semantic matching
- Supplier scorecard
- Full graph visualization
- ERP/MRP/PLM integration

---

# PlantQuality v2.5.1 — Release Notes

## Quality Linkage Manual Link UI + Supplier Revalidation Polish

**Release Date:** 2026-05-03  
**Version:** 2.5.1

---

## Summary

PlantQuality v2.5.1 wires the manual link/unlink UI for OEM Admin/QE users, fixes the supplier manual-links query to use the correct OEM companyId context, and adds supplier detail revalidation paths so that manual link changes are immediately reflected on supplier pages. No AI linkage, graph visualization, or new features are introduced.

---

## Changes

### Manual Link/Unlink UI Wired for OEM Users

- OEM Admin and Quality Engineer users can now create manual links from any OEM detail page (Field Defect, IQC, FMEA, PPAP, Defect/8D)
- The "Link Record" button and unlink action were already implemented in `RelatedQualityRecordsPanel` but the `onCreateLink` and `onRemoveLink` props were not passed from any detail page
- All 5 OEM detail pages now pass `createManualQualityLink` and `removeManualQualityLink` server actions to the panel
- Supplier users remain read-only (`canLink={false}`) and cannot create or remove manual links

### Supplier Manual-Links Query Fix

- All 5 supplier detail pages queried `qualityRecordLink` with `companyId: session.user.companyId` (the supplier's own company ID)
- `qualityRecordLink.companyId` stores the OEM ID, so supplier queries always returned zero manual links
- Fixed to use the record's `oemId` as the companyId, matching the OEM context of the links
- Supplier visibility filtering remains intact — `resolveRecord()` in `find-related.ts` continues to apply supplier scope

### Supplier Detail Revalidation Paths

- `revalidateRelatedPaths` in `manual-links.ts` previously only revalidated OEM detail routes
- Supplier detail routes (`/quality/supplier/field/[id]`, `/quality/supplier/defects/[id]`, `/quality/supplier/ppap/[id]`, `/quality/supplier/iqc/[id]`, `/quality/supplier/fmea/[id]`) are now included
- Manual link changes are immediately reflected on both OEM and supplier pages

### Security

- Manual link/unlink remains tenant-scoped — server actions verify both source and target records belong to the session user's OEM companyId
- Supplier users are blocked at the server action level (`companyType !== "OEM"` check)
- Quality Linkage feature gating via `requireFeature("QUALITY_LINKAGE")` is enforced
- No cross-tenant or cross-supplier leakage introduced

---

## Deferred

The following remain explicitly out of scope:

- AI linkage suggestions / semantic matching
- Supplier scorecard
- Full graph visualization
- ERP/MRP/PLM integration

---

# PlantQuality v2.5.0 — Release Notes

## Quality Linkage Layer

**Release Date:** 2026-05-03  
**Version:** 2.5.0

---

## Summary

PlantQuality v2.5.0 introduces the **Quality Linkage Layer**, connecting PPAP, IQC, FMEA, Field Defects, Defects and 8D records through shared supplier, part, vehicle/project, failure mode and problem context. This transforms PlantQuality from a set of isolated quality modules into a connected quality intelligence platform.

Every detail page for Field Defects, IQC, FMEA, PPAP, and Defect/8D now shows a **Related Quality Records** panel that surfaces deterministically matched records across modules, helping quality engineers answer critical questions like:

- Does this Field Defect have a related PPAP record?
- Does this part/supplier have previous IQC rejection history?
- Is this failure mode already covered in FMEA?
- Is there an existing Defect or 8D for this same part/supplier/failure mode?
- Is this a repeated issue across Field / IQC / 8D?

---

## New Features

### Quality Linkage Service

- Central deterministic matching service at `src/lib/quality-linkage/find-related.ts`
- `findRelatedForFieldDefect()` — finds related PPAP, IQC, FMEA, Defect/8D records for a Field Defect
- `findRelatedForIqc()` — finds related PPAP, FMEA, Field Defect, Defect records for an IQC inspection
- `findRelatedForFmea()` — finds related Field Defect, IQC, PPAP, Defect records for an FMEA
- `findRelatedForPpap()` — finds related IQC, FMEA, Field Defect, Defect records for a PPAP
- `findRelatedForDefect()` — finds related Field Defect, PPAP, IQC, FMEA, other Defect records for a Defect/8D

### Matching Rules

All matching is deterministic, explainable, and tenant-scoped:

- **Exact part match** — same `partNumber` (case-insensitive)
- **Same supplier** — same `supplierId`
- **Same vehicle/project** — same `vehicleModel` (case-insensitive)
- **Same failure mode** — category/subcategory/keyword overlap
- **FMEA coverage** — FMEA exists for the same part/supplier
- **Direct links** — existing FK relationships (e.g., Field Defect → linked 8D, IQC → linked Defect, PPAP → linked Defect)
- **Manual links** — user-created links via QualityRecordLink table (backend prepared; UI deferred)
- Confidence levels: `direct`, `exact`, `strong`, `moderate`

### QualityRecordLink Table

New Prisma model for manual cross-record linking:

- `id`, `companyId`, `sourceType`, `sourceId`, `targetType`, `targetId`, `linkType`, `reason`, `createdById`, timestamps
- Unique constraint on `(sourceType, sourceId, targetType, targetId, linkType)`
- Indexes on `companyId + sourceType + sourceId`, `companyId + targetType + targetId`, `companyId + linkType`, `companyId + createdAt`
- Source/target types: `FIELD_DEFECT`, `DEFECT`, `EIGHT_D`, `PPAP`, `IQC`, `FMEA`
- Link types: `SAME_PART`, `SAME_SUPPLIER`, `SAME_FAILURE_MODE`, `SAME_VEHICLE`, `IQC_TO_DEFECT`, `FIELD_TO_8D`, `PPAP_REFERENCE`, `FMEA_COVERAGE`, `MANUAL`, `RELATED_HISTORY`

### Related Quality Records Panel

New reusable component `RelatedQualityRecordsPanel` at `src/components/quality-linkage/related-records-panel.tsx`:

- Card-based UI following shadcn/ui design system
- Grouped by record type (Field Defects, Defects/8D, PPAP, IQC, FMEA)
- Badge-coded match reasons (Same Part, Same Supplier, etc.)
- Confidence badges (Direct, Exact, Strong, Moderate)
- Status badges with record-type-specific colors
- Click-through links to related record detail pages
- Manual link/unlink backend prepared (UI controls deferred to a follow-up patch)
- Empty state: "No related quality records found."
- Upgrade banner for Free plan users

### Plan Gating

- New `QUALITY_LINKAGE` feature gate added to billing system
- **Pro/Enterprise**: Full deterministic linkage enabled
- **Free**: Shows upgrade banner with link to plan settings
- Supplier users see related records relevant to their supplier scope
- OEM Admin/QE can create manual links via server actions; UI controls deferred to a follow-up patch; supplier users cannot

### Field Defect Detail — Related Records

- Shows related PPAP, IQC, FMEA, Defect/8D records
- Direct link to linked 8D if exists
- OEM pages: manual link creation backend prepared (UI deferred)
- Supplier pages show read-only related records

### IQC Detail — Related Records

- Shows related PPAP (same supplier + part)
- Shows related FMEA (same part/supplier)
- Shows related Field Defects and Defects (same supplier + part)
- Direct link to linked Defect if exists
- OEM pages: manual link creation backend prepared (UI deferred)

### FMEA Detail — Related Records

- Shows related Field Defects (same part/supplier/category)
- Shows related IQC inspections (same part/supplier)
- Shows related PPAP (same supplier + part)
- Shows related Defects/8D (same part/supplier)
- OEM pages: manual link creation backend prepared (UI deferred)

### PPAP Detail — Related Records

- Shows related IQC inspections (same supplier + part)
- Shows related FMEA (same supplier + part)
- Shows related Field Defects (same supplier + part)
- Shows related Defects/8D (same supplier + part)
- OEM pages: manual link creation backend prepared (UI deferred)

### Defect/8D Detail — Related Records

- Shows related Field Defect, PPAP, IQC, FMEA records
- Direct links for existing FK relationships (linked Field Defect, linked IQC, linked PPAP, linked FMEA)
- OEM pages: manual link creation backend prepared (UI deferred)

### Security & Access

- All queries are scoped to `companyId` (tenant) — no cross-tenant data leaks
- Cross-supplier isolation enforced — supplier users never see other suppliers' records within the same OEM tenant
- Supplier users only see records assigned/relevant to their supplier company
- No client-provided `companyId` trust — all IDs verified server-side
- Manual links cannot be created cross-tenant
- `href` links only returned when user has access to the record
- Feature gate does not break supplier assigned workflow
- Direct URL access remains protected by existing detail page auth

### Server Action Refresh Consistency

- `createManualQualityLink` revalidates source and target detail pages
- `removeManualQualityLink` revalidates source and target detail pages
- List pages revalidated on link changes

---

## Database Changes

- Added `QualityRecordLink` model with enums `QualityRecordType` and `QualityLinkType`
- Migration: `20260503090000_add_quality_record_links_v250`

---

## Deferred

The following are explicitly **not** in scope for v2.5.0:

- AI linkage suggestions / semantic matching
- Supplier scorecard
- Full graph visualization
- ERP/MRP/PLM integration
- Advanced fuzzy matching
- Control Plan workflow
- PDF/Excel export of related records
- External webhook/event streaming

---

# PlantQuality v2.4.1 — Release Notes

## FMEA RPN/Review Bugfix Patch

**Release Date:** 2026-05-03  
**Version:** 2.4.1

---

## Summary

PlantQuality v2.4.1 is a stabilization patch for the FMEA Workflow MVP (v2.4.0). It fixes RPN and revised RPN display/validation, adds the supplier row editor for editable statuses, hardens the submit/review workflow, adds `requireFeature` gates to supplier FMEA pages, improves server action refresh consistency, polishes OEM and supplier detail views, replaces raw HTML form controls with shadcn/ui-style components, and improves S/O/D number input UX. No new major product features are introduced.

---

## RPN and Revised RPN Fixes

### Client-Side RPN Safety

- **`FmeaRowEditor.tsx`**: Replaced inline `Math.min(10, Math.max(1, parseInt(...)))` with a `clampSod()` helper that guarantees `1–10` integer clamping and handles `NaN`/`Infinity`/non-finite values gracefully. Previously, empty inputs could briefly produce `NaN` RPN values.
- **`FmeaRowEditor.tsx`**: RPN display now uses `Number.isFinite(row.rpn)` check — if RPN is `NaN` or `Infinity`, displays `—` instead of `NaN`. Row background highlighting also guards against `NaN`.

### Revised RPN

- **OEM detail read-only table**: Added columns for `R-Sev`, `R-Occ`, `R-Det`, and `R-RPN` with color-coded thresholds (red ≥200, amber ≥100, emerald <100, or `—` for null).
- **Supplier detail read-only table**: Same revised RPN columns added.
- **Supplier row editor**: Added `R-Sev`, `R-Occ`, `R-Det`, `R-RPN`, `Supplier Comment`, and `OEM Comment` (read-only) columns.

### Revised SOD Validation

- **`saveFmeaRows` (OEM)**: Added server-side validation for `revisedSeverity`, `revisedOccurrence`, `revisedDetection` — partial or invalid revised values are rejected.
- **`saveFmeaRows` (Supplier)**: Same validation added.
- **`approveFmea` (OEM)**: Added validation for revised S/O/D values — approval now rejects FMEAs with invalid revised values.
- **Partial revised values**: Server now explicitly clears `revisedRpn` when not all three revised values are present (previously it left `revisedRpn` unchanged, which could show stale values).

### Client Revised RPN Calculation

- **`FmeaRowEditor.tsx`**: When a revised S/O/D field is cleared (empty string), `revisedSeverity`/`revisedOccurrence`/`revisedDetection` are set to `undefined` instead of `0`. `revisedRpn` is recalculated only when all three are present; otherwise set to `undefined`.
- **`SupplierFmeaRowEditor.tsx`**: Same behavior.

---

## FMEA Row Editor UX Fixes

### Row Save Refresh

- **`FmeaRowEditor.tsx`**: Added `router.refresh()` call after successful `saveFmeaRows`. Previously, the row table displayed stale data after save because the server action only revalidated server-side cache but the client didn't trigger a refetch.

### Row Deletion Persistence

- **`FmeaRowEditor.tsx`**: Row deletion now persists immediately via `saveFmeaRows` with the updated row list. Previously, `removeRow` only updated local state — the row would reappear on page refresh. The new `handleRemoveRow` function optimistically removes from local state, persists the deletion, and rolls back on error.

### Supplier Row Editor

- **New file `SupplierFmeaRowEditor.tsx`**: Supplier users with ADMIN or QUALITY_ENGINEER role can now edit FMEA rows inline when the FMEA status is editable (REQUESTED, SUPPLIER_IN_PROGRESS, REVISION_REQUIRED). The editor includes Add Row, Save, and Remove Row actions, with `router.refresh()` after success. OEM Comment column is read-only.
- **`supplier/fmea/[id]/page.tsx`**: Uses `canSupplierEdit()` to show the editor when editable, and read-only table otherwise.

### Status Label Fix

- All `.replace("_", " ")` calls changed to `.replaceAll("_", " ")` across FMEA pages. Previously, `SUPPLIER_IN_PROGRESS` displayed as `SUPPLIER IN_PROGRESS` instead of the correct `In Progress` label (the `FMEA_STATUS_LABELS` map is always used, but the fallback `.replace` only replaced the first underscore).

---

## FMEA Submit/Review Workflow Hardening

### Row Validation on Submit and Approve

- **`saveFmeaRows` (OEM and Supplier)**: Added `failureMode` validation — each row must have a non-empty `failureMode`. This prevents submitting FMEAs with blank rows.
- **`approveFmea`**: Already validated rows ≥ 1 and valid SOD. Now also validates revised S/O/D values if present.

### Cancel Button Role Gate

- **`FmeaDetailActions.tsx`**: Added `canCancel` prop. The Cancel FMEA button is now only visible for OEM ADMIN and QUALITY_ENGINEER users. Previously, any OEM user could see the cancel button.

### Supplier Submit Visibility

- **`supplier/fmea/[id]/page.tsx`**: Submit button and row editor are only visible for ADMIN/QUALITY_ENGINEER supplier users.

---

## Supplier FMEA Access/Isolation Hardening

### Feature Gate on Supplier FMEA Pages

- **`supplier/fmea/page.tsx`**: Added `requireFeature(session, "FMEA")` check. Redirects to `/quality/supplier` if FMEA feature is not available. Suppliers with `supplierAccess: true` will pass this gate regardless of plan.
- **`supplier/fmea/[id]/page.tsx`**: Same feature gate added.

### Tenant Isolation

- **Confirmed**: Supplier FMEA pages already use `findFirst({ where: { id, supplierId: session.user.companyId } })` — no cross-tenant access possible.
- **Confirmed**: Supplier list page queries `where: { supplierId: session.user.companyId }` — only visible to assigned supplier.

---

## Server Action Refresh Consistency

All FMEA server actions now revalidate canonical paths for both OEM and supplier views, including dashboard paths:

| Action | Revalidated Paths |
|--------|-------------------|
| `createFmea` | `/quality/oem/fmea`, `/quality/oem`, `/quality/supplier/fmea` (if supplier), `/quality/supplier` (if supplier) |
| `saveFmeaRows` (OEM) | `/quality/oem/fmea/[id]`, `/quality/oem/fmea`, `/quality/supplier/fmea/[id]`, `/quality/supplier/fmea` |
| `saveFmeaRows` (Supplier) | `/quality/oem/fmea/[id]`, `/quality/oem/fmea`, `/quality/supplier/fmea/[id]`, `/quality/supplier/fmea` |
| `approveFmea` | Both detail + list + dashboards |
| `rejectFmea` | Both detail + list + dashboards |
| `requestFmeaRevision` | Both detail + list + dashboards |
| `cancelFmea` | Both detail + list + dashboards |
| `submitFmeaForReview` | Both detail + list + dashboards |
| `updateFmeaOemComment` | Both detail + list + dashboards (added) |
| `updateFmeaSupplierComment` | Both detail + list + dashboards (added) |

### Client-Side Refresh

- **`FmeaRowEditor.tsx`**: Calls `router.refresh()` after successful save.
- **`FmeaRowEditor.tsx`**: Calls `router.refresh()` after successful row deletion.
- **`FmeaDetailActions.tsx`**: Already calls `router.refresh()` on success for all actions.
- **`SupplierFmeaActions.tsx`**: Already calls `router.refresh()` on success.
- **`SupplierFmeaRowEditor.tsx`**: Calls `router.refresh()` after successful save and row deletion.

---

## OEM FMEA UX Polish

### Long Text Truncation

- **OEM detail read-only table**: Failure Mode and Effect columns now have `max-w-[200px] truncate` class.
- **OEM detail read-only table**: OEM Comment column has `max-w-[150px] truncate`.
- **Supplier detail read-only table**: Same truncation for Failure Mode, Effect, Supplier Comment, and OEM Comment columns.

### OEM Comment Column on OEM Detail Read-Only

- **OEM detail read-only table**: Added OEM Comment column showing `row.oemComment || "—"`.

### Loading Skeletons

- **OEM FMEA list `loading.tsx`**: Already exists with appropriate skeleton.
- **OEM FMEA detail `loading.tsx`**: Already exists with appropriate skeleton.
- **Supplier FMEA list `loading.tsx`**: Already exists.

---

## No Changes

- No new major product features
- No AI FMEA suggestions
- No AIAG-VDA Action Priority
- No Control Plan workflow
- No PDF/Excel export
- No e-signature
- No ERP integration
- No landing page changes
- No database schema changes
- No seed data changes
- No billing/plan gating logic changes (only added `requireFeature` to supplier pages)

---

## S/O/D Input Improvement

### Select Dropdowns for Severity, Occurrence, Detection

- **New component `SodSelect`** (`src/components/fmea/SodSelect.tsx`): Compact native `<select>` dropdown for S/O/D values 1–10, styled with design system tokens (`border-border`, `bg-background`, `text-foreground`, `focus-visible:border-ring`). Shows human-readable labels: "1 — Very Low" through "10 — Very High".
- **New component `SodSelectNullable`**: Same as `SodSelect` but supports undefined/empty values for revised S/O/D fields. Displays "—" for empty values.
- **`FmeaRowEditor.tsx`**: Replaced `<Input type="number">` for severity, occurrence, and detection with `SodSelect`. Eliminates ugly native browser number spinners and prevents invalid non-integer input.
- **`SupplierFmeaRowEditor.tsx`**: Same `SodSelect` replacement for S/O/D. Replaced revised S/O/D `<Input type="number">` with `SodSelectNullable`.

### Action Status Dropdown

- **New component `ActionStatusSelect`** (`src/components/fmea/ActionStatusSelect.tsx`): Replaces raw `<select>` in both row editors with a design-system-styled dropdown for Open/In Progress/Completed/Cancelled. Uses `border-border`, `bg-background`, `text-foreground`, `focus-visible` ring tokens.

---

## FMEA Create Form shadcn/ui Consistency

### Replaced Raw HTML Controls

- **`FmeaCreateForm`** (`oem/fmea/new/form.tsx`): Replaced raw `<select>` and `<label>` with shadcn `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, and `Label` components.
- **FMEA Type selector**: Now uses `Select`/`SelectTrigger`/`SelectContent`/`SelectItem` with proper focus ring and animation.
- **Supplier selector**: Now uses `Select`/`SelectTrigger`/`SelectContent`/`SelectItem` with `_none_` sentinel for "No supplier" option (maps to empty string in FormData).
- **All `<label>` elements**: Replaced with shadcn `Label` component for consistent font weight and spacing.
- **Due Date input**: Uses `<Input type="date">` with shadcn styling (already consistent; no heavy calendar dependency introduced).

---

## Process Step Visibility

### Root Cause

The `processStep` field is conditionally rendered only when `fmeaType === "PROCESS"`. This is by design — DFMEA rows do not have a Process Step column. Seed data confirms:
- **PFMEA** (fmea-001): All 3 rows include `processStep` values ("Mold preparation", "Pouring", "Heat treatment")
- **DFMEA** (fmea-002): Row has no `processStep` field (correct — design FMEAs don't have process steps)
- **fmea-003**: Empty rows array

No bug was found. The conditional rendering (`{fmeaType === "PROCESS" && ...}`) correctly shows/hides the Process Step column in all editors and read-only tables.

### Fix

- No code change needed for Process Step visibility — it already works correctly.
- Verified all 7 FMEA views (OEM list, OEM detail, OEM editor, OEM create, supplier list, supplier detail, supplier editor) correctly handle the Process Step conditional.

---

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Version → 2.4.1 |
| `src/app/(dashboard)/quality/oem/fmea/[id]/FmeaRowEditor.tsx` | Import `useRouter`; import OEM `saveFmeaRows`; add `clampSod()` helper; NaN-safe RPN display; persistent row deletion; `router.refresh()` after save/delete; revised RPN clearing on partial values; `replaceAll` for status labels; replace S/O/D `<Input type="number">` with `SodSelect` dropdown; replace raw `<select>` with `ActionStatusSelect` |
| `src/app/(dashboard)/quality/oem/fmea/[id]/FmeaDetailActions.tsx` | Added `canCancel` prop; cancel button gated on role |
| `src/app/(dashboard)/quality/oem/fmea/[id]/page.tsx` | Added revised S/O/D and R-RPN columns to read-only table; added OEM Comment column; `replaceAll` fix for status labels; text truncation; pass `canCancel` to actions |
| `src/app/(dashboard)/quality/oem/fmea/new/form.tsx` | Replaced raw `<select>` and `<label>` with shadcn `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, and `Label` components; supplier empty value handling |
| `src/app/(dashboard)/quality/oem/fmea/actions/fmea.ts` | Added revised SOD validation to `saveFmeaRows` and `approveFmea`; added `failureMode` validation; added `revisedRpn` clearing for partial revised values; added revalidate paths to `updateFmeaOemComment` and `saveFmeaRows` |
| `src/app/(dashboard)/quality/oem/fmea/page.tsx` | `replaceAll` fix for status labels |
| `src/app/(dashboard)/quality/supplier/fmea/page.tsx` | Added `requireFeature` gate; `replaceAll` fix for status labels |
| `src/app/(dashboard)/quality/supplier/fmea/[id]/page.tsx` | Added `requireFeature` gate; added `canSupplierEdit`; added revised S/O/D and R-RPN columns; added OEM Comment column; text truncation; uses `SupplierFmeaRowEditor` for editable statuses; pass `rows` to `SupplierFmeaActions` |
| `src/app/(dashboard)/quality/supplier/fmea/[id]/SupplierFmeaRowEditor.tsx` | New file: supplier row editor with Add/Save/Remove, revised SOD fields, supplier vs OEM comment columns; replace S/O/D inputs with `SodSelect`; replace revised S/O/D inputs with `SodSelectNullable`; replace raw `<select>` with `ActionStatusSelect`; persistent row deletion with rollback |
| `src/app/(dashboard)/quality/supplier/fmea/[id]/SupplierFmeaActions.tsx` | Added `rows` prop; Submit button disabled when no valid rows; helper text for empty/invalid rows |
| `src/app/(dashboard)/quality/supplier/fmea/actions/fmea.ts` | Added revised SOD validation to `saveFmeaRows`; added `failureMode` validation; added `revisedRpn` clearing for partial revised values; added revalidate paths to `updateFmeaSupplierComment` and `saveFmeaRows` |
| `src/components/fmea/SodSelect.tsx` | New file: shared `SodSelect` and `SodSelectNullable` components — native `<select>` styled with design system tokens, showing "1 — Very Low" through "10 — Very High" labels |
| `src/components/fmea/ActionStatusSelect.tsx` | New file: shared `ActionStatusSelect` component — native `<select>` styled with design system tokens for Open/In Progress/Completed/Cancelled |
| `src/lib/fmea/types.ts` | No changes (already correct) |
| `src/lib/fmea/index.ts` | No changes (already correct) |

---

# PlantQuality v2.4.0 — Release Notes

## FMEA Workflow MVP

**Release Date:** 2026-05-03  
**Version:** 2.4.0

---

## Summary

PlantQuality v2.4.0 introduces the FMEA (Failure Mode and Effects Analysis) Workflow MVP, transforming the existing placeholder FMEA module into a fully functional OEM-to-Supplier risk analysis workflow. OEM users can create PFMEA/DFMEA requests with rich row management and deterministic RPN calculation. Suppliers can edit FMEA rows and submit for review. OEM can approve, reject, or request revision. Plan gating restricts FMEA to PRO and Enterprise OEM users while supplier participants have read/write access regardless of plan.

---

## Data Model

### Updated Enums

- **`FmeaStatus`**: Replaced `IN_REVIEW` and `REVISED` with `REQUESTED`, `SUPPLIER_IN_PROGRESS`, `SUBMITTED`, `UNDER_REVIEW`, `REVISION_REQUIRED`, `REJECTED`, `ARCHIVED`, `CANCELLED` (retained `DRAFT` and `APPROVED`)
- **`FmeaActionStatus`**: New enum — `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- **`DefectEventType`**: Added `FMEA_SUBMITTED`, `FMEA_REJECTED`, `FMEA_REVISION_REQUESTED`, `FMEA_CANCELLED`
- **`NotificationType`**: Added `FMEA_REVIEW_REQUESTED`, `FMEA_STATUS_CHANGED`

### Updated Model: `Fmea`

- **New fields**: `fmeaNumber` (unique), `processName`, `projectName`, `vehicleModel`, `revision`, `dueDate`, `reviewedById`, `rejectionReason`, `createdById`
- **Changed fields**: `supplierId` now nullable (OEM-only FMEAs), `processStep` replaced by `processName` (column name change)
- **New indexes**: `[oemId, supplierId]`, `[oemId, createdAt]`
- **New relations**: `reviewedBy → User (FmeaReviewedBy)`, `createdBy → User (FmeaCreatedBy)`

### FMEA Row Structure (JSONB)

Each row in the `rows` JSONB array now includes:
- `id`, `processStep`, `functionName`, `failureMode`, `failureEffect`, `severity`, `failureCause`, `occurrence`, `preventionControl`, `detectionControl`, `detection`, `rpn`, `recommendedAction`, `actionOwner`, `targetDate`, `actionStatus`, `revisedSeverity`, `revisedOccurrence`, `revisedDetection`, `revisedRpn`, `supplierComment`, `oemComment`

Legacy fields (`potentialFailureMode`, `currentControl`, etc.) are mapped to new names for backward compatibility.

---

## OEM FMEA Create Flow

### FMEA Creation (`/quality/oem/fmea/new`)

- New OEM page for creating FMEA requests
- Fields: FMEA type (PFMEA/DFMEA), supplier (optional), title, part number, part name, process name, project name, vehicle model, revision, due date, notes
- Auto-generates `fmeaNumber` with format `FMEA-{timestamp}-{random}`
- Status set to `REQUESTED` if supplier assigned, `DRAFT` if OEM-only
- Creates `FMEA_CREATED` event
- Sends `FMEA_REVIEW_REQUESTED` notification to supplier users if assigned
- Feature-gated: requires PRO or Enterprise for OEM users

---

## OEM FMEA List & Detail

### OEM FMEA List (`/quality/oem/fmea`)

- Enhanced table showing: FMEA number, title, type, part number, supplier, status, max RPN, due date, created date
- Color-coded status badges using semantic design tokens
- Overdue indicator on past-due FMEAs
- "New FMEA" button linking to creation page
- Feature-gated: redirects FREE OEM users to dashboard

### OEM FMEA Detail (`/quality/oem/fmea/[id]`)

- Full detail view: all header fields, summary stats (max RPN, open actions, completed actions)
- Editable row table (when status allows: DRAFT, REQUESTED)
- Read-only row table (when status: SUBMITTED, UNDER_REVIEW, APPROVED, etc.)
- Row editing: severity/occurrence/detection (1-10), action status dropdown, OEM comments
- RPN auto-calculated and color-coded: red ≥200, amber ≥100, emerald <100
- Review actions (for SUBMITTED/UNDER_REVIEW statuses): Approve, Reject (with reason), Request Revision (with reason)
- Cancel action (for DRAFT/REQUESTED/SUPPLIER_IN_PROGRESS statuses)
- Activity timeline showing all FMEA events
- Notes section
- Tenant isolation: `fmea.oemId === session.user.companyId`

---

## Supplier FMEA Flow

### Supplier FMEA List (`/quality/supplier/fmea`)

- Shows only FMEAs assigned to the supplier's company
- Columns: number, title, type, part, OEM, status, max RPN, due date
- Color-coded status badges and overdue indicators
- No FMEA creation from supplier route — suppliers can only work on OEM-assigned FMEAs

### Supplier FMEA Detail (`/quality/supplier/fmea/[id]`)

- Read-only detail view with summary stats
- Read-only row table showing all FMEA row data
- Submit for Review action (when status is REQUESTED, SUPPLIER_IN_PROGRESS, or REVISION_REQUIRED)
- Tenant isolation: `fmea.supplierId === session.user.companyId`

### Supplier Restrictions

- Cannot create FMEA requests
- Cannot approve, reject, or request revision (OEM-only)
- Cannot access OEM FMEA pages
- Cannot access Plan & Usage
- Supplier access does NOT require a paid plan (participant access via `supplierAccess: true`)

---

## FMEA Workflow Statuses

| Status | Description |
|--------|-------------|
| DRAFT | OEM-only FMEA, not yet assigned to supplier |
| REQUESTED | Assigned to supplier, awaiting supplier action |
| SUPPLIER_IN_PROGRESS | Supplier is editing FMEA rows |
| SUBMITTED | Supplier submitted for OEM review |
| UNDER_REVIEW | OEM is reviewing |
| REVISION_REQUIRED | OEM requested changes, supplier can edit again |
| APPROVED | OEM approved |
| REJECTED | OEM rejected with reason |
| ARCHIVED | FMEA archived |
| CANCELLED | FMEA cancelled by OEM |

| Action Status | Description |
|---------------|-------------|
| OPEN | Recommended action not yet started |
| IN_PROGRESS | Action in progress |
| COMPLETED | Action completed |
| CANCELLED | Action cancelled |

---

## RPN Calculation

- **RPN = Severity × Occurrence × Detection** (all integers 1–10)
- **Revised RPN = Revised Severity × Revised Occurrence × Revised Detection** (calculated when all three revised values exist)
- Server-side calculation is the source of truth — client provides S/O/D values, server calculates and persists RPN
- Client-side RPN preview is for display only
- Invalid S/O/D values (outside 1–10 range) return validation errors from server actions

---

## Server Actions

| Action | Who | Description | Revalidated Paths |
|--------|-----|-------------|-------------------|
| `createFmea` | OEM (ADMIN/QE) | Create FMEA request with FormData | `/quality/oem/fmea`, `/quality/oem`, `/quality/supplier/fmea` (if supplier), `/quality/supplier` (if supplier) |
| `saveFmeaRows` | OEM/Supplier (ADMIN/QE) | Save row JSONB data with RPN calculation | `/quality/oem/fmea/[id]`, `/quality/oem/fmea`, `/quality/supplier/fmea/[id]`, `/quality/supplier/fmea` |
| `approveFmea` | OEM (ADMIN/QE) | Approve submitted FMEA | Both OEM and supplier detail + list + dashboards |
| `rejectFmea` | OEM (ADMIN/QE) | Reject with reason | Both OEM and supplier detail + list + dashboards |
| `requestFmeaRevision` | OEM (ADMIN/QE) | Request revision with reason | Both OEM and supplier detail + list + dashboards |
| `cancelFmea` | OEM (ADMIN/QE) | Cancel DRAFT/REQUESTED/SUPPLIER_IN_PROGRESS | Both OEM and supplier detail + list + dashboards |
| `updateFmeaOemComment` | OEM (ADMIN/QE) | Add O-specific comment to row | `/quality/oem/fmea/[id]`, `/quality/supplier/fmea/[id]` |
| `submitFmeaForReview` | Supplier (ADMIN/QE) | Submit FMEA for OEM review | Both OEM and supplier detail + list + dashboards |
| `updateFmeaSupplierComment` | Supplier (ADMIN/QE) | Add supplier comment to row | `/quality/supplier/fmea/[id]`, `/quality/oem/fmea/[id]` |

### Security

- All OEM actions verify `session.user.companyType === "OEM"` and `["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)`
- All supplier actions verify `session.user.companyType === "SUPPLIER"` and appropriate role
- All OEM actions invoke `requireFeature(session, "FMEA")` for plan gating
- All queries are scoped to `companyId` — no cross-tenant data access
- Status transition validation prevents invalid state changes
- FMEA cannot be approved with zero rows or invalid S/O/D values
- `companyId`/`supplierId` never trusted from client input — always derived from session

---

## Plan Gating

- **Free OEM**: FMEA locked — sidebar shows lock icon, `/quality/oem/fmea` redirects to dashboard
- **Pro OEM**: FMEA enabled — full creation, review, approval
- **Enterprise OEM**: FMEA enabled — full creation, review, approval
- **Supplier users**: Can view and edit assigned FMEA records regardless of plan (participant access)
- Backend enforcement via `requireFeature(session, "FMEA")`
- Frontend gating via `isFeatureGatedNav` for OEM sidebar

---

## Notification Types

| Type | Trigger |
|------|---------|
| `FMEA_REVIEW_REQUESTED` | New FMEA assigned to supplier, or FMEA submitted for review |
| `FMEA_STATUS_CHANGED` | FMEA approved, rejected, revision requested |
| `FMEA_HIGH_RPN` | FMEA approved with any row RPN ≥ 200 |
| `INFO` | FMEA cancelled (supplier notification) |

---

## Seed Data

Updated FMEA seed records:

- **fmea-001** (SUPPLIER_IN_PROGRESS, PRO OEM): Cylinder Head Casting PFMEA — 3 rows (low:63, medium:160, high:180 RPN), with supplier and OEM comments
- **fmea-002** (APPROVED, PRO OEM): Steering Knuckle DFMEA — 1 row with revised RPN (40→20), project and vehicle model fields
- **fmea-003** (REQUESTED, ENTERPRISE OEM): Battery Tray Stamping PFMEA — empty rows, with notes and due date

5 FMEA events added for creation, submission, and approval milestones.

---

## Migration

- **Migration**: `20260503080000_add_fmea_workflow_v240`
- Extends `FmeaStatus` enum with 7 new values
- Creates `FmeaActionStatus` enum
- Adds `DefectEventType` values: `FMEA_SUBMITTED`, `FMEA_REJECTED`, `FMEA_REVISION_REQUESTED`, `FMEA_CANCELLED`
- Adds `NotificationType` values: `FMEA_REVIEW_REQUESTED`, `FMEA_STATUS_CHANGED`
- Adds columns to `fmeas` table: `fmea_number`, `process_name`, `project_name`, `vehicle_model`, `revision`, `due_date`, `reviewed_by_id`, `rejection_reason`, `created_by_id`
- Makes `supplier_id` nullable on `fmeas`
- Drops `process_step` column from `fmeas`
- Backfills `fmea_number` from record ID
- Migrates existing statuses: `IN_REVIEW` → `UNDER_REVIEW`, `REVISED` → `REVISION_REQUIRED`
- Adds indexes on `[oem_id, supplier_id]`, `[oem_id, created_at]`
- Adds foreign keys for `reviewed_by_id` and `created_by_id`

---

## Known Limitations

- No AI FMEA suggestions (deferred to future release)
- No AIAG-VDA Action Priority engine
- No Control Plan workflow
- No PDF/Excel export
- No e-signature
- No ERP integration
- No supplier scorecard changes
- No advanced revision comparison
- No field defect auto-linking to FMEA (deferred to Quality Linkage Layer)
- OEM row editing limited to DRAFT and REQUESTED statuses (inline editor for SUBMITTED/UNDER_REVIEW status is read-only)
- Supplier FMEA row editing uses same save pattern (no per-row inline editing on supplier detail yet)

---

## Deferred

| Feature | Target |
|---------|--------|
| AI FMEA suggestions | Future release |
| AIAG-VDA Action Priority | Future release |
| Control Plan workflow | Future release |
| PDF/Excel export | Future release |
| E-signature | Future release |
| ERP integration | Future release |
| Supplier scorecard | Enterprise release |
| Advanced revision comparison | Future release |
| Quality Linkage Layer | Future release |

---

# PlantQuality v2.3.1 — Release Notes

## IQC Checklist & Defect Link Stabilization

**Release Date:** 2026-05-03  
**Version:** 2.3.1

---

## Summary

PlantQuality v2.3.1 is a stabilization and polish patch for the IQC Workflow MVP (v2.3.0). It fixes error handling gaps in IQC client components, adds server-side input validation for checklist and completion actions, hardens the role-based action visibility on the OEM detail page, and ensures state resets correctly on all mutations. No new major product features are introduced.

---

## IQC Checklist Edit UX Fixes

### Error Handling

- **`checklist-editor.tsx`**: Wrapped `updateIqcChecklistItem` server action call in try/catch. On thrown exception, an inline error message is shown instead of silently failing. Pending state resets normally.
- **Empty value normalization**: Measured value and comment are now trimmed before send. Empty strings are normalized to `null` server-side, preventing stale empty strings from persisting in the database.

### Server-Side Validation

- **`updateIqcChecklistItem`**: Added enum validation for `IqcChecklistResult` — only `PENDING`, `OK`, `NOK`, `NA` are accepted. Invalid values return `{ success: false, error: "Invalid result value" }`.
- **`updateIqcChecklistItem`**: `measuredValue` and `comment` are now trimmed and nullified if empty, ensuring consistent DB state.
- **`completeIqcInspection`**: Added enum validation for `IqcResult` — only the six valid values are accepted.
- **`completeIqcInspection`**: Added non-negative validation for `quantityAccepted` and `quantityRejected`.

---

## IQC Completion/Result UX Polish

### Error Handling

- **`complete-dialog.tsx`**: Wrapped `completeIqcInspection` server action call in try/catch. On thrown exception, an inline error message is shown. Pending state resets normally.
- **State reset**: After successful completion, the dialog resets `result`, `quantityAccepted`, `quantityRejected`, and `dispositionNotes` state, preventing stale values if reopened.

### Cancel Inspection

- **`cancel-button.tsx`**: Wrapped `cancelIqcInspection` server action call in try/catch. On thrown exception, an inline error message is shown. Error state resets on success.

---

## Create Defect from IQC Polish

### Error Handling

- **`create-defect-button.tsx`**: Wrapped `createDefectFromIqc` server action call in try/catch. On thrown exception, an inline error message is shown. Pending state resets normally.
- **State reset**: Close button now also resets `error` state alongside `createdDefectId`, preventing a stale error from persisting if the dialog is reopened.

---

## Role-Based Action Visibility

### OEM IQC Detail Page

- **`page.tsx`**: `canComplete`, `canCancel`, and `canCreateDefect` now also check `canManageIqc(session)`. Previously, any OEM user (including VIEWER role) could see and attempt Complete Inspection, Cancel, and Create Defect buttons, which would then fail server-side. Now these actions are only visible to ADMIN and QUALITY_ENGINEER roles.

---

## Server Action Refresh Consistency

All five IQC server actions already revalidate the correct canonical paths. Client components all use `router.refresh()` inside `startTransition`. No changes needed.

Verified actions and revalidated paths:

| Action | Revalidated Paths |
|--------|-------------------|
| `createIqcInspection` | `/quality/oem/iqc`, `/quality/supplier/iqc`, `/quality/oem`, `/quality/supplier` |
| `updateIqcChecklistItem` | `/quality/oem/iqc/[id]`, `/quality/oem/iqc`, `/quality/supplier/iqc/[id]`, `/quality/supplier/iqc`, `/quality/oem`, `/quality/supplier` |
| `completeIqcInspection` | `/quality/oem/iqc/[id]`, `/quality/oem/iqc`, `/quality/supplier/iqc/[id]`, `/quality/supplier/iqc`, `/quality/oem`, `/quality/supplier` |
| `cancelIqcInspection` | `/quality/oem/iqc/[id]`, `/quality/oem/iqc`, `/quality/supplier/iqc/[id]`, `/quality/supplier/iqc`, `/quality/oem`, `/quality/supplier` |
| `createDefectFromIqc` | `/quality/oem/iqc/[id]`, `/quality/oem/iqc`, `/quality/oem/defects`, `/quality/supplier/defects`, `/quality/supplier/iqc/[id]`, `/quality/supplier/iqc`, `/quality/oem`, `/quality/supplier` |

---

## Access & Security Verification

Confirmed unchanged and correct:

- Supplier can only view IQC records scoped to `supplierId: session.user.companyId` — no cross-tenant access
- Supplier cannot create, edit, complete, or cancel IQC inspections
- OEM IQC pages gated by `requireFeature(session, "IQC")` — Free OEM cannot access IQC pages
- All OEM mutations verify `companyType === "OEM"`, `canManageIqc(session)`, and `requireFeature(session, "IQC")`
- Client-provided `companyId` and `supplierId` are never trusted — all derived from session
- IQC detail page scoping uses `findFirst({ where: { id, oemId } })` for OEM and `findFirst({ where: { id, supplierId } })` for supplier
- Supplier access to IQC is plan-independent (participant access via `supplierAccess: true`)
- Plan & Usage page inaccessible to supplier users

---

## No Changes

- No new major product features
- No AQL engine
- No barcode/RFID
- No AI IQC review
- No PDF/Excel export
- No ERP integration
- No app redesign
- No landing page changes
- No database schema changes
- No plan gating logic changes

---

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Version → 2.3.1 |
| `package-lock.json` | Lockfile metadata update for 2.3.1 |
| `src/app/(dashboard)/quality/oem/iqc/actions/report.ts` | Added result enum validation to `updateIqcChecklistItem` and `completeIqcInspection`; added quantity validation to `completeIqcInspection`; added null normalization for measuredValue/comment |
| `src/app/(dashboard)/quality/oem/iqc/[id]/checklist-editor.tsx` | Added try/catch error handling; normalized empty measuredValue/comment on save |
| `src/app/(dashboard)/quality/oem/iqc/[id]/complete-dialog.tsx` | Added try/catch error handling; reset dialog state after successful completion |
| `src/app/(dashboard)/quality/oem/iqc/[id]/cancel-button.tsx` | Added try/catch error handling; reset error state on success |
| `src/app/(dashboard)/quality/oem/iqc/[id]/create-defect-button.tsx` | Added try/catch error handling; reset error state on dialog close |
| `src/app/(dashboard)/quality/oem/iqc/[id]/page.tsx` | Added `canManageIqc(session)` check to `canComplete`, `canCancel`, `canCreateDefect` |
| `src/app/(dashboard)/quality/oem/iqc/new/form.tsx` | Removed `finally { setSaving(false) }` to avoid brief button flash on successful navigation; error flow explicitly sets `setSaving(false)` |

---

# PlantQuality v2.3.0 — Release Notes

## IQC Workflow MVP

**Release Date:** 2026-05-02  
**Version:** 2.3.0

---

## Summary

PlantQuality v2.3.0 introduces the IQC (Incoming Quality Control) Workflow MVP, transforming the existing placeholder IQC module into a fully functional incoming inspection workflow. OEM users can create IQC inspections, complete checklists, record results, and create defects from non-conforming inspections. Supplier users can view assigned IQC records relevant to their company.

---

## Data Model

### New Enums

- **`IqcStatus`**: Replaced `PENDING | IN_PROGRESS | PASSED | FAILED | CONDITIONALLY_ACCEPTED` with `DRAFT | PLANNED | IN_PROGRESS | COMPLETED | CANCELLED`
- **`IqcResult`**: New enum — `ACCEPTED | CONDITIONAL_ACCEPTED | REJECTED | ON_HOLD | REWORK_REQUIRED | SORTING_REQUIRED`
- **`IqcInspectionType`**: New enum — `RECEIVING_INSPECTION | FIRST_ARTICLE_INSPECTION | CONTAINMENT_INSPECTION | RE_INSPECTION | DOCK_AUDIT`
- **`IqcChecklistResult`**: New enum — `PENDING | OK | NOK | NA`
- **`DefectEventType`**: Added `IQC_CHECKLIST_UPDATED`, `IQC_CANCELLED`, `IQC_RESULT_SET`
- **`NotificationType`**: Added `IQC_COMPLETED_FOR_SUPPLIER`, `IQC_RESULT_SET`

### New Model: `IqcChecklistItem`

- `id`, `iqcInspectionId` (FK cascade), `itemName`, `requirement` (nullable), `result` (default PENDING), `measuredValue` (nullable), `comment` (nullable), `evidenceFileName` (nullable), `evidenceStorageKey` (nullable), `createdAt`, `updatedAt`
- Index on `iqcInspectionId + result`

### Updated Model: `IqcReport`

- **New fields**: `inspectionNumber` (unique), `purchaseOrder`, `deliveryNote`, `lotNumber` (moved), `batchNumber`, `quantityReceived`, `inspectionQuantity`, `vehicleModel`, `projectName`, `inspectionType`, `samplingPlan`, `result` (IqcResult nullable), `notes`, `linkedDefectId` (unique nullable, replaces old `defectId`), `createdById` (required), `completedById` (nullable), `completedBy` relation
- **Removed fields**: `quantity` (replaced by `quantityReceived`), `defectId` (replaced by `linkedDefectId`)
- **Relation changes**: `linkedDefect` → `Defect?` via `linkedDefectId`, `createdBy` → `User`, `completedBy` → `User?`, `checklistItems` → `IqcChecklistItem[]`
- **New indexes**: `[oemId, supplierId]`, `[oemId, result]`, `[oemId, createdAt]`
- **Existing data migrated**: `PENDING` → `PLANNED`, `PASSED/FAILED/CONDITIONALLY_ACCEPTED` → `COMPLETED` with appropriate `result` values

### Defect Model Change

- Added `iqcReport IqcReport?` inverse relation (replacing old `iqcReport` via `defectId`)
- `Defect.iqcReport` now references `IqcReport.linkedDefectId`

---

## OEM IQC Workflow

### IQC Inspection Creation (`/oem/iqc/new`)

- New OEM page for creating IQC inspections
- Fields: supplier, part number, part name, purchase order, delivery note, lot/batch number, quantity received, inspection quantity, vehicle model, project name, inspector, inspection date, inspection type, sampling plan, notes
- Auto-generates `inspectionNumber` with format `IQC-{timestamp}-{random}`
- Creates 9 default checklist items on creation
- Sends notification to assigned supplier users
- Plan-gated: requires PRO or Enterprise for OEM users

### Default Checklist Items

On every IQC inspection creation, 9 default checklist items are created:

1. Packaging Condition
2. Label / Traceability Check
3. Visual Inspection
4. Dimensional Check
5. Functional Check
6. Material Certificate Check
7. Quantity Check
8. Damage Check
9. Special Characteristic Check

Each item has PENDING result by default with a predefined requirement description.

### OEM IQC List (`/oem/iqc`)

- Enhanced table showing: inspection number, part number/name, supplier, type, status, result, date
- Color-coded status and result badges
- Link to detail page
- "New Inspection" button linking to creation page

### OEM IQC Detail (`/oem/iqc/[id]`)

- Inspection details: all fields including type, quantities, lot/batch, PO, vehicle/model, project
- **Checklist inline editing**: OEM users can edit checklist item result, measured value, and comment directly on the detail page for PLANNED/IN_PROGRESS inspections
- Checklist summary: OK/NOK/NA/pending counts
- Disposition notes section
- Notes section
- **Complete Inspection dialog**: OEM users must select a result (ACCEPTED, CONDITIONAL_ACCEPTED, REJECTED, ON_HOLD, REWORK_REQUIRED, SORTING_REQUIRED), enter quantities, and optionally add disposition notes
- NOK checklist items block ACCEPTED result (warning shown, must choose appropriate result)
- **Cancel Inspection** with confirmation dialog
- **Create Defect from IQC** with confirmation dialog (only for non-conforming results, prevents duplicates)
- Linked defect with navigation link
- Activity timeline
- Feature-gated: requires PRO/Enterprise plan (redirects if FREE)

### IQC Result Workflow

| Status | Description |
|--------|-------------|
| DRAFT | Initial creation (reserved for future use) |
| PLANNED | Created, awaiting inspection |
| IN_PROGRESS | Checklist items being updated |
| COMPLETED | Inspection completed with final result |
| CANCELLED | Cancelled by OEM |

| Result | Description |
|--------|-------------|
| ACCEPTED | Lot accepted, no issues found |
| CONDITIONAL_ACCEPTED | Accepted with conditions/notes |
| REJECTED | Lot rejected, non-conforming |
| ON_HOLD | Inspection on hold pending decision |
| REWORK_REQUIRED | Rework required before acceptance |
| SORTING_REQUIRED | Sorting required to separate conforming from non-conforming |

- Any checklist item with NOK result prevents defaulting result to ACCEPTED
- NOK checklist items require user to choose appropriate non-conforming result
- Create Defect from IQC: OEM can create a defect from REJECTED/ON_HOLD/REWORK_REQUIRED/SORTING_REQUIRED inspections
  - Defect is pre-filled with supplier, part number, description from IQC disposition
  - IQC is linked to the created defect via `linkedDefectId`
  - Does not create duplicate defect if already linked

### Checklist Inline Editing

- OEM users with ADMIN/QUALITY_ENGINEER role can edit checklist items on PLANNED/IN_PROGRESS inspections
- Editable fields: Result (PENDING/OK/NOK/NA), Measured Value, Comment
- Editing any checklist item on a PLANNED inspection automatically transitions status to IN_PROGRESS
- Editing is blocked on COMPLETED/CANCELLED inspections (server-side validation)
- Supplier users see a read-only checklist with no edit capability
- UI refreshes after each save via `router.refresh()`

### Result Workflow

- OEM must select a final result when completing an inspection:
  - ACCEPTED: Lot accepted, no issues
  - CONDITIONAL_ACCEPTED: Accepted with conditions
  - REJECTED: Lot rejected
  - ON_HOLD: Pending decision
  - REWORK_REQUIRED: Rework needed before acceptance
  - SORTING_REQUIRED: Sort conforming from non-conforming
- If any checklist item has NOK result, ACCEPTED is blocked and a warning is shown
- Completion requires quantity accepted and quantity rejected counts
- Optional disposition notes can be added
- Upon completion: status → COMPLETED, `completedAt` and `completedById` are set

---

## Supplier IQC Visibility

### Supplier IQC List (`/supplier/iqc`)

- Shows only IQC inspections assigned to the supplier's company
- Displays: inspection number, part number/name, OEM, status, result, date
- Supplier cannot create, modify, or complete inspections

### Supplier IQC Detail (`/supplier/iqc/[id]`)

- Read-only view of inspection details
- Checklist summary (OK/NOK/NA/Pending counts) without edit capability
- Activity timeline
- Related defect information (if any)
- Tenant scoped: supplier can only access their own IQC records

### Supplier Restrictions

- Cannot create IQC inspections
- Cannot modify checklist results
- Cannot complete or cancel inspections
- Cannot access another supplier's IQC data
- Supplier access does not require a paid plan (participant access)

---

## Server Actions

All IQC server actions are in `src/app/(dashboard)/quality/oem/iqc/actions/report.ts`:

| Action | Description | Plan Gate |
|--------|-------------|-----------|
| `createIqcInspection` | Create new IQC inspection with default checklist | PRO+ |
| `updateIqcChecklistItem` | Update checklist item result, measured value, or comment | PRO+ |
| `completeIqcInspection` | Complete inspection with final result and quantities | PRO+ |
| `cancelIqcInspection` | Cancel a PLANNED or IN_PROGRESS inspection | PRO+ |
| `createDefectFromIqc` | Create a defect from a non-conforming IQC inspection | PRO+ |

### Security

- All OEM actions explicitly verify `session.user.companyType === "OEM"` and `["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)`
- All OEM actions invoke `requireFeature(session, "IQC")` for plan gating (including `createDefectFromIqc`)
- All queries are scoped to `oemId: session.user.companyId` (OEM) or `supplierId: session.user.companyId` (Supplier)
- `companyId`/`supplierId` never trusted from client input
- Checklist item updates verify OEM ownership of the parent inspection AND that the inspection is in PLANNED/IN_PROGRESS status (prevents editing COMPLETED/CANCELLED inspections)
- Completion validates that NOK checklist items are not set to ACCEPTED
- OEM IQC detail page enforces `requireFeature(session, "IQC")` — direct URL access by FREE users redirects to dashboard
- Supplier users cannot create, edit, complete, or cancel IQC inspections (read-only access)
- Create Defect from IQC is plan-gated and tenant-scoped

### Refresh Consistency

All server actions revalidate affected paths after mutations:

| Action | Revalidated Paths |
|--------|-------------------|
| `createIqcInspection` | `/quality/oem/iqc`, `/quality/supplier/iqc` |
| `updateIqcChecklistItem` | `/quality/oem/iqc/[id]`, `/quality/oem/iqc`, `/quality/supplier/iqc/[id]`, `/quality/supplier/iqc` |
| `completeIqcInspection` | `/quality/oem/iqc/[id]`, `/quality/oem/iqc`, `/quality/supplier/iqc/[id]`, `/quality/supplier/iqc` |
| `cancelIqcInspection` | `/quality/oem/iqc/[id]`, `/quality/oem/iqc`, `/quality/supplier/iqc/[id]`, `/quality/supplier/iqc` |
| `createDefectFromIqc` | `/quality/oem/iqc/[id]`, `/quality/oem/iqc`, `/quality/oem/defects`, `/quality/supplier/defects`, `/quality/supplier/iqc/[id]`, `/quality/supplier/iqc` |

---

## Plan Gating

- **Free OEM**: IQC locked — sidebar shows lock icon, `/quality/oem/iqc` redirects to OEM dashboard
- **Pro OEM**: IQC enabled — full creation, editing, completion
- **Enterprise OEM**: IQC enabled — full creation, editing, completion
- **Supplier users**: Can view assigned IQC records regardless of plan (participant access)
- Backend enforcement via `requireFeature(session, "IQC")`
- Frontend gating via sidebar lock icon and `isFeatureGatedNav`

---

## Seed Data

Updated existing IQC records with new fields:

- **iqc-001** (PRO OEM, REJECTED): Cylinder Head Casting from Precision Parts Inc. — 9 checklist items with 3 NOK results, linked to defect-001
- **iqc-002** (PRO OEM, ACCEPTED): M12 Hex Bolt from Precision Parts Inc. — 9 checklist items all OK
- **iqc-003** (ENTERPRISE OEM, IN_PROGRESS): Steering Knuckle Forging from SteelForged Co. — 9 checklist items with 2 OK, 1 NA, 6 PENDING

Added 5 IQC events tracking creation and completion milestones.

---

## Dashboard Updates

- OEM dashboard IQC pass rate now uses `status: "COMPLETED"` with `result: "ACCEPTED"` instead of old `PASSED` status
- Supplier dashboard IQC failed count now uses `result: { in: ["REJECTED", "ON_HOLD", "REWORK_REQUIRED", "SORTING_REQUIRED"] }` instead of old `status: "FAILED"`

---

## Migration

- **Migration**: `20260502080001_add_iqc_workflow_v230`
- Creates new enums: `IqcResult`, `IqcInspectionType`, `IqcChecklistResult`
- Replaces `IqcStatus` enum with new values
- Creates `iqc_checklist_items` table
- Adds new columns to `iqc_reports`
- Migrates existing data: old statuses → new statuses/values
- Backfills `inspection_number` from record ID
- Backfills `created_by_id` from `inspector_id`
- Removes old `defect_id` column, adds `linked_defect_id`

---

## Known Limitations

- No AQL engine or advanced sampling plans
- No ERP/MRP/PO integration
- No barcode/RFID scanning
- No AI IQC review
- No PDF/Excel export
- No supplier scorecard
- No advanced control plan linkage
- No full traceability/carbon integration
- Evidence upload on checklist items is storage-key-only (no presigned URL upload flow yet)
- No supplier-side IQC actions (acknowledge, respond) — supplier view is read-only
- Supplier dropdown on create only shows suppliers already linked to existing records

---

## Deferred

| Feature | Target |
|---------|--------|
| AQL/sampling engine | Future release |
| ERP integration | Future release |
| Barcode/RFID | Future release |
| AI IQC review | Future release |
| PDF/Excel export | Future release |
| Supplier scorecard | Enterprise release |
| Advanced control plan linkage | Future release |
| Full traceability/carbon integration | Future release |

---

# PlantQuality v2.2.2 — Release Notes

## PPAP Minor Cleanup + Supplier Comment Refresh

**Release Date:** 2026-05-02  
**Version:** 2.2.2

---

## Summary

PlantQuality v2.2.2 is a minor cleanup patch on top of v2.2.1. It fixes a revalidation gap where OEM review comments did not immediately appear on the supplier PPAP detail page, and confirms that no PPAP dead code exists. No new product features are introduced.

---

## Supplier Comment Refresh Fix

### OEM Review Comment Revalidation Gap

- **`addPpapReviewComment`** (OEM server action): Added missing `revalidatePath` calls for `/quality/supplier/ppap/${ppapId}` and `/quality/supplier/ppap`. Previously, when an OEM reviewer added a review comment, only OEM pages were revalidated — supplier pages required a manual browser refresh to see the new comment. Now supplier users see updated review comments immediately after OEM action.

### Supplier Comment Refresh (Already Working)

- Confirmed: `uploadPpapDocument` and `submitPpapPackage` already revalidate both OEM and supplier paths correctly. Supplier comments on document uploads appear on the OEM detail page without manual refresh. No fix needed.

### PPAP Action Revalidation Audit (Complete)

| Action | OEM Detail | OEM List | Supplier Detail | Supplier List |
|--------|-----------|----------|-----------------|---------------|
| `createPpapRequest` | ✅ | ✅ | ✅ | ✅ |
| `uploadPpapDocument` | ✅ | ✅ | ✅ | ✅ |
| `submitPpapPackage` | ✅ | ✅ | ✅ | ✅ |
| `reviewPpapDocument` | ✅ | ✅ | ✅ | ✅ |
| `addPpapReviewComment` | ✅ | ✅ | ✅ **NEW** | ✅ **NEW** |
| `approvePpap` | ✅ | ✅ | ✅ | ✅ |
| `rejectPpap` | ✅ | ✅ | ✅ | ✅ |
| `requestPpapRevision` | ✅ | ✅ | ✅ | ✅ |
| `cancelPpap` | ✅ | ✅ | ✅ | ✅ |

---

## Dead Code Audit

A full audit of all PPAP files found **no dead code, unused exports, or orphaned components**. All PPAP functions, constants (`PPAP_REQUIREMENTS`, `PPAP_LEVELS`, `PPAP_REASONS`, `PPAP_STATUS_LABELS`, `PPAP_DOCUMENT_STATUS_LABELS`), helpers (`getDefaultRequirements`, `getPpapStatusColor`, `getDocumentStatusColor`, `isPpapOverdue`, `generateRequestNumber`, `canManagePpap`), and client components are actively referenced in the PPAP workflow. No cleanup needed.

---

## Access & Security Verification

Confirmed unchanged and correct:

- Supplier can only update comments/documents for PPAP requests assigned to their company (`supplierId` scoping)
- Supplier cannot add OEM review comments (`canManagePpap(session, "OEM")` gate)
- Supplier cannot access other suppliers' PPAP data (query-level `supplierId` filter)
- OEM can view supplier comments for own company PPAP (`oemId` scoping)
- Client-provided `companyId`/`supplierId` is never trusted — server actions derive from session
- PPAP plan gating enforced on both OEM and supplier detail pages

---

## No Changes

- No new product features
- No APQP implementation
- No AI PPAP review
- No PDF export
- No e-signature
- No ERP integration
- No landing page changes
- No database schema changes
- No plan gating logic changes
- No billing/payment changes

---

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Version → 2.2.2 |
| `src/app/(dashboard)/quality/oem/ppap/actions/review.ts` | Added supplier path revalidation to `addPpapReviewComment` |

---

# PlantQuality v2.2.1 — Release Notes

## PPAP Upload & Review Bugfix Patch

**Release Date:** 2026-05-02  
**Version:** 2.2.1

---

## Summary

PlantQuality v2.2.1 is a stabilization patch on top of v2.2.0 (PPAP Workflow MVP). It fixes upload reliability issues, hardens OEM document review permissions, adds supplier notification for cancelled PPAPs, enforces PPAP status validation during document review, adds overdue indicators, and replaces all `alert()` calls with inline error UI. No new major product features are introduced.

---

## PPAP Upload UX & Reliability Fixes

### Upload Error Handling

- **Upload button state**: File input now resets correctly on success (`fileInputRef.current.value = ""`); pending state clears on both success and failure
- **Inline error display**: Replaced `alert()` with inline error banner in `SupplierDocumentUpload` — upload errors show as a red-bordered message below the status badge, consistent with design system
- **File input disabled during upload**: `<input type="file">` now uses `disabled={uploading}` to prevent re-selection mid-upload
- **Comment input disabled during upload**: Supplier comment field also disabled during upload

### Upload API Route Hardening

- **POST `/api/ppap/upload`**: Now restricts presigned URL generation to supplier-users only (`supplierId: session.user.companyId`), and verifies PPAP is in an uploadable status (`REQUESTED`, `SUPPLIER_IN_PROGRESS`, `REVISION_REQUIRED`). Previously, any authenticated user (including OEM) could request a presigned URL for any PPAP they could see.
- **PUT `/api/ppap/upload`**: Added status check — file metadata update now rejects requests when PPAP is in a terminal status (`APPROVED`, `REJECTED`, `CANCELLED`, `EXPIRED`). Previously, a supplier could overwrite file metadata on a closed PPAP.
- **Event type fix**: Changed `PPAP_DOCUMENT_UPLOADED` cast from `as DefectEventType` to a plain string literal, matching the Prisma enum value directly.

### Upload Flow Reliability

- **PUT response handling**: `SupplierDocumentUpload` now checks `putRes.ok` and shows error from response JSON if the PUT metadata save fails, instead of silently succeeding.
- **Presigned URL error**: Now shows the server error message from `data.error` when presigned URL generation fails, instead of generic "Failed to get upload URL".

---

## PPAP Document Review Fixes

### Review Permission Hardening

- **`reviewPpapDocument` server action**: Added PPAP status validation — OEM can only review documents on PPAPs in `SUBMITTED` or `UNDER_REVIEW` status. Previously, review was allowed on any status including `DRAFT`, `REQUESTED`, and `CANCELLED`.
- **Document status validation**: Review actions now verify that the evidence is in a reviewable status (`UPLOADED`, `UNDER_REVIEW`, `REVISION_REQUIRED`). Attempting to review a `MISSING`, `APPROVED`, or `REJECTED` document returns a descriptive error.
- **Review comment persistence**: Confirmed `oemComment` is correctly saved on review actions — no fix needed, working as designed.

### Review UI Error Handling

- **`PpapDocumentReview`**: Replaced `alert()` with inline `error` state banner. Error message shows below the document status badge, auto-clears on next action attempt.
- **`PpapReviewCommentForm`**: Replaced `alert()` with inline `error` state banner above the form fields.

---

## PPAP Final Status Action Fixes

### Cancel PPAP Notification

- **`cancelPpap`**: Now sends notifications to supplier users when a PPAP is cancelled, using `INFO` notification type. Previously, supplier users received no notification on cancellation.

### Final Approval Validation

- **Confirmed**: `approvePpap` correctly checks for `MISSING`, `REJECTED`, and `REVISION_REQUIRED` documents before allowing approval. No changes needed.
- **Terminal status hiding**: Action buttons correctly render only for `SUBMITTED`, `UNDER_REVIEW` (review actions) and `DRAFT`, `REQUESTED`, `SUPPLIER_IN_PROGRESS` (cancel action). No changes needed.

### OEM Action UI Error Handling

- **`PpapDetailActions`**: Replaced `alert()` calls for approve, reject, revision, and cancel with inline `error` state banner. Error messages appear above the action buttons and auto-clear on next action attempt.

---

## Server Action Refresh Consistency

All PPAP server actions now revalidate both detail and list paths for both OEM and supplier views:

| Action | Added Revalidation |
|--------|-------------------|
| `uploadPpapDocument` | `/quality/supplier/ppap` (list), `/quality/oem/ppap` (list) |
| `reviewPpapDocument` | `/quality/oem/ppap` (list), `/quality/supplier/ppap` (list) |
| `addPpapReviewComment` | `/quality/oem/ppap` (list) |
| `approvePpap` | `/quality/supplier/ppap` (list) |
| `rejectPpap` | `/quality/supplier/ppap` (list) |
| `requestPpapRevision` | `/quality/supplier/ppap` (list) |
| `cancelPpap` | Already had full revalidation ✅ |
| `createPpapRequest` | Already had full revalidation ✅ |
| `submitPpapPackage` | Already had full revalidation ✅ |

Previously, several actions only revalidated the detail page but not the list page, causing stale data after navigating back.

---

## Supplier & OEM Access Hardening

### PPAP Feature Gate Enforcement

- **Supplier PPAP list page** (`/quality/supplier/ppap`): Now checks `requireFeature(session, "PPAP")` before rendering. Redirects to `/quality/supplier` if not allowed. (Suppliers with `supplierAccess: true` on Free plan still pass this gate.)
- **Supplier PPAP detail page** (`/quality/supplier/ppap/[id]`): Same feature gate check added.

### Upload API Access Control

- **Presigned URL generation**: Now restricted to supplier users (`supplierId`) and only for PPAPs in uploadable status. OEM users can no longer generate upload URLs for supplier documents.
- **File metadata update (PUT)**: Added PPAP status check — prevents file overwrite on terminal-status PPAPs.

### Tenant Isolation

- **Confirmed**: All PPAP list queries scope to `oemId: session.user.companyId` (OEM) or `supplierId: session.user.companyId` (supplier).
- **Confirmed**: All PPAP detail/action queries verify ownership via `oemId` or `supplierId` match. Cross-tenant access returns `notFound()` or unauthorized error.

---

## UX Polish

### Overdue Indicators

- **OEM PPAP list**: Due date column now shows "Overdue" in red for past-due PPAPs that are not in a terminal status.
- **Supplier PPAP list**: Same overdue indicator added.
- **OEM PPAP detail**: Due date field shows "(Overdue)" suffix in red for past-due non-terminal PPAPs.
- **Supplier PPAP detail**: Same overdue indicator on due date field.
- **Helper function**: `isPpapOverdue(dueDate, status)` added to `src/lib/ppap/index.ts` — returns `true` only when due date is past and status is not terminal (APPROVED, REJECTED, CANCELLED, EXPIRED).

### Text Truncation

- **Long part names**: Part name columns in OEM and supplier PPAP lists now truncate with `max-w-[200px]` and `truncate` class.
- **Long supplier/OEM names**: Supplier/OEM name columns truncate at `max-w-[150px]`.

### Error Display Pattern

- All PPAP client components now use inline `error` state with red-bordered banners instead of `alert()`:
  - `SupplierDocumentUpload`
  - `SupplierPpapActions`
  - `PpapDocumentReview`
  - `PpapDetailActions`
  - `PpapReviewCommentForm`
  - `PpapCreateForm` (already had inline error)

---

## No Changes

- No new major product features
- No APQP implementation
- No AI PPAP review
- No PDF export
- No e-signature
- No ERP integration
- No landing page changes
- No database schema changes
- No plan gating logic changes
- No billing/payment changes
- No redesign of existing modules

---

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Version → 2.2.1 |
| `src/lib/ppap/index.ts` | Added `isPpapOverdue()` helper function |
| `src/app/api/ppap/upload/route.ts` | Restricted POST to supplier + uploadable status; Added PUT status check; Removed DefectEventType import |
| `src/app/(dashboard)/quality/supplier/ppap/[id]/SupplierDocumentUpload.tsx` | Replaced `alert()` with inline error state; Reset file input on success; Disable inputs during upload; Check PUT response |
| `src/app/(dashboard)/quality/supplier/ppap/actions/submit.ts` | Added list revalidation paths to `uploadPpapDocument` |
| `src/app/(dashboard)/quality/oem/ppap/actions/review.ts` | Added PPAP status + evidence status validation to `reviewPpapDocument`; Added list revalidation paths to all actions; Added supplier notification to `cancelPpap`; Replaced `PPAP_CANCELLED` notification type with `INFO` |
| `src/app/(dashboard)/quality/oem/ppap/[id]/PpapDetailActions.tsx` | Replaced `alert()` with inline error state banner |
| `src/app/(dashboard)/quality/oem/ppap/[id]/PpapDocumentReview.tsx` | Replaced `alert()` with inline error state banner |
| `src/app/(dashboard)/quality/oem/ppap/[id]/PpapReviewCommentForm.tsx` | Replaced `alert()` with inline error state banner |
| `src/app/(dashboard)/quality/oem/ppap/[id]/page.tsx` | Added overdue indicator on due date; Added `isPpapOverdue` import |
| `src/app/(dashboard)/quality/oem/ppap/page.tsx` | Added overdue indicator on due date column; Added name truncation; Added `isPpapOverdue` import |
| `src/app/(dashboard)/quality/supplier/ppap/[id]/SupplierPpapActions.tsx` | Replaced `alert()` with inline error state banner |
| `src/app/(dashboard)/quality/supplier/ppap/[id]/page.tsx` | Added overdue indicator on due date; Added `requireFeature` and `isPpapOverdue` imports |
| `src/app/(dashboard)/quality/supplier/ppap/page.tsx` | Added overdue indicator on due date column; Added name truncation; Added `requireFeature` and `isPpapOverdue` imports |

---

# PlantQuality v2.2.0 — Release Notes

## PPAP Workflow MVP

**Release Date:** 2026-05-02  
**Version:** 2.2.0

---

## Summary

PlantQuality v2.2.0 introduces a complete Production Part Approval Process (PPAP) workflow MVP, transforming the existing placeholder PPAP module into a fully functional OEM-to-Supplier approval workflow. OEM users can create PPAP requests with configurable document checklists, assign suppliers, review individual documents, and approve/reject/request revision on packages. Supplier users can view assigned requests, upload required documents, and submit complete PPAP packages.

---

## PPAP Workflow

### Data Model

- **New enums**: `PpapReasonForSubmission` (NEW_PART, ENGINEERING_CHANGE, SUPPLIER_CHANGE, PROCESS_CHANGE, TOOLING_CHANGE, ANNUAL_REVALIDATION, CORRECTIVE_ACTION_FOLLOW_UP, OTHER), `PpapDocumentStatus` (MISSING, UPLOADED, UNDER_REVIEW, APPROVED, REJECTED, REVISION_REQUIRED)
- **Extended `PpapStatus`**: Added REQUESTED, SUPPLIER_IN_PROGRESS, REVISION_REQUIRED, CANCELLED, EXPIRED
- **Extended `PpapLevel`**: Added LEVEL_5
- **Extended `PpapSubmissionRequirement`**: Added CUSTOMER_SPECIFIC_REQUIREMENTS
- **Extended `DefectEventType`**: Added PPAP_REVISION_REQUESTED, PPAP_CANCELLED, PPAP_DOCUMENT_UPLOADED, PPAP_DOCUMENT_APPROVED, PPAP_DOCUMENT_REJECTED, PPAP_DOCUMENT_REVISION_REQUESTED
- **New fields on `PpapSubmission`**: `requestNumber` (unique), `projectName`, `vehicleModel`, `revisionLevel`, `drawingNumber`, `reasonForSubmission`, `reviewedAt`, `reviewedById`
- **New fields on `PpapEvidence`**: `status` (PpapDocumentStatus, default MISSING), `supplierComment`, `oemComment`, `reviewedById`, `reviewedAt`, `updatedAt`; made `storageKey`, `fileName`, `mimeType`, `sizeBytes`, `uploadedById` nullable to support empty checklist states
- **New indexes**: `ppap_submissions_request_number_key`, `ppap_submissions(reviewed_by_id)`, `ppap_evidence(ppap_id, status)`, `ppap_evidence(reviewed_by_id)`

### OEM PPAP Request Creation

- New page `/quality/oem/ppap/new` with form for creating PPAP requests
- Fields: supplier, part number, part name, project name, vehicle model, revision level, drawing number, PPAP level, reason for submission, due date, notes, and required document checklist
- Default checklist generated based on PPAP level (Level 1 → PSW + design records; Level 2 → + process flow; Level 3 → full major elements; Level 4 → all but customer engineering + samples; Level 5 → all)
- OEM can toggle individual checklist items on/off
- Creates `PpapSubmission` in REQUESTED status + creates `PpapEvidence` records for each required document
- Sends notifications to assigned supplier users
- Feature-gated: PPAP requires Pro or Enterprise plan for OEM users

### OEM PPAP List & Detail

- **List page** (`/quality/oem/ppap`): Enhanced with request number, document completion summary (approved/total), and due date columns
- **Detail page** (`/quality/oem/ppap/[id]`): Shows full request details, document checklist with per-document status, OEM review actions, review comments, and activity timeline
- **Document review actions**: OEM can approve, reject, or request revision on individual documents
- **Final PPAP actions**: Approve PPAP (required: no missing/rejected documents), Reject PPAP (with reason), Request Revision (with reason), Cancel PPAP (only for DRAFT/REQUESTED/SUPPLIER_IN_PROGRESS states)
- Status transitions: REQUESTED → SUPPLIER_IN_PROGRESS → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED/REVISION_REQUIRED

### Supplier PPAP Flow

- **List page** (`/quality/supplier/ppap`): Shows only assigned PPAP requests with document completion stats
- **Detail page** (`/quality/supplier/ppap/[id]`): View request details, document checklist, upload documents per requirement, add supplier comments, submit PPAP package when all required documents are uploaded
- **Document upload**: Presigned URL flow via `/api/ppap/upload` — client gets presigned PUT URL, uploads directly to MinIO/R2, then updates evidence record
- **Package submission**: Validates all required documents are uploaded before allowing submission
- Supplier access does NOT require a paid plan (participant access per feature gate `supplierAccess: true`)

### PPAP Status Tracking

| Status | Description |
|--------|-------------|
| DRAFT | Initial creation (legacy status, new PPAPs start as REQUESTED) |
| REQUESTED | OEM has created the request, awaiting supplier action |
| SUPPLIER_IN_PROGRESS | Supplier has started uploading documents |
| SUBMITTED | Supplier has submitted the complete package |
| UNDER_REVIEW | OEM is reviewing documents |
| REVISION_REQUIRED | OEM has requested changes |
| APPROVED | PPAP fully approved |
| REJECTED | PPAP rejected with reason |
| CANCELLED | OEM cancelled the request |
| EXPIRED | Request expired without action |

### Document Status Tracking

| Status | Description |
|--------|-------------|
| MISSING | Required document not yet uploaded |
| UPLOADED | Supplier has uploaded the document |
| UNDER_REVIEW | OEM is reviewing the document |
| APPROVED | OEM has approved the document |
| REJECTED | OEM has rejected the document |
| REVISION_REQUIRED | OEM has requested a new version |

### File Upload Integration

- New API route `/api/ppap/upload` with POST (presigned URL generation) and PUT (evidence record update) methods
- Files stored in MinIO/R2 under `ppap/{companyId}/{ppapId}/{requirementId}/{uuid}.{ext}` key pattern
- Presigned URLs with 5-minute expiry
- Tenant isolation enforced: upload and download verify company membership

### Plan Gating

- PPAP feature remains PRO+ for OEM users (as before)
- Supplier users can access assigned PPAP requests regardless of their plan
- Free OEM users see locked PPAP in sidebar and are redirected when accessing PPAP pages
- Backend enforcement in all server actions: `requireFeature(session, "PPAP")` check

### Security

- All OEM PPAP server actions verify `session.user.companyType === "OEM"` and appropriate role
- All supplier PPAP server actions verify `session.user.companyType === "SUPPLIER"` and appropriate role
- All queries scoped to `companyId` — no cross-tenant data access
- Supplier actions verify `supplierId === session.user.companyId` before allowing access
- PPAP review/approve/reject actions verify `ppap.oemId === session.user.companyId`
- Document upload verifies PPAP assignment before allowing file operations

### Seed Data

- Updated existing PPAP submissions with `requestNumber`, `reasonForSubmission`, `projectName`, `vehicleModel` fields
- Added `ppap-004` for Enterprise OEM with LEVEL_4 and UNDER_REVIEW status
- Added 32 PPAP Evidence records across all 4 submissions with mixed statuses (MISSING, UPLOADED, APPROVED, REVISION_REQUIRED)
- Added 8 PPAP Events tracking creation and submission milestones

### Default Document Checklist

| Level | Required Documents |
|-------|-------------------|
| Level 1 | Part Submission Warrant, Design Records |
| Level 2 | + Process Flow Diagram |
| Level 3 | + Process FMEA, Control Plan, MSA, Dimensional Results, Material/Performance Results, Initial Process Study, Qualified Lab Docs |
| Level 4 | All except Customer Engineering Approval, Sample Production Parts |
| Level 5 | All 18 requirements |

---

## Known Limitations

- Advanced PPAP templates (custom requirement sets per customer) — deferred
- Multi-stage approval routing (multi-level sign-off) — deferred
- Digital signatures (e-signature) — deferred
- PPAP PDF package export — deferred
- AI PPAP review — deferred
- Full APQP program management — deferred
- ERP integration — deferred
- Supplier scorecard — deferred

---

## Migration

- **Migration**: `20260502080000_add_ppap_workflow_v220`
- Adds new enums, extends existing enums, adds columns to `ppap_submissions` and `ppap_evidence` tables
- Backwards compatible: existing PPAP data preserved, new columns have defaults
- `requestNumber` populated for existing rows with `PPAP-{id}` pattern
- Existing `PpapEvidence` records with `storageKey` values updated to `UPLOADED` status

---

# PlantQuality v2.1.0 — Release Notes

## Upgrade Request Workflow & Server Action Refresh Consistency

**Release Date:** 2026-05-01  
**Version:** 2.1.0

---

## Summary

PlantQuality v2.1.0 adds an Upgrade Request workflow so locked feature interest becomes a trackable sales/admin signal, and fixes global server-action refresh consistency so UI updates immediately after mutations. Specifically, Field Defect status/action changes now update the UI without a manual browser refresh.

---

## Upgrade Request Workflow

### Data Model

- New `UpgradeRequest` model with status lifecycle: OPEN → CONTACTED → APPROVED → REJECTED → CLOSED
- Fields: `id`, `companyId`, `requestedById`, `currentPlan`, `requestedPlan`, `sourceFeature`, `message`, `status`, `adminNote`, `resolvedAt`, `resolvedById`, `createdAt`, `updatedAt`
- New `UpgradeRequestStatus` enum: OPEN, CONTACTED, APPROVED, REJECTED, CLOSED
- Indexes on `companyId+status`, `companyId+createdAt`, `requestedById`, `requestedPlan`

### Server Actions

- `createUpgradeRequest`: OEM users can request Pro or Enterprise upgrade; duplicate OPEN requests for same plan+feature return existing request
- `listUpgradeRequestsForCompany`: OEM users can view their company's requests
- `updateUpgradeRequestStatus`: OEM Admin can manage request status with valid transition enforcement
- Security: Only OEM users can create; only OEM Admin can manage; companyId from session (never client-provided); approval does NOT automatically change plan

### UI Changes

- **Plan & Usage page** (`/oem/settings/plan`): Added "Request Pro" / "Request Enterprise" buttons; displays upgrade request history with expandable details and status actions; shows duplicate detection friendly message
- **UpgradeCTA**: Replaced static `<a>` link with `UpgradeRequestDialog` to create upgrade requests directly from locked feature cards
- **LockedFeatureCard**: Replaced static `<a>` link with `UpgradeRequestDialog` for in-context upgrade requests
- **UpgradeRequestDialog**: New client component with plan selection, optional message, and success/duplicate states
- All upgrade request UI shows: "Billing integration is not enabled yet. Approval does not automatically change your plan."

### Supplier Access

- Supplier users cannot access `/oem/settings/plan`
- Supplier users see static "not available for supplier accounts" message in `UpgradeCTA` and `LockedFeatureCard`
- No upgrade request creation or management for supplier users

---

## Server Action Refresh Consistency

### Bug Fix: Field Defect Status/Action Updates

On Field Defect detail pages (`/quality/oem/field/[id]`), status changes, supplier assignments, SLA updates, and escalation actions now update the UI immediately without requiring a manual browser refresh.

### Root Cause

- `change-status-form.tsx`: `startTransition` was wrapping the async function call but `router.refresh()` was called after `startTransition` completed, causing a race condition
- `escalate-button.tsx`: Used `router.replace(window.location.pathname + window.location.search)` instead of `router.refresh()`
- `sla-update-form.tsx`: Same `router.replace()` pattern as escalate button
- `convert-to-8d-button.tsx`: Redundant `router.refresh()` after `router.push()` to different page

### Fixes Applied

| Component | Before | After |
|-----------|--------|-------|
| `change-status-form.tsx` | `router.refresh()` outside `startTransition` | `router.refresh()` inside `startTransition` callback |
| `escalate-button.tsx` | `router.replace(window.location.pathname + window.location.search)` | `router.refresh()` |
| `sla-update-form.tsx` | `router.replace(window.location.pathname + window.location.search)` | `router.refresh()` |
| `convert-to-8d-button.tsx` | `router.push()` + `router.refresh()` | `router.push()` only (refresh redundant after navigation) |

### Broader Revalidation Fixes

| Action | Missing Revalidation | Fix |
|--------|---------------------|-----|
| `saveEightDStep` | OEM detail, supplier detail | Added `/quality/oem/defects/${defectId}` and `/quality/supplier/defects/${defectId}` |
| `addReviewComment` | Supplier detail | Added `/quality/supplier/defects/${defectId}` |
| `approveReport` | Supplier detail | Added `/quality/supplier/defects/${defectId}` |
| `rejectReport` | Supplier detail | Added `/quality/supplier/defects/${defectId}` |
| `createDefect` | Supplier list, dashboards | Added `/quality/supplier/defects`, `/quality/oem`, `/quality/supplier` |

---

## Database Changes

| Change | Detail |
|--------|--------|
| New enum: `UpgradeRequestStatus` | OPEN, CONTACTED, APPROVED, REJECTED, CLOSED |
| New model: `upgrade_requests` | Tracks upgrade requests per company with lifecycle status |
| New indexes | `companyId+status`, `companyId+createdAt`, `requestedById`, `requestedPlan` |
| New relations | `Company.upgradeRequests`, `User.createdUpgradeRequests`, `User.resolvedUpgradeRequests` |
| Migration | `20260501080000_add_upgrade_requests` |

---

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `prisma/migrations/20260501080000_add_upgrade_requests/migration.sql` | Database migration for UpgradeRequest model |
| `src/app/(dashboard)/_actions/upgrade-requests.ts` | Server actions for upgrade request CRUD |
| `src/app/(dashboard)/oem/settings/plan/upgrade-request-form.tsx` | Client component for creating upgrade requests |
| `src/app/(dashboard)/oem/settings/plan/upgrade-request-list.tsx` | Client component for managing upgrade requests (Admin) |
| `src/components/billing/UpgradeRequestDialog.tsx` | Reusable dialog for upgrade requests from locked features |

### Modified Files

| File | Change |
|------|--------|
| `package.json` | Version → 2.1.0 |
| `prisma/schema.prisma` | Added `UpgradeRequestStatus` enum, `UpgradeRequest` model, relations |
| `src/app/(dashboard)/oem/settings/plan/page.tsx` | Added upgrade request form and list |
| `src/components/billing/UpgradeCTA.tsx` | Replaced static link with `UpgradeRequestDialog` |
| `src/components/billing/LockedFeatureCard.tsx` | Replaced static link with `UpgradeRequestDialog` |
| `src/app/(dashboard)/quality/oem/field/[id]/change-status-form.tsx` | Moved `router.refresh()` inside `startTransition` |
| `src/app/(dashboard)/quality/oem/field/[id]/escalate-button.tsx` | Changed `router.replace()` to `router.refresh()` |
| `src/app/(dashboard)/quality/oem/field/[id]/sla-update-form.tsx` | Changed `router.replace()` to `router.refresh()` |
| `src/app/(dashboard)/quality/oem/field/[id]/convert-to-8d-button.tsx` | Removed redundant `router.refresh()` |
| `src/app/(dashboard)/quality/supplier/defects/actions/8d.ts` | Added OEM/supplier detail revalidation to `saveEightDStep` |
| `src/app/(dashboard)/quality/oem/defects/actions/review.ts` | Added supplier detail revalidation to `addReviewComment`, `approveReport`, `rejectReport` |
| `src/app/(dashboard)/quality/oem/defects/actions.ts` | Added supplier list and dashboard revalidation to `createDefect` |

---

## Security

- Upgrade requests are scoped to `session.user.companyId` — no cross-tenant access
- Supplier users cannot create or manage upgrade requests (server-enforced)
- Supplier users cannot access `/oem/settings/plan` (server redirect)
- `companyId` is never trusted from client — always derived from session
- OEM non-admin users can create requests but cannot manage request status transitions
- Approval does NOT automatically change the company plan — it is only a status change
- Valid status transitions enforced server-side (OPEN→CONTACTED/APPROVED/REJECTED/CLOSED, CONTACTED→APPROVED/REJECTED/CLOSED, APPROVED/REJECTED→CLOSED)
- Duplicate detection prevents spam: same company + plan + feature + OPEN status returns existing request

---

## No Changes

- No real payment/billing integration
- No Stripe integration
- No invoice management
- No automatic plan upgrade on approval
- No SSO implementation
- No ERP integration
- No landing page changes
- No plan gating loosening
- No tenant isolation changes

---

# PlantQuality v2.0.5 — Release Notes

## Field Defect Action Bugfixes

**Release Date:** 2026-04-30  
**Version:** 2.0.5

---

## Summary

PlantQuality v2.0.5 fixes two bugs found during v2.0.4 review: unchecked boolean checkboxes in the Field Defect edit form were not persisted as `false`, and three server action call sites could leave the UI in a pending state on thrown exceptions. No new product features were added.

---

## Changes

### Checkbox Persistence Fix

- **`updateFieldDefect`**: Boolean fields `safetyImpact`, `vehicleDown`, and `repeatIssue` are now always set in the update data object. Previously, an `if (value !== null)` guard prevented unchecked checkboxes from being saved as `false`, because HTML forms omit unchecked checkbox values from `FormData`. The fix unconditionally sets `data.safetyImpact = safetyImpact === "on"`, so unchecked → `false` persists correctly.

### Server Action Error Handling

- **`change-status-form.tsx`**: Wrapped `changeFieldDefectStatus` call in try/catch. On thrown exception, `error` state is set to a user-facing message and `isPending` resets normally.
- **`convert-to-8d-button.tsx`**: Wrapped `convertTo8D` call in try/catch. On thrown exception, `error` state is set and the dialog stays open with the error message. `isPending` resets normally.
- **`assign-supplier-form.tsx`**: Wrapped `assignSupplier` call in try/catch. On thrown exception, `error` state is set and `isPending` resets normally.

### No Changes

- No new product features
- No plan gating logic changes
- No billing or payment changes
- No database schema changes
- No landing page changes

---

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Version → 2.0.5 |
| `src/app/(dashboard)/field/actions.ts` | Boolean fields always set in `updateFieldDefect` data; removed `!== null` guards for `safetyImpact`, `vehicleDown`, `repeatIssue` |
| `src/app/(dashboard)/quality/oem/field/[id]/change-status-form.tsx` | try/catch around `changeFieldDefectStatus` |
| `src/app/(dashboard)/quality/oem/field/[id]/convert-to-8d-button.tsx` | try/catch around `convertTo8D` |
| `src/app/(dashboard)/quality/oem/field/[id]/assign-supplier-form.tsx` | try/catch around `assignSupplier` |
| `RELEASE_NOTES.md` | v2.0.5 section |

---

# PlantQuality v2.0.4 — Release Notes

## Plan QA Polish & Medium Issue Cleanup

**Release Date:** 2026-04-30  
**Version:** 2.0.4

---

## Summary

PlantQuality v2.0.4 is a polish patch that fixes two medium display issues deferred from the v2.0.3 review, improves Plan & Usage page display for blocked features and feature labels, updates seed documentation, and adds a v2.0.4 QA supplement. No billing, payment, or plan gating logic changes were made.

---

## Changes

### Plan & Usage Display Fixes

- **Blocked feature usage rows**: When a feature limit is 0 (not available at current plan), the usage row now shows an em dash (`—`) instead of `0 / —` with a misleading red progress bar. This eliminates confusion for FREE plan users who saw false "over limit" indicators.
- **Feature access labels**: Locked features in the Feature Access matrix now show formatted plan labels ("Pro", "Enterprise") instead of raw enum keys ("PRO", "ENTERPRISE").
- **Storage label**: Simplified from "Storage (MB)" to "Storage" for cleaner display.

### Seed Documentation

- Seed console message updated from "v2.0.3" to "v2.0.4".
- Login dropdown labels for SteelForged accounts clarified: now show "(Supplier Admin — SteelForged)" and "(Supplier QE — SteelForged)" instead of just "(SteelForged)".

### Documentation

- New `docs/qa/v2.0.4-plan-qa-polish.md` — QA supplement with v2.0.4-specific regression tests, updated test account reference, and medium issue verification checklist.

### No Changes

- No billing, Stripe, or payment integration
- No plan gating logic changes
- No usage limit logic changes
- No core product feature changes
- No landing page changes
- No app redesign
- No database schema changes

---

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Version → 2.0.4 |
| `src/app/(dashboard)/oem/settings/plan/page.tsx` | Blocked feature rows show "—" instead of "0 / —"; Feature access labels use `PLAN_LABELS` instead of raw enum; Storage label simplified |
| `src/app/(auth)/login/page.tsx` | SteelForged login labels clarified with role and company |
| `prisma/seed.ts` | Console message updated to v2.0.4 |
| `docs/qa/v2.0.4-plan-qa-polish.md` | New QA supplement for v2.0.4 |
| `RELEASE_NOTES.md` | v2.0.4 section |

---

# PlantQuality v2.0.3 — Release Notes

## Plan Gating QA Seed Data & Demo Personas

**Release Date:** 2026-04-29  
**Version:** 2.0.3

---

## Summary

PlantQuality v2.0.3 adds QA/demo seed data support for plan gating validation. It introduces Free, Pro, and Enterprise OEM test companies with matching users, demo records, and usage counters so every plan behavior can be manually tested. It also fixes a security gap where Free OEM users could access Pro-gated page reads via direct URL navigation.

---

## Changes

### Seed Data

- **OEM Free company** (`TestFree OEM Corp`, plan: `FREE`) with admin user
- **OEM Pro company** (`PlantX Automotive`, plan: `PRO`, updated from existing) with admin and QE users
- **OEM Enterprise company** (`Enterprise Motors Group`, plan: `ENTERPRISE`) with admin user
- **Supplier companies** preserved (FREE plan, unchanged)
- **Demo records** per plan tier: defects, field defects, 8D reports
- **Usage counters** seeded for all companies with representative usage values

### New Test Accounts

| Email | Company | Plan | Role | Purpose |
|-------|---------|------|------|---------|
| `admin-free@oem.com` | TestFree OEM Corp | FREE | Admin | Verify free limits and locked features |
| `admin-pro@oem.com` | PlantX Automotive | PRO | Admin | Verify Pro features and AI access |
| `qe-pro@oem.com` | PlantX Automotive | PRO | QE | Verify plan inheritance, non-admin role |
| `admin-enterprise@oem.com` | Enterprise Motors Group | ENTERPRISE | Admin | Verify Enterprise-only AI features |

Legacy accounts preserved: `admin@oem.com`, `quality@oem.com`, and all supplier accounts.

### Security Fixes

- **PPAP page**: Added `requireFeature(session, "PPAP")` — Free OEM users can no longer read PPAP data via direct URL
- **IQC page**: Added `requireFeature(session, "IQC")` — Free OEM users can no longer read IQC data via direct URL
- **FMEA page**: Added `requireFeature(session, "FMEA")` — Free OEM users can no longer read FMEA data via direct URL
- **War Room page**: Added `requireFeature(session, "WAR_ROOM")` — Free OEM users can no longer read War Room data via direct URL
- **Escalations page**: Added `requireFeature(session, "ESCALATION")` — Free OEM users can no longer read Escalation data via direct URL

Previously, these pages only gated sidebar navigation (client-side) and mutations (server actions), leaving the read surface exposed. Now all five pages enforce the plan gate server-side.

### Login Page Updates

- Added new plan-specific test accounts to the dev login dropdown
- Default dev login changed to `admin-free@oem.com` for easier Free plan testing

### Documentation

- `docs/qa/v2.0.3-plan-gating-manual-qa.md` — Manual QA checklist with 50+ test cases across Free, Pro, Enterprise, and Supplier personas

### No Changes

- No billing, Stripe, or payment integration
- No plan gating strategy changes
- No feature gate logic changes
- No landing page changes
- No app redesign

---

## Files Changed

| File | Change |
|------|--------|
| `prisma/seed.ts` | Added Free/Enterprise OEM companies, plan-specific users, demo records, 8D reports, usage counters |
| `package.json` | Version → 2.0.3 |
| `src/app/(auth)/login/page.tsx` | Added plan-specific test accounts to dropdown; default email updated |
| `src/app/(dashboard)/quality/oem/ppap/page.tsx` | Added `requireFeature("PPAP")` server-side gate |
| `src/app/(dashboard)/quality/oem/iqc/page.tsx` | Added `requireFeature("IQC")` server-side gate |
| `src/app/(dashboard)/quality/oem/fmea/page.tsx` | Added `requireFeature("FMEA")` server-side gate |
| `src/app/(dashboard)/quality/oem/war-room/page.tsx` | Added `requireFeature("WAR_ROOM")` server-side gate |
| `src/app/(dashboard)/quality/oem/escalations/page.tsx` | Added `requireFeature("ESCALATION")` server-side gate |
| `docs/qa/v2.0.3-plan-gating-manual-qa.md` | New manual QA checklist |

---

# PlantQuality v2.0.2 — Release Notes

## Plan Usage Release Polish

**Release Date:** 2026-04-29  
**Version:** 2.0.2

---

## Summary

PlantQuality v2.0.2 completes the Plan & Usage release polish by bumping the package version and expanding the upgrade placeholder copy across all upgrade-facing components. No billing, payment, or plan gating logic changes were made.

---

## Changes

### Version bump
- `package.json` version bumped from 2.0.1 to 2.0.2
- `package-lock.json` synced

### Upgrade placeholder copy
- **Plan & Usage page** (`/oem/settings/plan`): Full copy — "Billing integration is not enabled yet. Please contact PlantX sales or your system administrator to upgrade. Enterprise plans are handled by custom quote."
- **UpgradeCTA component**: Pro target — "This feature requires a Pro plan or higher. Billing integration is not enabled yet — please contact PlantX sales or your system administrator to upgrade." Enterprise target — "Enterprise plans are handled by custom quote. Please contact PlantX sales or your system administrator."
- **LockedFeatureCard component**: Added "Billing integration is not enabled yet. Please contact PlantX sales or your system administrator to upgrade."

### No changes
- No billing, Stripe, or payment integration
- No plan gating logic changes
- No usage limit logic changes
- No landing page changes
- No app redesign

---

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Version → 2.0.2 |
| `package-lock.json` | Lockfile metadata synced |
| `src/components/billing/UpgradeCTA.tsx` | Expanded Pro and Enterprise upgrade messages |
| `src/components/billing/LockedFeatureCard.tsx` | Added billing placeholder note |

---

# PlantQuality v2.0.1 — Release Notes

## Plan & Usage Route & Navigation Polish

**Release Date:** 2026-04-29  
**Version:** 2.0.1

---

## Summary

PlantQuality v2.0.1 polishes the Plan & Usage route and navigation for discoverability. The canonical route is now `/oem/settings/plan` (matching the OEM route convention). A sidebar footer entry exposes Plan & Usage to OEM admins only. The legacy route `/quality/oem/settings/plan` redirects to the new canonical route. No plan gating logic, usage limits, or billing changes were made.

---

## Changes

### Route consistency
- Canonical Plan & Usage route: `/oem/settings/plan`
- Legacy route `/quality/oem/settings/plan` redirects to `/oem/settings/plan`
- All internal links (`UpgradeCTA`, `LockedFeatureCard`) updated to `/oem/settings/plan`

### Sidebar navigation
- Plan & Usage moved from main module nav list to sidebar footer (below user info, above Sign Out)
- Only visible to OEM Admin users
- Not shown to supplier users or non-admin OEM users
- Uses `CreditCardIcon`, links to `/oem/settings/plan`

### Label consistency
- Page title updated from "Plan & Billing" to "Plan & Usage" to match nav label
- Metadata title updated accordingly

### Access control (preserved, not changed)
- OEM Admin can access `/oem/settings/plan`
- Supplier cannot access `/oem/settings/plan` (server-side redirect to `/login`)
- Supplier cannot see Plan & Usage link (no `planNavItem` passed)
- Direct URL access remains protected server-side

---

## No Changes

- Plan gating logic
- Usage limit logic
- Stripe or billing integration
- Sidebar main module items
- Landing page

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/(dashboard)/oem/settings/plan/page.tsx` | Title "Plan & Billing" → "Plan & Usage" |
| `src/app/(dashboard)/quality/oem/settings/plan/page.tsx` | Redirect preserved; title updated |
| `src/app/(dashboard)/layout.tsx` | Plan & Usage removed from navItems; passed as `planNavItem` prop for OEM admins only |
| `src/components/layout/Sidebar.tsx` | Added `planNavItem` prop; renders in footer area before ThemeToggle |
| `src/components/billing/UpgradeCTA.tsx` | Already pointed to `/oem/settings/plan` (unchanged from v2.0.0) |
| `src/components/billing/LockedFeatureCard.tsx` | Already pointed to `/oem/settings/plan` (unchanged from v2.0.0) |

---

# PlantQuality v2.0.0 — Release Notes

## Plan Gating, Packaging & Usage Limits

**Release Date:** 2026-04-28  
**Version:** 2.0.0

---

## Summary

PlantQuality v2.0.0 introduces plan gating, packaging, and usage limits to support Free, Pro, and Enterprise plans. This release productizes and monetizes the quality management platform by implementing a central feature gate system, usage limit tracking, plan badge display, upgrade CTAs, and an admin plan/settings page. No payment processing, Stripe integration, or billing workflows are included — those are deferred to v2.1.0+.

**Core promise:** "Every feature is now gated by plan. Free = adoption. Pro = operations. Enterprise = intelligence, control, integration."

---

## Plan Definitions

| Plan | Purpose |
|------|---------|
| **Free** | Trial and adoption. Users experience enough value to understand the platform, then hit natural limits. |
| **Pro** | Active quality operations. Full operational loop for OEM quality teams. |
| **Enterprise** | Intelligence, control, integration, and scale for large OEMs. |

Supplier Portal remains **free for supplier-side users** — access is controlled by OEM relationship and assignment.

---

## Feature Matrix

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Dashboard | Basic | Full | Full |
| Defects | Limited (25/mo) | Full | Full |
| Field Quality | Limited (10/mo) | Full | Full |
| 8D | Basic | Full | Full + AI Review |
| Supplier Portal | View-only (assigned) | Full | Full |
| PPAP | — | Basic | Advanced |
| IQC | — | Basic | Advanced |
| FMEA | — | Basic | Advanced |
| SLA Tracking | — | Full | Full |
| Escalation | — | Full | Full |
| War Room | — | Basic | Advanced |
| Notifications | Basic | Full | Full + Email |
| Similar Issues | — | Full | Full |
| AI Classification | — | Full (w/ limit) | Full (w/ higher limit) |
| Category Intelligence | — | Full | Full |
| Quality Intelligence | — | Full | Full |
| AI 8D Review | — | — | Full |
| Root Cause Suggestion | — | — | Full |
| API Access | — | — | Full |
| Webhooks | — | — | Full |
| SSO | — | — | Full (gate only) |
| Multi-Plant | — | — | Full |
| Advanced Audit Log | — | — | Full |
| Email Notifications | — | — | Full (gate only) |
| Supplier Scorecard | — | — | Full |

---

## Usage Limits

| Limit | Free | Pro | Enterprise |
|-------|------|-----|------------|
| Monthly Defects | 25 | Unlimited | Unlimited |
| Monthly Field Defects | 10 | Unlimited | Unlimited |
| Suppliers | 3 | 25 | Unlimited |
| Users | 3 | 30 | Unlimited |
| Storage | 1 GB | 200 GB | Custom |
| AI Classification Runs | 0 | 2,000/mo | Unlimited |
| AI 8D Review Runs | 0 | 0 | Unlimited |
| Similar Issue Searches | 0 | 2,500/mo | Unlimited |
| War Room Items | 0 | 50 | Unlimited |
| PPAP Packages | 0 | 25 | Unlimited |
| IQC Inspections | 0 | Unlimited | Unlimited |
| FMEA Records | 0 | 50 | Unlimited |

---

## New Features

### Central Feature Gate System

- `src/lib/billing/plans.ts` — Plan definitions, limits, normalization, badge config
- `src/lib/billing/features.ts` — Feature matrix with 24 feature keys, access checking
- `src/lib/billing/usage.ts` — Usage counter service with monthly and cumulative tracking
- `src/lib/billing/guards.ts` — Server-side `requireFeature()` guard for actions/routes
- `src/lib/billing/index.ts` — Barrel export

All plan checks flow through `checkFeatureAccess(plan, companyType, featureKey)`. No scattered plan name comparisons.

### Usage Limit Tracking

- New `usage_counters` database table with monthly and cumulative tracking
- `canConsumeUsage()`, `consumeUsage()`, `getUsageLimitStatus()` service functions
- Monthly counters auto-rotate (start/end of month)
- Enterprise plans use `null` limits for unlimited (no infinity/overflow)

### Plan Badge

- `PlanBadge` component with Free/Pro/Enterprise styling
- Shows in sidebar user section
- Semantic colors: muted (Free), amber (Pro), emerald (Enterprise)

### Upgrade CTA

- `UpgradeCTA` component — neutral B2B-style upgrade prompt
- `LockedFeatureCard` component — disabled feature card with upgrade link
- Links to admin plan/settings page

### Admin Plan/Settings Page

- `/oem/settings/plan` — full plan overview (canonical route)
- Current plan badge, status, dates
- Usage summary with visual progress bars (green/amber/red)
- Feature access matrix with enabled/disabled indicators
- Upgrade CTA placeholder ("Billing integration is not enabled yet")

### Sidebar Gating

- Locked nav items shown as dimmed with lock icon
- Supplier-only features hidden for OEM and vice versa
- Plan badge replaces raw plan text in user section

---

## Database Changes

| Change | Detail |
|--------|--------|
| `Plan` enum | Added `FREE`, `ENTERPRISE` values (kept `BASIC` for backward compat) |
| `companies.plan` | New column with `DEFAULT 'FREE'`; existing OEM companies set to `PRO` |
| `companies.plan_status` | New nullable text column for ACTIVE/TRIALING/PAST_DUE/CANCELED |
| `companies.plan_started_at` | New nullable DateTime column |
| `companies.trial_ends_at` | New nullable DateTime column |
| New model: `usage_counters` | Tracks usage per company/key/period with count |

---

## Server-Side Enforcement

All gated features now enforce plan requirements on the backend:

| Feature | Enforcement |
|---------|-------------|
| AI Classification (legacy `/api/ai/*`) | `requireFeature("AI_CLASSIFICATION")` |
| AI Vision | `requireFeature("AI_CLASSIFICATION")` |
| AI FMEA Suggest | `requireFeature("FMEA")` |
| AI Refine Text | `requireFeature("EIGHT_D")` |
| AI Suggest Diagram | `requireFeature("AI_CLASSIFICATION")` |
| AI Classify Field Defect | `requireFeature("AI_CLASSIFICATION")` |
| Similar Issues Field Search | `requireFeature("SIMILAR_ISSUES")` |
| AI 8D Review Generate | `requireFeature("AI_8D_REVIEW")` — Enterprise only |
| AI 8D Review Mark Reviewed | `requireFeature("AI_8D_REVIEW")` — Enterprise only |
| AI 8D Review Reject | `requireFeature("AI_8D_REVIEW")` — Enterprise only |
| Root Cause Suggestion | `requireFeature("ROOT_CAUSE_SUGGESTION")` — Enterprise only |

---

## Auth Changes

- Session `plan` now reads from `company.plan` (authoritative) with fallback to `user.plan` (legacy)
- `normalizePlan()` maps `BASIC` → `FREE` for backward compatibility

---

## Seed Changes

- OEM company seeded with `plan: "PRO"`
- Supplier companies seeded with `plan: "FREE"`

---

## Supplier Portal Behavior

- Suppliers access assigned records regardless of being on "Free"
- Supplier-specific nav items remain visible (Defects, Field Quality, PPAP, IQC, FMEA)
- Suppliers blocked from: AI Classification, Similar Issues, Quality Intelligence, War Room, AI 8D Review, Root Cause
- No forced payment for suppliers in v2.0.0

---

## Breaking Changes

- AI 8D Review and Root Cause Suggestion now require **Enterprise** plan (previously PRO)
- Existing inline `plan !== "PRO"` checks replaced with central feature gates

---

## Known Limitations

- No payment processing or Stripe integration
- No invoice management
- No ERP integration
- No SSO implementation (gate placeholder only)
- No advanced billing (prorating, mid-cycle upgrades)
- No custom contract workflows
- No automated plan provisioning
- Usage limits are enforced on the backend but not yet consumed/incremented for all actions (defect creation, field defect creation)
- Enterprise-only features (AI 8D Review, Root Cause) previously worked on PRO — now gated to Enterprise

---

## Deferred

| Feature | Target |
|---------|--------|
| Stripe/payment integration | v2.1.0+ |
| Invoice management | v2.1.0+ |
| ERP integration | v2.1.0+ |
| SSO implementation | v2.1.0+ |
| Advanced billing | v2.1.0+ |
| Custom contract workflows | v2.1.0+ |
| Usage consumption on defect/field creation | v2.0.1 |
| Storage usage tracking | v2.0.1 |

---

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `src/lib/billing/index.ts` | Barrel export for billing module |
| `src/lib/billing/plans.ts` | Plan definitions, limits, normalization |
| `src/lib/billing/features.ts` | Feature matrix and access checking |
| `src/lib/billing/usage.ts` | Usage counter service |
| `src/lib/billing/guards.ts` | Server-side feature guards |
| `src/components/billing/PlanBadge.tsx` | Plan badge UI component |
| `src/components/billing/UpgradeCTA.tsx` | Upgrade call-to-action component |
| `src/components/billing/LockedFeatureCard.tsx` | Locked feature card component |
| `src/app/(dashboard)/oem/settings/plan/page.tsx` | Admin plan/settings page (new canonical route) |
| `src/app/(dashboard)/quality/oem/settings/plan/page.tsx` | Legacy redirect to `/oem/settings/plan` |
| `prisma/migrations/20260428080000_add_plan_gating_and_usage_counters/migration.sql` | Database migration |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added FREE/ENTERPRISE to Plan enum, plan fields to Company, UsageCounter model |
| `src/lib/auth.ts` | Session plan reads from company.plan with user.plan fallback |
| `src/app/(dashboard)/layout.tsx` | Added feature gate keys to OEM nav items |
| `src/components/layout/Sidebar.tsx` | Plan badge, locked nav items, feature gating |
| `src/app/api/ai/suggest/route.ts` | Central feature gate replaces inline plan check |
| `src/app/api/ai/vision/route.ts` | Central feature gate replaces inline plan check |
| `src/app/api/ai/fmea-suggest/route.ts` | Central feature gate replaces inline plan check |
| `src/app/api/ai/refine-text/route.ts` | Central feature gate replaces inline plan check |
| `src/app/api/ai/suggest-diagram/route.ts` | Central feature gate replaces inline plan check |
| `src/app/api/field/[id]/ai/classify/route.ts` | Added AI_CLASSIFICATION feature gate |
| `src/app/api/field/[id]/ai/similar/route.ts` | Added SIMILAR_ISSUES feature gate |
| `src/app/(dashboard)/quality/oem/defects/actions/ai-review.ts` | AI_8D_REVIEW/ROOT_CAUSE feature gates |
| `prisma/seed.ts` | Added plan to company seed data |

---

# PlantQuality v1.9.1 — Release Notes

## AI 8D Review Hardening & QA Patch

**Release Date:** 2026-04-27  
**Version:** 1.9.1

---

## Summary

PlantQuality v1.9.1 is a stabilization patch on top of v1.9.0. It hardens AI 8D Review and Root Cause Suggestion runtime behavior, improves invalid JSON handling from AI providers, adds permission enforcement for review lifecycle actions, polishes deterministic completeness validation, and fixes a client-side state bug in the root cause suggestion panel. **No new major features are introduced.**

---

## Runtime Hardening

| Fix | Description |
|-----|-------------|
| AI provider timeout | Added 60s timeout to OpenAI client via `timeout` option; prevents indefinite hangs |
| Timeout error detection | AI request timeouts return "AI request timed out" instead of generic error |
| Auth error detection | 401/authentication errors from AI provider return "AI service authentication failed" instead of generic error |
| Pre-parse JSON validation | `aiClassify()` validates `JSON.parse(content)` before returning, catching malformed AI responses early |
| Missing AI_API_KEY | No crash when `AI_API_KEY` is empty — `isAiEnabled()` returns false, panel shows disabled state |
| AI_ENABLED=false | No crash — panel shows "AI suggestions are not configured" |

---

## AI JSON Response Validation

| Fix | Description |
|-----|-------------|
| 8D Review full validation | All fields of `Ai8dReviewResult` are now explicitly validated and defaulted: `completeness` sub-object booleans, string arrays (filtered for `typeof === "string"`, capped at 5 items), `reasoningSummary` fallback to `""` |
| Missing completeness sub-object | Previously trusted as-is; now each boolean is safely coerced with `Boolean()` |
| Malformed string arrays | If AI returns non-string items in suggestion arrays, they are now filtered out |
| Root Cause full validation | All fields of `RootCauseSuggestion` are now explicitly validated; `suggestedInvestigationMethods`, `suggestedContainmentActions`, and `reasoning` are no longer trusted as-is |
| Client-side resultJson parsing | `Ai8dReviewPanel` no longer uses unsafe `as Ai8dReviewResult` cast — uses safe `parseReviewResult()` that validates all fields |
| OEM field page parsing | Compact AI review status on linked 8D card now safely extracts `overallScore` and `reviewStatus` with type checks |

---

## Permission Hardening

| Fix | Description |
|-----|-------------|
| Mark as Reviewed requires PRO | `markAi8dReviewAsReviewed` now checks `session.user.plan === "PRO"` (previously any OEM Admin/QE could mark) |
| Reject Review requires PRO | `rejectAi8dReview` now checks `session.user.plan === "PRO"` (previously any OEM Admin/QE could reject) |
| companyId in update where clause | `prisma.ai8dReview.update()` now includes `companyId: session.user.companyId` in `where` clause for defense-in-depth (previously only `id: reviewId`) |
| View helper | New `canViewAiReview()` for read-only actions — only requires OEM companyType, not specific role |
| getAi8dReviews / getLatestAi8dReview | Now use `canViewAiReview()` instead of manual `companyType` check |
| Supplier isolation | Confirmed: no AI 8D review components, actions, or data are accessible to supplier users |

---

## Deterministic Completeness Check

| Fix | Description |
|-----|-------------|
| Safe array access | `validateEightDCompleteness()` no longer uses unsafe `as ContainmentAction[]` type assertions; uses generic `hasTextProperty()` reflection instead |
| Null/malformed JSONB | If `containmentActions`, `d5Actions`, or `d6Actions` are not arrays or contain non-object items, the check now safely returns `false` for that section instead of potentially throwing |
| Removed unused interfaces | `ContainmentAction`, `D5Action`, `D6Action` interfaces removed from `validate-8d-completeness.ts` since they are no longer used |
| No AI dependency | Confirmed: `validateEightDCompleteness()` is a pure function with no LLM calls |

---

## Client-Side Bug Fixes

| Fix | Description |
|-----|-------------|
| Root cause loading state | `rootCausePending` was incorrectly set to `false` inside `startTransition()` callback, which ran synchronously before the async server action resolved. Changed to use `async` function directly, so `setRootCausePending(false)` runs after the server action completes |
| Regenerate review | Clicking "Generate AI Review" or "Regenerate Review" while pending now correctly disables buttons via `isPending` state |

---

## No New Features

- No AI 8D auto-fill
- No automatic 8D approval/rejection
- No supplier-facing AI critique
- No supplier risk scoring
- No warranty cost prediction
- No image AI
- No plan gating changes

---

## Deferred

| Feature | Target |
|---------|--------|
| Plan gating | v2.0 |
| Supplier-facing AI critique | v2.0+ |
| AI 8D auto-fill | v2.0+ |
| Supplier risk scoring | v2.0+ |
| Warranty cost prediction | v2.0+ |
| Image AI | v2.0+ |

---

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Version bumped to 1.9.1 |
| `src/lib/ai/provider.ts` | Added 60s timeout, timeout/auth error detection, pre-parse JSON validation |
| `src/lib/ai/review-8d.ts` | Full field validation with defaults for all Ai8dReviewResult fields |
| `src/lib/ai/root-cause-suggestion.ts` | Full field validation with defaults for all RootCauseSuggestion fields; added `parseRootCauseSuggestion()` export |
| `src/lib/ai/validate-8d-completeness.ts` | Safe array access via `hasTextProperty()`; removed unused type interfaces |
| `src/app/(dashboard)/quality/oem/defects/actions/ai-review.ts` | PRO gate on mark/reject; `companyId` in update where clause; `canViewAiReview()` for reads; simplified `resultJson` serialization |
| `src/components/defects/Ai8dReviewPanel.tsx` | Safe `parseReviewResult()` for resultJson; fixed `rootCausePending` state bug; removed unused `parseRootCauseRaw` |
| `src/app/(dashboard)/quality/oem/field/[id]/page.tsx` | Safe type-checked extraction of `overallScore` and `reviewStatus` from resultJson |
| `RELEASE_NOTES.md` | v1.9.1 section |

---

# PlantQuality v1.9.0 — Release Notes

## AI 8D Review & Root Cause Suggestion

**Release Date:** 2026-04-27  
**Version:** 1.9.0

---

## Summary

PlantQuality v1.9.0 adds AI-assisted quality engineering support for 8D and root cause workflows. OEM quality engineers can now generate AI reviews of supplier-submitted 8D reports, receive root cause suggestions, and benefit from a deterministic completeness check that works without AI configuration. AI reviews are advisory — they never automatically change 8D status, reject supplier responses, or assign fault.

**Core promise:** "Supplier'ın 8D cevabını kalite açısından değerlendir, eksik noktaları göster ve kök neden / aksiyon önerileri üret."

---

## New Features

### AI 8D Review

| Feature | Description |
|---------|-------------|
| AI 8D Review Panel | New panel on OEM defect detail page showing: overall score (0-100), review status (Strong/Needs Improvement/Incomplete/Risky), completeness checklist, weak points, missing items, suggested questions for supplier, suggested root cause angles, suggested containment/corrective/preventive actions, reasoning summary, confidence score |
| Generate AI Review | OEM Admin/QE users can generate AI review for any 8D report (PRO plan required) |
| Mark as Reviewed | OEM user acknowledges they have reviewed the AI suggestion |
| Reject Review | OEM user dismisses the AI review as not useful |
| Regenerate Review | Generate a fresh AI review after previous one is processed |
| Audit Trail | AI review events logged in defect event timeline |
| Multi-review History | Multiple AI reviews stored per 8D report; latest shown by default |

### Root Cause Suggestion

| Feature | Description |
|---------|-------------|
| Collapsible Root Cause Panel | Expandable section within AI 8D Review panel |
| Suggested Root Causes | 3-5 potential root causes ordered by likelihood |
| 5-Why Chain | Automated 5-Why analysis starting from defect symptom |
| Investigation Methods | 3-5 suggested investigation approaches |
| Suggested Containment | Immediate containment action recommendations |
| Regenerate | Refresh root cause suggestions |

### Deterministic 8D Completeness Check

| Feature | Description |
|---------|-------------|
| No-AI Completeness | Works when `AI_ENABLED=false` or AI API key is missing |
| 6-point Checklist | D2 Problem, D3 Containment, D4 Root Cause, D5 Corrective Actions, D6 Verification, D7 Preventive Actions |
| Completeness Percent | Calculated percentage of completed sections |
| Visual Progress Bar | Color-coded progress indicator (green/amber/red) |

### Compact AI Review on Field Defect Detail

| Feature | Description |
|---------|-------------|
| Linked 8D Review Status | When a field defect is linked to an 8D report, the linked 8D card shows compact AI review score and status |

### AI Disabled Fallback

| State | Behavior |
|-------|----------|
| `AI_ENABLED=false` or no API key | AI 8D Review panel shows "AI suggestions are not configured" message |
| Non-PRO plan | Panel shows "AI features require a PRO plan" |
| No 8D report | Panel shows "8D report has not been submitted yet" with deterministic completeness check |

---

## AI 8D Review Output Shape

```json
{
  "overallScore": 72,
  "reviewStatus": "NEEDS_IMPROVEMENT",
  "completeness": {
    "problemDescriptionComplete": true,
    "containmentDefined": true,
    "rootCauseDefined": true,
    "correctiveActionDefined": false,
    "preventiveActionDefined": true,
    "verificationDefined": false
  },
  "weakPoints": ["..."],
  "missingItems": ["..."],
  "suggestedQuestionsForSupplier": ["..."],
  "suggestedRootCauseAngles": ["..."],
  "suggestedContainmentActions": ["..."],
  "suggestedCorrectiveActions": ["..."],
  "suggestedPreventiveActions": ["..."],
  "reasoningSummary": "...",
  "confidence": 75
}
```

---

## Database Changes

| Change | Detail |
|--------|--------|
| New model: `ai_8d_reviews` | Stores AI 8D review results with status tracking (GENERATED/REVIEWED/REJECTED/EXPIRED) |
| New enum: `Ai8dReviewStatus` | GENERATED, REVIEWED, REJECTED, EXPIRED |
| New event types | AI_8D_REVIEW_GENERATED, AI_8D_REVIEW_MARKED_REVIEWED, AI_8D_REVIEW_REJECTED, AI_ROOT_CAUSE_SUGGESTED added to `DefectEventType` |
| New indexes | `(companyId, eightDId)`, `(companyId, status)`, `(companyId, createdAt)`, `(eightDId, status)` |
| User model | Added `createdAi8dReviews`, `reviewedAi8dReviews`, `rejectedAi8dReviews` relations |
| Company model | Added `ai8dReviews` relation |
| EightDReport model | Added `ai8dReviews` relation |

---

## Server Actions

| Action | Location | Description |
|--------|----------|-------------|
| `generateAi8dReview(defectId)` | `ai-review.ts` | Generate AI review for an 8D report (OEM + PRO required) |
| `generateRootCauseSuggestion(defectId)` | `ai-review.ts` | Generate root cause suggestions (OEM + PRO required) |
| `markAi8dReviewAsReviewed(reviewId)` | `ai-review.ts` | Mark AI review as reviewed by OEM user |
| `rejectAi8dReview(reviewId)` | `ai-review.ts` | Reject AI review |
| `getAi8dReviews(eightDId)` | `ai-review.ts` | Get all AI reviews for an 8D report |
| `getLatestAi8dReview(defectId)` | `ai-review.ts` | Get latest AI review for a defect |

---

## AI Service Layer

| File | Purpose |
|------|---------|
| `src/lib/ai/review-8d.ts` | AI 8D review prompt engineering, structured output parsing, validation |
| `src/lib/ai/root-cause-suggestion.ts` | Root cause suggestion prompt engineering, structured output parsing |
| `src/lib/ai/validate-8d-completeness.ts` | Deterministic 8D completeness check (no AI required) |

---

## UI Changes

| Component | Change |
|-----------|--------|
| OEM Defect Detail page | Added `Ai8dReviewPanel` below the 8D report view |
| OEM Field Defect Detail page | Linked 8D card now shows compact AI review score and status |
| Event timeline | New icons/labels for AI_8D_REVIEW_GENERATED, AI_8D_REVIEW_MARKED_REVIEWED, AI_8D_REVIEW_REJECTED, AI_ROOT_CAUSE_SUGGESTED |

---

## New Files

| File | Purpose |
|------|---------|
| `src/lib/ai/review-8d.ts` | AI 8D review service |
| `src/lib/ai/root-cause-suggestion.ts` | Root cause suggestion service |
| `src/lib/ai/validate-8d-completeness.ts` | Deterministic completeness check |
| `src/app/(dashboard)/quality/oem/defects/actions/ai-review.ts` | Server actions for AI 8D review |
| `src/components/defects/Ai8dReviewPanel.tsx` | Client component for AI 8D Review panel |
| `prisma/migrations/20260427080000_add_ai_8d_reviews/migration.sql` | Database migration |

---

## Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `Ai8dReview` model, `Ai8dReviewStatus` enum, new `DefectEventType` values, new relations |
| `package.json` | Version bumped to 1.9.0 |
| `src/lib/event-labels.ts` | Added labels for AI_8D_REVIEW_GENERATED, AI_8D_REVIEW_MARKED_REVIEWED, AI_8D_REVIEW_REJECTED, AI_ROOT_CAUSE_SUGGESTED |
| `src/app/(dashboard)/quality/oem/defects/[id]/page.tsx` | Added AI review data fetching and `Ai8dReviewPanel` rendering |
| `src/app/(dashboard)/quality/oem/field/[id]/page.tsx` | Added compact AI review status on linked 8D card |

---

## Permission Model

| Action | OEM Admin | OEM QE | OEM Viewer | Supplier Admin | Supplier QE |
|--------|-----------|--------|------------|----------------|-------------|
| Generate AI 8D Review | ✅ (PRO) | ✅ (PRO) | ❌ | ❌ | ❌ |
| Generate Root Cause Suggestion | ✅ (PRO) | ✅ (PRO) | ❌ | ❌ | ❌ |
| Mark AI Review as Reviewed | ✅ (PRO) | ✅ (PRO) | ❌ | ❌ | ❌ |
| Reject AI Review | ✅ (PRO) | ✅ (PRO) | ❌ | ❌ | ❌ |
| View Deterministic Completeness | ✅ | ✅ | ✅ | ❌ | ❌ |
| View AI Review Panel | ✅ (PRO) | ✅ (PRO) | Panel hidden | Not shown | Not shown |
| View Compact AI Status on Field Defect | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## Security

- All server actions verify OEM `companyType`, `role` in [ADMIN, QUALITY_ENGINEER], and PRO `plan`
- AI reviews are scoped to `companyId` — cross-tenant access is impossible
- Review ID cannot be guessed to access other tenant's reviews
- AI API key is never exposed to the client
- Supplier users cannot generate, view, or interact with AI 8D reviews in v1.9.0
- AI review never changes 8D status, never auto-rejects, never auto-approves
- AI review never blames supplier automatically

---

## Known Limitations

- AI review requires a configured AI provider (DeepSeek or OpenAI-compatible) and PRO plan
- Deterministic completeness check does not validate evidence attachments
- Root cause suggestions are not persisted in the database (ephemeral, regenerated on demand)
- Similar Issues remains DB-only (unchanged from v1.7+)
- AI review confidence may be low for significantly incomplete 8D reports
- No email notifications for AI review events
- No supplier-facing AI critique in v1.9.0

---

## Deferred

| Feature | Target |
|---------|--------|
| AI-generated 8D (auto-fill) | v2.0+ |
| Supplier-facing AI feedback | v2.0+ (requires careful design) |
| Supplier risk scoring | v2.0+ |
| Warranty cost prediction | v2.0+ |
| Image-based AI analysis | v2.0+ |
| Vector database for semantic search | v2.0+ |
| Predefined category taxonomy | v1.10+ |

---

# PlantQuality v1.8.2 — Release Notes

## Internal App Design System Patch

**Release Date:** 2026-04-27  
**Version:** 1.8.2

---

## Summary

PlantQuality v1.8.2 is an internal app UI/UX design system patch. It improves visual consistency across the internal app using a refined black/white/gray palette, tighter form layouts using shadcn/ui components, better detail page composition, and more consistent badge/card/button patterns. No major product features are added. The public landing page is unchanged.

---

## Badge & Color System

| Area | Before | After |
|------|--------|-------|
| Status badge colors | Flat bg colors (`bg-red-50 text-red-700`, `bg-amber-50 text-amber-700`, etc.) | Semantic alpha-based colors (`bg-destructive/10 text-destructive`, `bg-amber-500/10 text-amber-600`, etc.) |
| Severity badges | Direct Tailwind color pairs with manual dark overrides | Semantic alpha colors with automatic dark mode |
| Escalation badges | Same pattern | Same semantic alpha pattern (`bg-amber-500/10`, `bg-destructive/10`) |
| SLA status badges | Same pattern | Same semantic alpha pattern |
| AI Insight panel badges | Same pattern | Same semantic alpha pattern |
| Source badges | Per-source distinct colors (`bg-blue-50`, `bg-purple-50`, etc.) | Neutral `bg-secondary text-secondary-foreground` |
| Pro plan badge | `bg-amber-500/10 text-amber-400 border-amber-500/20` | No change (semantic accent for plan tier) |

---

## Form Polish

| Area | Before | After |
|------|--------|-------|
| New Field Defect form | Raw `<input>`, `<textarea>`, `<select>`, `<input type="checkbox">` | shadcn/ui `Input`, `Textarea`, `Label`, `Checkbox` components |
| Edit Field Defect form | Same raw HTML elements | Same shadcn/ui component migration |
| Form section dividers | `border-t pt-5` with `mb-4` | `Separator` component with consistent `space-y-4` rhythm |
| Label spacing | `space-y-2` | `space-y-1.5` (tighter) |
| Action buttons | Hardcoded `bg-emerald-500 text-white` for save, hand-crafted cancel | shadcn/ui `Button` with `default`, `outline`, `ghost` variants |
| Max-width | `max-w-2xl` | Same, kept |

---

## Detail Page Layout Rebalance

| Area | Before | After |
|------|--------|-------|
| Grid ratio | `lg:grid-cols-[2fr_1fr]` | `lg:grid-cols-[3fr_1fr]` (more left content width) |
| Right rail behavior | Scrolls with page | `lg:sticky lg:top-6` (stays visible) |
| Summary + SLA cards | Two separate cards stacked | Merged into single "Overview" card with `divide-y` rows |
| Comment section | Left column (below content) | Full-width below the grid |
| Activity max-height | `max-h-80` | `max-h-64` (more compact) |
| Boolean flags | Emoji-based (⚠️, 🚫, 🔁) | Semantic text (`text-destructive font-medium`, `text-amber-600 font-medium`) |
| Linked 8D card | Bright `bg-emerald-500/10` accent | Subtle `bg-emerald-500/5 border-emerald-500/20` |
| "Manage Media" link | `text-emerald-500` | `text-muted-foreground hover:text-foreground` |
| Action links | `border border-border` outline style | `rounded-md px-3 py-2 text-muted-foreground hover:bg-muted` (subtler) |

---

## Dashboard & Card Polish

| Area | Before | After |
|------|--------|-------|
| DashboardCard icon | `bg-primary/10 text-primary` sized `h-10 w-10` | `bg-muted text-muted-foreground` sized `h-9 w-9` |
| DashboardCard title | `text-sm text-muted-foreground` plain | `text-xs font-medium uppercase tracking-wider text-muted-foreground` |
| DashboardCard border | `rounded-xl` | `rounded-lg` (matches other cards) |
| War Room KPI cards | Inline `rounded-lg border bg-card p-4` | `DashboardCard` component reuse |
| "Create First" empty CTA | `bg-emerald-500 text-white` button | `Button` component |
| Filter chips on field list | String interpolation with `className` | `cn()` utility with explicit `border` states |
| Defects page chips | `rounded-md` with border | `rounded-full` with `border-transparent`/`border-primary` |

---

## Sidebar Polish

| Area | Before | After |
|------|--------|-------|
| Logo icon background | `bg-gradient-to-br from-emerald-500 to-blue-600` with shadow | `bg-foreground text-background` (neutral) |
| User avatar initial | `bg-emerald-500/10 text-emerald-400` | `bg-muted text-foreground` |
| Nav link hover | `hover:border-emerald-500/40` with `group-hover:text-emerald-400` | `hover:bg-sidebar-accent` with `group-hover:text-foreground` |
| Sign out hover | `hover:bg-red-500/10 hover:text-red-400` | `hover:bg-destructive/10 hover:text-destructive` |

---

## Misc UX Polish

| Area | Before | After |
|------|--------|-------|
| DetailRow | `py-2` gap | `py-2.5` for more breathing room, explicit `text-foreground` on `<dd>` |
| PageHeader | `space-y-0.5` between title/desc | `space-y-1` |
| Evidence badges in defects table | `bg-red-50 text-red-700` etc. | `bg-destructive/10 text-destructive`, `bg-emerald-500/10 text-emerald-600` |
| Quality Intelligence CTA | `bg-emerald-500 text-white` | `Button` component |

---

## Files Changed

- `src/lib/field-defect.ts` — Badge color configs neutralized
- `src/lib/escalation.ts` — Badge color configs neutralized
- `src/lib/sla-field-defect.ts` — SLA status color configs neutralized
- `src/components/ui/status-badge.tsx` — Badge colors neutralized
- `src/components/field/FieldDefectSourceBadge.tsx` — Neutral source badges
- `src/components/field/AiInsightPanel.tsx` — Badge/status colors neutralized
- `src/components/layout/DashboardCard.tsx` — Neutral icon styling, tighter label
- `src/components/layout/PageHeader.tsx` — Spacing adjustment
- `src/components/layout/Sidebar.tsx` — Neutral logo, avatar, hover states
- `src/components/DetailRow.tsx` — Better spacing, explicit text color
- `src/app/(dashboard)/quality/oem/field/new/form.tsx` — Full shadcn/ui form refactor
- `src/app/(dashboard)/quality/oem/field/[id]/edit/edit-form.tsx` — Full shadcn/ui form refactor
- `src/app/(dashboard)/quality/oem/field/[id]/page.tsx` — Layout rebalance, sticky rail, merged cards
- `src/app/(dashboard)/quality/oem/field/page.tsx` — Button component, cn() for chips
- `src/app/(dashboard)/quality/oem/quality-intelligence/page.tsx` — Button for CTA
- `src/app/(dashboard)/quality/oem/war-room/page.tsx` — DashboardCard reuse
- `src/app/(dashboard)/quality/oem/defects/page.tsx` — cn() for filter chips, neutral evidence badges

---

## No Changes

- Public landing page (unchanged)
- Product logic / data flow (unchanged)
- Database schema (unchanged)
- API endpoints (unchanged)
- Auth/multi-tenancy logic (unchanged)
- 8D wizard, FMEA editor, PPAP, IQC pages (not touched in this patch)

---

# PlantQuality v1.8.1 — Release Notes

## Dashboard/Category UX Polish & Bugfix

**Release Date:** 2026-04-26  
**Version:** 1.8.1

---

## Summary

PlantQuality v1.8.1 is a stabilization and UX polish patch on top of v1.8.0. It improves the Quality Intelligence Dashboard labels and empty states, polishes category/subcategory display across OEM and supplier views, hardens AI accept/reject feedback, fixes minor bugs, and adds a new event type for category updates. No new product features are introduced.

---

## Dashboard UX Polish

| Area | Before | After |
|------|--------|-------|
| KPI card labels | "Open", "Overdue", "Critical" | "Open Field Defects", "Overdue Field Defects", "Critical Field Defects" |
| AI acceptance rate | Hidden entirely when no suggestions exist | Shows "—" dash with "No classification suggestions generated yet" when no suggestions, hidden only when zero defects |
| Zero-defect state | No guidance | Empty state with icon, message, and CTA to create first field defect |
| Ranking table links | Category links use `/quality/oem/field?filter=cat:` | Unchanged (working correctly) |
| Long names in ranking tables | No truncation, could overflow | `max-w-[calc(100%-3rem)]` truncation with hover underline preserved |

---

## Category Display Polish

| Area | Before | After |
|------|--------|-------|
| Null category in field list | Shows "—" em dash | Shows italic "Uncategorized" |
| Null category in OEM detail | Hidden entirely (conditional row) | Always shown — displays italic "Uncategorized" when null |
| Null category in supplier detail | Hidden entirely | Always shown — displays italic "Uncategorized" when null |
| AI-applied category indicator | Separate "AI Classification" row, subtle | Category and probable area show "(AI)" inline badge; renamed to "Classification Source" |
| Category in field list table | Simple text with "/" separator | Unchanged format, shows "(Uncategorized)" for null |

---

## AI Accept Feedback Polish

| Area | Before | After |
|------|--------|-------|
| Accept/reject result | Full page reload via `window.location.reload()` | Server component refresh via `router.refresh()` (preserves scroll, no flash) |
| Similar Issues refresh | Full page reload via `window.location.reload()` | Server component refresh via `router.refresh()` |

---

## Manual Category Edit Validation

| Area | Before | After |
|------|--------|-------|
| Whitespace trimming | No trimming (raw form values saved) | Category, subcategory, probableArea trimmed server-side in both `updateFieldDefect` and `updateFieldDefectCategories` |
| Max length | No validation | `maxLength={100}` added to input fields; server-side `slice(0, 100)` in `updateFieldDefectCategories` |
| Empty strings | Could be saved as empty string | Converted to `null` (consistent with optional schema) |
| Mileage validation | `updateFieldDefect` allowed `NaN` for non-numeric mileage input | Added `isNaN` guard returning error — consistent with `createFieldDefect` |

---

## Bug Fixes

| Bug | Description | Fix |
|-----|-------------|-----|
| Wrong event type for category updates | `updateFieldDefectCategories` logged `FIELD_DEFECT_STATUS_CHANGED` | New enum value `FIELD_DEFECT_CATEGORY_UPDATED` added; used in both `updateFieldDefectCategories` and `event-labels.ts` |
| Page number NaN | `parseInt(params.page)` could produce `NaN` for non-numeric `?page=` | Added `|| 1` fallback and `Math.max(1, ...)` guard |

---

## Database Changes

| Change | Detail |
|--------|--------|
| `DefectEventType` enum | Added `FIELD_DEFECT_CATEGORY_UPDATED` value |

Requires `npx prisma db push` and `npx prisma generate`.

---

## Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `FIELD_DEFECT_CATEGORY_UPDATED` to `DefectEventType` enum |
| `src/lib/event-labels.ts` | Added `FIELD_DEFECT_CATEGORY_UPDATED` label |
| `src/app/(dashboard)/quality/oem/quality-intelligence/page.tsx` | Polished KPI labels, added zero-defect empty state, conditional ranking sections, AI rate dash state |
| `src/app/(dashboard)/quality/oem/field/page.tsx` | NaN page guard, "Uncategorized" text for null categories |
| `src/app/(dashboard)/quality/oem/field/[id]/page.tsx` | Always-show category row, "(AI)" badge, "Classification Source" label |
| `src/app/(dashboard)/quality/supplier/field/[id]/page.tsx` | Always-show category row with "Uncategorized" and "(AI)" badge |
| `src/app/(dashboard)/quality/oem/field/[id]/edit/edit-form.tsx` | Added `maxLength={100}` on category inputs, helper text |
| `src/app/(dashboard)/field/actions.ts` | Mileage NaN guard, whitespace trim for category fields, `FIELD_DEFECT_CATEGORY_UPDATED` event type |
| `src/components/field/AiInsightPanel.tsx` | Replaced `window.location.reload()` with `router.refresh()` |
| `src/components/field/SimilarIssuesPanel.tsx` | Replaced `window.location.reload()` with `router.refresh()` |

---

## Deferred

| Feature | Target |
|---------|--------|
| Root cause suggestion | v1.9+ |
| AI 8D review | v1.9+ |
| Supplier risk prediction | v1.9+ |
| Warranty cost prediction | v2.0+ |
| Image-based AI classification | v2.0+ |
| Export/report builder | v2.0+ |
| Predefined category taxonomy | v1.9+ |

---

# PlantQuality v1.8.0 — Release Notes

## Category Intelligence & Quality Dashboard

**Release Date:** 2026-04-26  
**Version:** 1.8.0

---

## Summary

PlantQuality v1.8.0 converts AI classification output into structured Field Quality data and exposes quality intelligence dashboards based on category/subcategory trends. AI suggestion accept now applies `category`, `subcategory`, and `probableArea` directly to FieldDefect records. OEM users can manually edit classification fields. Similar Issue Detection now uses category/subcategory in its scoring model. A new Quality Intelligence Dashboard provides trending analytics for OEM users.

**Core promise:** "AI suggestions are no longer just recommendations — accepted suggestions become structured field quality data, visible in management dashboards."

---

## New Features

### FieldDefect Category Fields

| Field | Type | Description |
|-------|------|-------------|
| `category` | String? | High-level defect classification (e.g., "Electrical", "Mechanical") |
| `subcategory` | String? | Detailed classification (e.g., "Wiring Harness", "Brake System") |
| `probableArea` | String? | Suspected area of the defect (e.g., "Front Left Door Module") |
| `aiCategoryApplied` | Boolean | Whether AI classification was accepted and applied |
| `aiCategoryAppliedAt` | DateTime? | When AI category was applied |
| `aiCategoryAppliedById` | String? | Who accepted the AI suggestion |

### AI Suggestion Application

| Change | Description |
|--------|-------------|
| Accept applies category fields | `category`, `subcategory`, `probableArea` are written to FieldDefect on AI classification accept |
| Accept applies severity | Suggested severity continues to be applied (existing behavior) |
| AI category marker | `aiCategoryApplied` boolean set to `true`, `aiCategoryAppliedAt` and `aiCategoryAppliedById` recorded |
| Defense-in-depth | `prisma.fieldDefect.update` now includes `oemId` in `where` clause for accept action |

### Manual Category Editing

| Change | Description |
|--------|-------------|
| Edit form | OEM users can edit `category`, `subcategory`, `probableArea` in field defect edit form |
| Server action | New `updateFieldDefectCategories()` action for inline category updates |
| Update action | Existing `updateFieldDefect()` now accepts `category`, `subcategory`, `probableArea` via FormData |

### Category/Subcategory Filters

| Change | Description |
|--------|-------------|
| OEM Field list | Category and subcategory filter chips computed from visible data |
| Filter format | `cat:Electrical` and `subcat:Wiring Harness` URL filter params |
| Category column | Added to OEM Field list table |

### Similar Issue Enhancement

| Signal | Score | Description |
|--------|-------|-------------|
| Same category | +10 | Both defects share the same category |
| Same subcategory | +15 | Both defects share the same subcategory |
| Same probable area | +5 | Both defects share the same probable area |

Existing weights unchanged: VIN exact (40), part number (25), supplier (15), vehicle model (10), title keywords (10), description keywords (5). Works when AI_ENABLED=false.

### Quality Intelligence Dashboard

New OEM route: `/quality/oem/quality-intelligence`

| Metric | Description |
|--------|-------------|
| Total Field Defects | All non-deleted defects for the OEM |
| Open Field Defects | Active statuses (OPEN, UNDER_REVIEW, SUPPLIER_ASSIGNED) |
| Overdue Field Defects | Past SLA deadline |
| Critical Field Defects | Severity = CRITICAL |
| Top Categories | Grouped by category, top 10 |
| Top Subcategories | Grouped by subcategory, top 10 |
| Top Vehicle Models | Grouped by vehicle model, top 10 |
| Top Suppliers | Grouped by assigned supplier, top 10 |
| Top Recurring Part Numbers | Grouped by part number, top 10 |
| AI Acceptance Rate | Accepted classification suggestions / total generated |

### Supplier Visibility

- Supplier users can see `category`, `subcategory`, `probableArea` on assigned field defects
- Supplier users cannot access Quality Intelligence Dashboard
- Supplier users cannot update category fields

---

## Database Changes

| Change | Detail |
|--------|--------|
| `field_defects.category` | New nullable String column |
| `field_defects.subcategory` | New nullable String column |
| `field_defects.probable_area` | New nullable String column |
| `field_defects.ai_category_applied` | New Boolean column, default `false` |
| `field_defects.ai_category_applied_at` | New nullable DateTime column |
| `field_defects.ai_category_applied_by_id` | New nullable String FK to `users` |
| New indexes | `(oemId, category)`, `(oemId, subcategory)`, `(oemId, probable_area)`, `(oemId, createdAt)`, `(oemId, supplierId)`, `(oemId, vehicle_model)`, `(oemId, part_number)` |

---

## New Files

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/quality/oem/quality-intelligence/page.tsx` | Quality Intelligence Dashboard page |
| `src/app/(dashboard)/quality/intelligence-actions.ts` | Server action for dashboard data |

---

## Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added category/subcategory/probableArea/aiCategoryApplied fields to FieldDefect; new indexes |
| `src/app/(dashboard)/field/ai-actions.ts` | `acceptSuggestion` now applies category/subcategory/probableArea and sets aiCategoryApplied; added defense-in-depth oemId in update where clause |
| `src/app/(dashboard)/field/actions.ts` | Added `updateFieldDefectCategories()` action; added category/subcategory/probableArea to `updateFieldDefect()`; added cat:/subcat: filter support; revalidate quality-intelligence paths |
| `src/lib/ai/similar-issues.ts` | Added category (+10), subcategory (+15), probableArea (+5) scoring; updated query select and interface |
| `src/lib/field-defect-types.ts` | Added category/subcategory/probableArea to FieldDefectRow |
| `src/app/(dashboard)/quality/oem/field/page.tsx` | Added Category column and dynamic category/subcategory filter chips |
| `src/app/(dashboard)/quality/oem/field/[id]/page.tsx` | Display category/subcategory/probableArea; show AI classification badge; pass category data to similar issues |
| `src/app/(dashboard)/quality/oem/field/[id]/edit/edit-form.tsx` | Added Classification section with category/subcategory/probableArea inputs |
| `src/app/(dashboard)/quality/supplier/field/[id]/page.tsx` | Display category/subcategory/probableArea for assigned defects |
| `src/components/field/AiInsightPanel.tsx` | Accept button shows which fields will be applied |
| `src/components/field/SimilarIssuesPanel.tsx` | Display category/subcategory in results |
| `src/app/(dashboard)/layout.tsx` | Added Intelligence nav link for OEM |
| `src/components/layout/Sidebar.tsx` | Added BarChart3Icon to icon map |

---

## Permission Model

| Action | OEM Admin | OEM QE | OEM Viewer | Supplier Admin | Supplier QE |
|--------|-----------|--------|------------|----------------|-------------|
| View Quality Intelligence Dashboard | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit category/subcategory/probableArea | ✅ | ✅ | ❌ | ❌ | ❌ |
| Accept AI classification (applies category) | ✅ (PRO) | ✅ (PRO) | ❌ | ❌ | ❌ |
| View category on assigned defect | ✅ | ✅ | ✅ | ✅ | ✅ |
| Category filter in field list | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## Known Limitations

- Category and subcategory values are free-text (no predefined taxonomy)
- AI classification suggest `suggestedSupplierName` is stored in resultJson but not auto-applied to avoid incorrect supplier assignment
- Similar Issue Detection only searches Field Defects (not 8D Defects) within the same OEM tenant
- Quality Intelligence Dashboard is page-refresh (no real-time updates)
- No CSV/PDF export on the dashboard

---

## Deferred

| Feature | Target |
|---------|--------|
| Root cause generation | v1.9+ |
| AI 8D review | v1.9+ |
| Supplier risk prediction | v1.9+ |
| Warranty cost prediction | v2.0+ |
| Image-based AI classification | v2.0+ |
| Vector database for semantic search | v2.0+ |
| Advanced analytics builder | v2.0+ |
| CSV/PDF export | v2.0+ |
| Predefined category taxonomy | v1.9+ |

---

# PlantQuality v1.7.1 — Release Notes

## AI Auth Hardening & Design-System Cleanup

**Release Date:** 2026-04-26  
**Version:** 1.7.1

---

## Summary

PlantQuality v1.7.1 is a security and quality patch on top of v1.7.0. It hardens authorization on all AI-related API routes and server actions, removes an unused dead-code export, and fixes minor design-system violations in the AI panel components. **No new product features are introduced.**

---

## Auth Hardening

### Legacy AI Routes (`/api/ai/*`)

The following routes previously only checked `session` existence and `plan === "PRO"`, allowing any authenticated user (including suppliers) to invoke AI capabilities:

| Route | Before | After |
|-------|--------|-------|
| `POST /api/ai/suggest` | `session` check only | + `companyId`, `companyType === "OEM"`, `role in [ADMIN, QUALITY_ENGINEER]` |
| `POST /api/ai/vision` | `session` check only | + `companyId`, `companyType === "OEM"`, `role in [ADMIN, QUALITY_ENGINEER]` |
| `POST /api/ai/refine-text` | `session` check only | + `companyId`, `companyType === "OEM"`, `role in [ADMIN, QUALITY_ENGINEER]` |
| `POST /api/ai/fmea-suggest` | `session` check only | + `companyId`, `companyType === "OEM"`, `role in [ADMIN, QUALITY_ENGINEER]` |
| `POST /api/ai/suggest-diagram` | `session` check only | + `companyId`, `companyType === "OEM"`, `role in [ADMIN, QUALITY_ENGINEER]` |

All five routes now return:
- `401` if no `companyId`
- `403` if `companyType !== "OEM"` or role is not ADMIN/QUALITY_ENGINEER
- `403` if plan is not PRO

### Field AI Routes (`/api/field/[id]/ai/*`)

These routes already checked `companyId` and `companyType === "OEM"`, but did not check user role. OEM VIEWER/READER roles could invoke classification and similar-issues endpoints.

| Route | Added Check |
|-------|------------|
| `POST /api/field/[id]/ai/classify` | `role in [ADMIN, QUALITY_ENGINEER]` |
| `POST /api/field/[id]/ai/similar` | `role in [ADMIN, QUALITY_ENGINEER]` |
| `POST /api/field/[id]/ai/suggestions/[suggestionId]/accept` | `role in [ADMIN, QUALITY_ENGINEER]` |
| `POST /api/field/[id]/ai/suggestions/[suggestionId]/reject` | `role in [ADMIN, QUALITY_ENGINEER]` |

### Server Action: `getSuggestions`

Previously allowed any company type to fetch suggestions (returning empty for non-matching company). Now returns `[]` immediately for non-OEM users.

### Dead Code Removed

- `checkAiConfig` server action — was exported but never imported or called anywhere. Removed from `ai-actions.ts`.

---

## Design-System Cleanup

### AiInsightPanel.tsx

| Fix | Before | After |
|-----|--------|-------|
| Classification value text | `text-sm font-medium` (implicit color) | `text-sm font-medium text-foreground` (explicit semantic token) |
| Similarity badge reasoning/recommended text | `text-sm` (implicit) | `text-sm text-foreground` |
| Button accessibility | Missing `aria-label` and `disabled:cursor-not-allowed` | Added `aria-label` and `disabled:cursor-not-allowed` to all buttons |

### SimilarIssuesPanel.tsx

| Fix | Before | After |
|-----|--------|-------|
| Refresh button accessibility | Missing `aria-label` and `disabled:cursor-not-allowed` | Added `aria-label="Search for similar issues"` and `disabled:cursor-not-allowed` |

Badge color patterns (`bg-blue-*`, `bg-amber-*`, `bg-red-*`, `bg-emerald-*` with dark variants) remain unchanged as they match the established `FieldDefectSeverityBadge` / `FieldDefectStatusBadge` conventions from `field-defect.ts`.

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/api/ai/suggest/route.ts` | Added OEM + role authorization checks |
| `src/app/api/ai/vision/route.ts` | Added OEM + role authorization checks |
| `src/app/api/ai/refine-text/route.ts` | Added OEM + role authorization checks |
| `src/app/api/ai/fmea-suggest/route.ts` | Added OEM + role authorization checks |
| `src/app/api/ai/suggest-diagram/route.ts` | Added OEM + role authorization checks |
| `src/app/api/field/[id]/ai/classify/route.ts` | Added role check (ADMIN/QUALITY_ENGINEER) |
| `src/app/api/field/[id]/ai/similar/route.ts` | Added role check (ADMIN/QUALITY_ENGINEER) |
| `src/app/api/field/[id]/ai/suggestions/[suggestionId]/accept/route.ts` | Added role check (ADMIN/QUALITY_ENGINEER) |
| `src/app/api/field/[id]/ai/suggestions/[suggestionId]/reject/route.ts` | Added role check (ADMIN/QUALITY_ENGINEER) |
| `src/app/(dashboard)/field/ai-actions.ts` | Hardened `getSuggestions` to OEM-only; removed dead `checkAiConfig` export |
| `src/components/field/AiInsightPanel.tsx` | Added `text-foreground` tokens; added `aria-label` and `disabled:cursor-not-allowed` to buttons |
| `src/components/field/SimilarIssuesPanel.tsx` | Added `aria-label` and `disabled:cursor-not-allowed` to refresh button |

---

## Regression Verification

- AI disabled state (no `AI_API_KEY`) still shows "AI suggestions are not configured"
- Missing `AI_API_KEY` does not crash the app
- AI classification requires OEM + PRO + ADMIN/QUALITY_ENGINEER
- Similar Issues requires OEM + ADMIN/QUALITY_ENGINEER (no PRO gate, per v1.7.0 product design)
- Supplier users cannot access any AI endpoints (403)
- OEM VIEWER/READER cannot trigger AI actions (403)
- Field Detail page loads correctly for both OEM and Supplier
- Similar Issues panel visible only on OEM detail page
- All lint, typecheck, and build checks pass

---

## Known Limitations (unchanged from v1.7.0)

- Classification uses existing Field Defect fields only; no image-based classification yet
- Suggested severity is the only field auto-applied on accept
- Similar Issue Detection only searches Field Defects (not 8D Defects) within the same OEM tenant
- AI provider must be OpenAI-compatible
- PRO plan gating follows existing plan system; no new subscription paywall

---

## Deferred to Future Versions

| Feature | Target |
|---------|--------|
| AI rerank on similar issues | v1.8+ |
| Image-based AI classification | v1.8+ |
| AI-generated root cause suggestions | v1.8+ |
| Supplier risk scoring | v1.9+ |
| Category/subcategory columns on FieldDefect | v1.8+ |
| Vector database for semantic search | v2.0+ |

---

# PlantQuality v1.7.0 — Release Notes

## AI Defect Classification & Similar Issue Detection

**Release Date:** 2026-04-26  
**Version:** 1.7.0

---

## Summary

PlantQuality v1.7.0 introduces AI-assisted Field Quality intelligence: defect classification and similar issue detection. OEM quality users can now generate AI-powered category/severity/risk suggestions for Field Defects, and discover similar historical issues using database-backed text similarity search. Similar Issue Detection works **without any AI provider** — it uses PostgreSQL full-text matching and scoring. AI Classification requires a configured AI provider (DeepSeek or OpenAI-compatible) and a PRO plan.

---

## New Features

### AI Defect Classification (PRO-gated)

| Feature | Description |
|---------|-------------|
| AI Insight Panel | New panel on OEM Field Defect detail page showing: category, subcategory, probable area/system, suggested severity, confidence score, reasoning, recommended action, and duplicate risk |
| Generate Classification | Button to generate AI classification for a Field Defect using DeepSeek Chat (or configured OpenAI-compatible model) |
| Accept/Reject Suggestion | OEM users can accept or reject AI suggestions; accepting applies suggested severity to the Field Defect |
| Re-generate | After accept/reject, users can generate a fresh classification |
| Audit Trail | Classification, accept, and reject actions create Field Defect Events (AI_CLASSIFICATION_GENERATED, AI_SUGGESTION_ACCEPTED, AI_SUGGESTION_REJECTED) |
| `AiSuggestion` model | New database table storing classification and similar-issues results with input hash, confidence, status tracking, and accept/reject metadata |
| Input hash dedup | Classification skips re-generation if input fields have not changed since last GENERATED suggestion |

### Similar Issue Detection (always available, no AI required)

| Feature | Description |
|---------|-------------|
| Similar Issues Panel | New panel on OEM Field Defect detail page showing top-ranked similar Field Defects |
| DB Similarity Search | Matches by VIN (exact), part number (contains), supplier (exact), vehicle model (contains), title keyword overlap, and description keyword overlap |
| Scoring | Weighted scoring: VIN=40, Part=25, Supplier=15, Vehicle Model=10, Title=10, Description=5. Results sorted by score, top 10 returned |
| Similarity reasons | Each match shows tags: "Same VIN", "Same part number", "Same supplier", "Same vehicle model", "Similar title", "Similar description" |
| Tenant isolation | Only searches within the current OEM company; supplier users cannot trigger Similar Issue search |
| Refresh | OEM users can re-run the search at any time |

### AI Provider Abstraction

| Feature | Description |
|---------|-------------|
| `src/lib/ai/provider.ts` | Central AI provider module; uses existing `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` env vars; includes `isAiEnabled()` utility checking `AI_ENABLED` env and API key presence |
| `src/lib/ai/classify-field-defect.ts` | Classification logic using OpenAI SDK with JSON mode; structured output validated before storage |
| `src/lib/ai/similar-issues.ts` | Pure DB similarity search; no AI dependency; always functional |
| Safe fallback | If `AI_ENABLED=false` or API key missing, AI Insight panel shows "AI suggestions are not configured" but Similar Issues works normally |

---

## Database Changes

| Change | Detail |
|--------|--------|
| New model: `ai_suggestions` | Stores AI classification and similar-issue results with status tracking (GENERATED/ACCEPTED/REJECTED/EXPIRED) |
| New enum: `AiSuggestionType` | CLASSIFICATION, SIMILAR_ISSUES |
| New enum: `AiSuggestionStatus` | GENERATED, ACCEPTED, REJECTED, EXPIRED |
| New event types | AI_CLASSIFICATION_GENERATED, AI_SUGGESTION_ACCEPTED, AI_SUGGESTION_REJECTED added to DefectEventType |
| Indexes | companyId+fieldDefectId, companyId+suggestionType, fieldDefectId+suggestionType+status, companyId+createdAt |

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/field/[id]/ai/classify` | OEM+PRO | Generate AI classification for a Field Defect |
| POST | `/api/field/[id]/ai/similar` | OEM | Run similar issue search (always available) |
| POST | `/api/field/[id]/ai/suggestions/[suggestionId]/accept` | OEM | Accept an AI suggestion |
| POST | `/api/field/[id]/ai/suggestions/[suggestionId]/reject` | OEM | Reject an AI suggestion |

---

## UI Changes

| Component | Change |
|-----------|--------|
| OEM Field Detail page | Added AiInsightPanel (right column) showing AI classification when available, or disabled state |
| OEM Field Detail page | Added SimilarIssuesPanel (right column) always visible for OEM users |
| Event labels | Added icons/labels for AI_CLASSIFICATION_GENERATED, AI_SUGGESTION_ACCEPTED, AI_SUGGESTION_REJECTED |

---

## New Files

| File | Purpose |
|------|---------|
| `src/lib/ai/provider.ts` | AI provider module with `isAiEnabled()` and `aiClassify()` |
| `src/lib/ai/classify-field-defect.ts` | AI classification prompt and structured output |
| `src/lib/ai/similar-issues.ts` | DB-based similarity search with scoring |
| `src/app/(dashboard)/field/ai-actions.ts` | Server actions: generateClassification, generateSimilarIssues, acceptSuggestion, rejectSuggestion, getSuggestions, checkAiConfig |
| `src/app/api/field/[id]/ai/classify/route.ts` | API route for AI classification |
| `src/app/api/field/[id]/ai/similar/route.ts` | API route for similar issues |
| `src/app/api/field/[id]/ai/suggestions/[suggestionId]/accept/route.ts` | API route to accept suggestion |
| `src/app/api/field/[id]/ai/suggestions/[suggestionId]/reject/route.ts` | API route to reject suggestion |
| `src/components/field/AiInsightPanel.tsx` | Client component for AI Insight panel |
| `src/components/field/SimilarIssuesPanel.tsx` | Client component for Similar Issues panel |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_ENABLED` | `"true"` | Global toggle for AI features; set `"false"` to disable all AI features |
| `AI_API_KEY` | `""` | OpenAI-compatible API key (existing) |
| `AI_BASE_URL` | `"https://api.deepseek.com/v1"` | OpenAI-compatible base URL (existing) |
| `AI_MODEL` | `"deepseek-chat"` | Model name (existing) |

---

## Permission Model

| Action | OEM Admin | OEM QE | OEM Viewer | Supplier Admin | Supplier QE |
|--------|-----------|--------|------------|----------------|-------------|
| Generate AI Classification | ✅ (PRO) | ✅ (PRO) | ❌ | ❌ | ❌ |
| Find Similar Issues | ✅ | ✅ | ❌ | ❌ | ❌ |
| Accept/Reject Suggestion | ✅ (PRO) | ✅ (PRO) | ❌ | ❌ | ❌ |
| View AI Insight Panel | ✅ (PRO) | ✅ (PRO) | ❌ | Not shown | Not shown |
| View Similar Issues Panel | ✅ | ✅ | ✅ | Not shown | Not shown |

---

## Known Limitations

- Classification uses existing Field Defect fields only (title, description, part, vehicle, severity). No image-based classification yet.
- Suggested severity is the only field auto-applied on accept. Category/subcategory/area suggestions are stored in resultJson but `category`/`subcategory` columns do not exist on FieldDefect yet.
- Similar Issue Detection only searches Field Defects (not 8D Defects) within the same OEM tenant.
- AI provider must be OpenAI-compatible. No fallback provider auto-selection.
- PRO plan gating follows existing plan system. No new subscription paywall added.

---

## Deferred to Future Versions

| Feature | Target |
|---------|--------|
| Image-based AI classification | v1.8+ |
| Include 8D Defects in similar search | v1.8+ |
| AI rerank/explanation on similar issues (Stage 2) | v1.8+ |
| AI-generated root cause suggestions | v1.8+ |
| AI-generated 8D steps | v1.8+ |
| Predictive quality / warranty cost | v1.9+ |
| Supplier risk AI scoring | v1.9+ |
| Vector database for semantic search | v2.0+ |
| Category/subcategory columns on FieldDefect | v1.8+ |

---

# PlantQuality v1.6.1 — Release Notes

## Lint Debt Cleanup & Regression Hardening

**Release Date:** 2026-04-26  
**Version:** 1.6.1

---

## Summary

PlantQuality v1.6.1 eliminates all remaining lint errors and warnings inherited from v1.4.x/v1.5.x, and adds regression hardening from v1.6.0 SLA/escalation/notification flows. No new product features were added.

---

## Lint Cleanup

| Area | Issue | Fix |
|------|-------|-----|
| `react-hooks/set-state-in-effect` | `setMounted(true)` inside `useEffect` caused cascading renders in `page.tsx`, `EightDPrintView.tsx`, `ThemeToggle.tsx` | Replaced `useState` + `useEffect` mount pattern with `useSyncExternalStore`-based `useMounted` hook (no effect, no setState) |
| Unused imports | `Card`, `CardContent` imported but never used in `page.tsx` | Removed unused imports |
| Unused variable | `redirectTo` assigned from `useSearchParams()` but never consumed in `login/page.tsx` | Prefixed with `_` (`_redirectTo`) |
| Unused function | `canManagePpap` defined but never called in `ppap/actions/review.ts` | Prefixed with `_` (`_canManagePpap`) |
| Unused variable | `_` parameter in `.map()` callback in `FmeaEditor.tsx` | Removed unused parameter entirely |
| Unused variable | `router` from `useRouter()` in `dev-login-form.tsx` | Removed import and variable |
| Unused variable | `router` from `useRouter()` in `magic-link-form.tsx` | Removed import and variable |
| Unused parameter | `request` in `authorize` callback in `auth.ts` | Removed unused parameter |
| ESLint config | `@typescript-eslint/no-unused-vars` did not allow `_` prefix convention | Added `argsIgnorePattern: "^_"` and `varsIgnorePattern: "^_"` override |

---

## New Utility

| File | Purpose |
|------|---------|
| `src/hooks/use-mounted.ts` | `useMounted()` hook using `useSyncExternalStore` — returns `true` on client, `false` during SSR. Replaces `useState(false) + useEffect(() => setMounted(true), [])` pattern. |

---

## SLA Tracking, Escalation Management & Notifications Hardening

**Release Date:** 2026-04-26  
**Version:** 1.6.1

---

## Summary

PlantQuality v1.6.1 stabilizes the SLA, escalation, notification, and war-room flows introduced in v1.6.0. This release focuses on runtime correctness, tenant isolation, supplier isolation, and UI polish. No new features were added.

---

## Bug Fixes

### SLA

| Fix | Description |
|-----|-------------|
| DRAFT SLA status | DRAFT field defects now correctly show "No SLA" instead of attempting to calculate a due date |
| LINKED_TO_8D SLA status | LINKED_TO_8D field defects now show "Completed" instead of "No SLA" or "Overdue" |
| `getFieldDefectActiveDueDate` | Returns `null` for DRAFT and LINKED_TO_8D statuses, preventing false overdue flags |
| SLA cron dedup queries | Added `companyId` to all `prisma.notification.findFirst` deduplication checks in `sla-notifications.ts`, fixing a multi-tenancy gap |

### Escalation

| Fix | Description |
|-----|-------------|
| DRAFT escalation blocked in UI | EscalateButton is now hidden for DRAFT, LINKED_TO_8D, CLOSED, and CANCELLED statuses in the OEM detail page |
| LINKED_TO_8D escalation blocked in UI | Prevents escalation at field level for defects already linked to 8D |
| Supplier escalation access | Fixed `getEscalations` for suppliers to query by assigned field defect IDs instead of `companyId` on `EscalationHistory` (which stores OEM companyId) |
| War Room supplier access | `getActiveEscalations` now returns `escalated: []` for non-OEM users, preventing supplier from seeing war-room data |

### Notifications

| Fix | Description |
|-----|-------------|
| Notification dedup tenant safety | All `findFirst` dedup checks in `sla-notifications.ts` now include `companyId` in the `where` clause, preventing cross-tenant dedup collisions |
| Notification `title` field | `NotificationBell` component now displays the `title` field when present, matching the full notification page behavior |

### War Room

| Fix | Description |
|-----|-------------|
| Closed/cancelled exclusions | `getActiveEscalations` now filters by `status: { in: ["OPEN", "UNDER_REVIEW", "SUPPLIER_ASSIGNED"] }`, excluding closed/cancelled/DRAFT/LINKED_TO_8D items |
| SLA alerts section | War Room now shows both escalated items and SLA alerts (overdue/due-soon) that aren't yet escalated, with separate tables and KPI cards |
| OEM-only access | War Room page redirects non-OEM users; `getActiveEscalations` returns empty for suppliers |
| Empty state | War Room shows a clear empty state with icon and message when no escapelations or SLA alerts exist |

---

## Permission Hardening

| Area | Change |
|------|--------|
| Escalation action | Escalation is OEM-only; supplier cannot access the action — verified `canOemManage(session)` gate |
| Escalation history | Supplier escalation page uses `entityId IN (supplier_field_defect_ids)` instead of `companyId` on history table |
| Notification read/write | `markAsRead` and `markAllAsRead` filter by `userId + companyId` |
| SLA update action | `setFieldDefectSla` blocks CLOSED, CANCELLED, and LINKED_TO_8D statuses |
| Field update safety | `updateFieldDefect` only allows specific safe fields; `companyId`, `oemId`, `escalationLevel`, `escalatedById`, `escalationReason` are never accepted from client payload |
| War Room access | `getActiveEscalations` returns empty arrays for non-OEM sessions |

---

## UX Polish

| Area | Change |
|------|--------|
| EscalateButton | Hidden for DRAFT, LINKED_TO_8D, CLOSED, CANCELLED statuses |
| SLA update form | Hidden for CLOSED, CANCELLED, LINKED_TO_8D statuses |
| War Room | Added Overdue and Due Soon KPI cards; split view into Escalations and SLA Alerts tables |
| War Room empty state | Shows AlertTriangleIcon with descriptive text |
| NotificationBell | Now shows `title` when present for richer notification preview |
| SLA status | LINKED_TO_8D shows "Completed" badge; DRAFT shows "No SLA" |

---

## Known Limitations

| Area | Limitation |
|------|-----------|
| War Room | Available to OEM only; suppliers do not have a war-room page |
| 8D SLA tracking | 8D defect SLA statuses are not yet displayed on the 8D detail/list pages |
| Escalation history | Only field defect escalations are tracked; 8D escalation history to be added in future |
| Notification dedup | 24-hour window per (userId, type, link, companyId); very high notification volumes may create duplicates |

---

## Deferred to v1.7.0

- AI defect classification
- Similar issue detection
- Root cause suggestion
- 8D SLA tracking UI
- Advanced analytics / dashboard charts
- Email notifications
- Mobile push notifications

---

## SLA Tracking, Escalation Management & Notifications

**Release Date:** 2026-04-26  
**Version:** 1.6.0

---

## Summary

PlantQuality v1.6.0 adds **SLA deadline tracking**, **escalation management**, and **in-app notifications** to the Field Quality and 8D workflows. OEM users can now set response/resolution SLA deadlines on field defects, escalate issues through three severity levels, and all stakeholders receive real-time notification bells for key events.

---

## What's New

### ⏰ SLA Deadline Tracking

- **Response Due & Resolution Due** dates on Field Defects (set by OEM quality engineers)
- SLA status computed dynamically: **On Track**, **Due Soon** (48h), **Overdue**, **Completed**, **No SLA**
- SLA status badges on list and detail pages for both OEM and Supplier views
- SLA deadline update action (OEM only) accessible from field defect detail page

### 🚨 Escalation Management

- **Three escalation levels**: Level 1 (management), Level 2 (executive), Level 3 (C-suite)
- Escalation action on field defect detail page with mandatory reason
- Escalation badges on list and detail pages
- Full escalation history tracked in `EscalationHistory` model
- Notifications sent to supplier and OEM admins on escalation

### 🔔 In-App Notifications

- Expanded `NotificationType` enum with field defect and 8D event types
- Notifications now include `title`, `entityType`, `entityId`, `companyId`, `readAt`
- Dedicated notification pages: `/quality/oem/notifications` and `/quality/supplier/notifications`
- Notification bell in header shows unread count with "Mark All as Read"
- Sidebar navigation includes Notifications link

### 📋 UI Enhancements

- **SLA & Escalation card** on field defect detail pages (OEM: editable, Supplier: read-only)
- **EscalateButton** client component with modal dialog for escalation reason
- **SlaUpdateForm** client component for setting/updating SLA deadlines
- **SlaStatusBadge** and **EscalationBadge** components
- List pages (OEM & Supplier) now show SLA Status and Escalation columns
- Overdue and Escalated quick-filter tabs on field defect list pages

---

## Database Schema Changes

### New Enums

- `EscalationLevel`: `NONE`, `LEVEL_1`, `LEVEL_2`, `LEVEL_3`

### Extended Enums

- `DefectEventType`: +`FIELD_DEFECT_ESCALATED`, +`FIELD_DEFECT_SLA_UPDATED`
- `NotificationType`: +`FIELD_DEFECT_OVERDUE`, +`FIELD_DEFECT_ESCALATED`, +`FIELD_DEFECT_STATUS_CHANGED`, +`EIGHT_D_OVERDUE`, +`EIGHT_D_ESCALATED`, +`COMMENT_ADDED`

### New Model: `EscalationHistory`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `companyId` | UUID | Tenant scope |
| `entityType` | String | "FIELD_DEFECT" or "DEFECT" |
| `entityId` | UUID | FK to the escalated entity |
| `previousLevel` | EscalationLevel | Before escalation |
| `newLevel` | EscalationLevel | After escalation |
| `reason` | String | Mandatory reason text |
| `createdById` | UUID | Who escalated |
| `createdAt` | DateTime | Timestamp |

### Extended Fields on `FieldDefect`

- `responseDueAt` — supplier response deadline
- `resolutionDueAt` — full resolution deadline
- `escalationLevel` — current escalation level (default `NONE`)
- `escalatedAt` — when last escalated
- `escalatedById` — who escalated
- `escalationReason` — why escalated

### Extended Fields on `Defect`

- `escalationLevel`, `escalatedAt`, `escalatedById`, `escalationReason` (same pattern)

### Extended Fields on `Notification`

- `companyId` (nullable) — tenant scope
- `recipientSupplierId` — supplier company filter
- `title` — short notification title
- `entityType` / `entityId` — polymorphic link
- `readAt` — timestamp when read
- New indexes on `companyId+isRead`, `recipientSupplierId`, `entityType+entityId`

---

## New Server Actions

| Action | Location | Description |
|--------|----------|-------------|
| `setFieldDefectSla(id, data)` | `field/actions.ts` | Set/update response and resolution SLA deadlines |
| `escalateFieldDefect(id, reason)` | `field/actions.ts` | Escalate to next level with reason; creates EscalationHistory, event, and notifications |
| `getNotifications(page, pageSize)` | `_actions/notifications.ts` | Paginated notification list with unread count |
| `markAsRead(id)` | `_actions/notifications.ts` | Mark single notification as read |
| `markAllAsRead()` | `_actions/notifications.ts` | Mark all unread as read |

---

## New Libraries

| File | Purpose |
|------|---------|
| `src/lib/sla-field-defect.ts` | SLA status calculation (overdue / due-soon / on-track / no-sla / completed), badge config |
| `src/lib/escalation.ts` | Escalation level labels, colors, descriptions, `getNextEscalationLevel()` |

---

## New Components

| Component | Type | Description |
|-----------|------|-------------|
| `SlaStatusBadge` | Client | Renders SLA status pill with color |
| `EscalationBadge` | Client | Renders escalation level pill with color |
| `EscalateButton` | Client | Escalation modal with reason textarea |
| `SlaUpdateForm` | Client | Set/update SLA deadlines form |
| Notification pages (OEM/Supplier) | Server | Full notification list page with "Mark All as Read" |

---

## Routes

| Role | Route | Description |
|------|-------|-------------|
| OEM | `/quality/oem/notifications` | Full notification list |
| Supplier | `/quality/supplier/notifications` | Full notification list |
| Both | Header → NotificationBell | Dropdown with latest 5 + unread count |

---

## Multi-Tenancy & Security

- All Prisma queries on field defects remain scoped to `oemId` / `supplierId`
- Escalation action verifies `canOemManage(session)` + OEM company scope
- Escalation history scoped to `companyId`
- Notifications created with `companyId` for supplier recipients and `companyId` for other OEM admins
- `Notification.update` scoping to `userId` preserved (prevent cross-tenant reads/writes)

---

## Breaking Changes

- `Notification` model gains new nullable columns (`companyId`, `title`, `entityType`, `entityId`, `readAt`, `recipientSupplierId`). Existing rows with null values are backward-compatible.
- `FieldDefectRow` type extended with `responseDueAt`, `resolutionDueAt`, `escalationLevel`. Code consuming this type must be updated.

---

## What's Next (v1.7.0)

- War Room view (OEM dashboard for active escalations)
- Overdue SLA check cron / computed overdue notifications
- 8D SLA tracking (reuse pattern for `Defect.supplierResponseDueAt`)
- AI defect classification (PRO plan gating)

---

# PlantQuality v1.5.1 — Release Notes

## Field Quality Bugfix & UX Polish

**Release Date:** 2026-04-26  
**Version:** 1.5.1

---

## Summary

PlantQuality v1.5.1 fixes critical bugs, hardens permissions, and polishes the Field Quality MVP introduced in v1.5.0. No new features were added.

---

## Bug Fixes

| Area | Fix |
|------|-----|
| **Server Actions** | `createFieldDefect` now returns `{ success, error }` instead of `void`, preventing silent validation failures with no user feedback |
| **Server Actions** | `assignSupplier` was allowing supplier assignment on CLOSED/CANCELLED/LINKED_TO_8D defects — now blocked to assignable statuses only |
| **Server Actions** | `createFieldDefect` now validates mileage as a positive number server-side |
| **Server Actions** | Removed duplicate supplier DB query in `createFieldDefect` notification path |
| **Convert to 8D** | `partNumber` fallback changed from `"N/A"` string to `"Unspecified"` to avoid confusion with actual data |
| **Attachments** | Upload flow replaced from client-side presigned URL to server-side FormData upload — fixes CORS/failure in development |
| **Attachments** | Download route changed from `[id]` to `[...id]` catch-all to support multi-segment storage keys |
| **Attachments** | Auth bypass fixed: proxy now always requires DB lookup + tenant check before serving files |
| **Attachments** | `storageKey` prefix validation added to prevent client-injected paths |
| **Security** | All `prisma.fieldDefect.update()` calls now include `oemId` in `where` clause (defense in depth) |
| **Security** | `"use server"` file no longer exports non-async values — `PAGE_SIZE` and `FieldDefectRow` moved to `field-defect-types.ts` |

## UX Polish

| Area | Improvement |
|------|-------------|
| **Convert to 8D** | Confirmation dialog replaced raw `<div>` overlay with accessible `Dialog` component (ARIA roles, focus trap, escape key) |
| **Create Form** | Error state now functional — validation errors from server are displayed inline |
| **Design System** | All `text-red-500`, `bg-red-50`, `dark:border-red-900`, etc. replaced with semantic tokens (`text-destructive`, `bg-destructive/10`, etc.) |
| **Design System** | Required field asterisks changed from `text-red-500` to `text-destructive` |
| **Media Uploader** | Upload drop zone is now keyboard-accessible (`role="button"`, `tabIndex`, `onKeyDown`) |
| **Media Uploader** | `alert()` calls replaced with inline error display |
| **Media Uploader** | Attachment count display added ("7 of 15 attachments uploaded") |
| **Media Uploader** | Upload zone disabled when limit reached |
| **Pagination** | Hardcoded `20` replaced with `FIELD_DEFECT_PAGE_SIZE` constant in OEM and Supplier list pages |
| **Inline `DetailRow`** | Extracted to shared `@/components/DetailRow.tsx` component |

## Permission Hardening

- Supplier cannot create, edit, assign supplier, or convert Field Defects (server-side verified)
- Attachment access follows parent Field Defect permissions (OEM or matching supplier only)
- `updateFieldDefect` action does not accept `companyId`, `oemId`, `createdById`, `convertedById`, `linkedDefectId` from client payload
- Supplier list page filters to only defects assigned to the supplier's company

## Deferred to v1.6.0

The following features are **explicitly excluded** from v1.5.1:

- SLA / escalation tracking
- Notification infrastructure for Field Defect events
- War Room view
- AI defect classification
- Similar issue detection
- Advanced field defect analytics / dashboard
- Mobile app / offline mode

---

# PlantQuality v1.5.0 — Release Notes

## Field Quality MVP

**Release Date:** 2026-04-25  
**Version:** 1.5.0

---

## Summary

PlantQuality v1.5.0 introduces the **Field Quality MVP** — a new module that enables OEM users to rapidly record, track, and manage field quality defects, connect them to suppliers, and seamlessly convert them into existing 8D/Defect workflows.

**Core promise:** "Sahadan gelen kalite problemini 60 saniyede kaydet, tedarikçiye bağla ve tek tıkla 8D'ye dönüştür."

---

## What's New

### 💥 Field Defect Management

OEM users can now create, edit, and manage field defects with rich metadata:

| Feature | Description |
|---------|-------------|
| **Create Field Defect** | `/oem/field/new` — Full form with title, description, source, severity, safety/vehicle/repeat flags |
| **Vehicle Information** | VIN (validated 17 chars), vehicle model, variant, mileage, failure date, location |
| **Part & Supplier** | Part number, part name, supplier assignment |
| **Severity Levels** | Minor, Major, Critical with color-coded badges |
| **Sources** | Field, Service, Customer, Dealer, Internal |
| **Status Workflow** | Draft → Open → Under Review → Supplier Assigned → Linked to 8D → Closed |
| **Edit** | Full editing for DRAFT/OPEN/UNDER_REVIEW/SUPPLIER_ASSIGNED statuses |

### 📁 Attachments & Media

- Upload PDF, PNG, JPG, WEBP, MP4, MOV files via `/oem/field/[id]/media`
- Presigned URL upload following existing MinIO/S3 pattern
- 20MB per file, 15 files maximum
- Soft-deleted attachment records
- Tenant-scoped access control

### 🔄 Convert to 8D

- One-click conversion from `/oem/field/[id]/convert-to-8d`
- Creates a new Defect + 8D Report stub
- Copies all relevant data (title, description, severity, supplier, vehicle info)
- Prevents duplicate conversion
- Links Field Defect → Defect bidirectionally

### 🗣️ Comments

- Both OEM and Supplier users can add comments
- Simple flat comment thread (no status workflow)
- Real-time refresh after posting

### 🔍 Search, Filters & Pagination

- Search by title, description, VIN, part number
- Filter by status, severity
- 20 items per page pagination
- Persistent filter params in URL

### 🏭 Supplier Visibility

- Supplier users see only their assigned field defects
- Read-only detail view with comments
- Links to associated 8D reports
- No create, edit, assign, or convert privileges

---

## Technical Changes

### Database

- **New Enums:** `FieldDefectSource`, `FieldDefectSeverity`, `FieldDefectStatus`
- **New Models:**
  - `FieldDefect` — core entity with dual-company FKs + vehicle data
  - `FieldDefectAttachment` — file upload model (soft delete)
  - `FieldDefectComment` — flat comment model
  - `FieldDefectEvent` — audit trail events
- **Extended Enums:** `DefectEventType` (+5 values), `NotificationType` (+3 values)
- **Relations:** Added to Company, User, Defect models

### Backend

- **Server Actions** (`src/app/(dashboard)/field/actions.ts`):
  - `getFieldDefects` — role-scoped list with search/filter
  - `getFieldDefectById` — role-scoped detail with rich includes
  - `createFieldDefect` — OEM-only creation
  - `updateFieldDefect` — status-aware updates
  - `assignSupplier` — status-aware assignment
  - `changeFieldDefectStatus` — transition validation
  - `convertTo8D` — atomic conversion with transaction
  - `addFieldDefectComment` — cross-role commenting
  - `softDeleteAttachment` — soft delete with audit

### API Routes

- `POST /api/field/attachments` — Server-side file upload (FormData) with auth, validation, S3 storage, and DB record creation in one call
- `GET /api/field/attachments/[id]` — Proxy download with tenant-scoped access control

### Frontend Routes

| Role | Route | Type |
|------|-------|------|
| OEM | `/oem/field` | List (+ filters, search, pagination) |
| OEM | `/oem/field/new` | Create form |
| OEM | `/oem/field/[id]` | Detail (with actions) |
| OEM | `/oem/field/[id]/edit` | Edit form |
| OEM | `/oem/field/[id]/media` | Media management |
| OEM | `/oem/field/[id]/convert-to-8d` | Conversion confirmation |
| Supplier | `/supplier/field` | List (assigned only) |
| Supplier | `/supplier/field/[id]` | Detail (read-only) |

### Shared Components

- `FieldDefectStatusBadge` — Color-coded status display
- `FieldDefectSeverityBadge` — Severity levels with colors
- `FieldDefectSourceBadge` — Source categories

### Shared Libraries

- `src/lib/field-defect.ts` — Client utilities (labels, transitions, VIN validation)
- `src/lib/field-defect-server.ts` — Server access control helpers

### Navigation

- Added "Field Quality" to both OEM and Supplier sidebars
- Icon: `ClipboardListIcon`
- Proper ordering in navigation menu

---

## Migration Notes

1. Apply Prisma schema: `npx prisma db push`
2. Generate Prisma client: `npx prisma generate`
3. Seed field defects: `npm run seed`

No migration SQL file needed — database already synced.

---

## Known Limitations

1. **AI Features:** No AI defect classification, similar issue detection, or warranty cost prediction
2. **Offline:** No offline mode or mobile app
3. **Advanced Analytics:** No dashboard charts for field defects yet
4. **Attachments:** Video preview not supported in UI (download only)
5. **Comments:** No rich text or markdown support in comments
6. **Batch Operations:** No bulk status changes or exports

---

## Manual QA Checklist

### OEM
- [ ] Can open /oem/field
- [ ] Can create Field Defect
- [ ] Can upload media
- [ ] Can assign supplier
- [ ] Can edit allowed fields
- [ ] Can change status
- [ ] Can convert Field Defect to 8D
- [ ] Cannot create duplicate 8D from same Field Defect
- [ ] Can see linked 8D report

### Supplier
- [ ] Can open /supplier/field
- [ ] Sees only assigned Field Defects
- [ ] Cannot see other supplier records by guessing ID
- [ ] Cannot create Field Defect
- [ ] Cannot edit Field Defect
- [ ] Cannot assign supplier
- [ ] Cannot convert Field Defect to 8D
- [ ] Can view linked 8D if permissions allow

### Regression
- [ ] Existing Defect creation still works
- [ ] Existing 8D submission still works
- [ ] Existing PPAP/IQC/FMEA pages still build
- [ ] Existing MinIO uploads still work

---

## Scoped Out for Future Releases

The following features were **explicitly excluded** from v1.5.0:

| Feature | Rationale |
|---------|-----------|
| AI Defect Classification | Not MVP |
| Similar Issue Detection | Requires AI/ML infrastructure |
| Offline Mode | Mobile app dependency |
| Mobile App | Separate product roadmap |
| Advanced Analytics | Dashboard v2 priority |
| Warranty Cost Prediction | Requires data science |
| Dealer Portal | Separate persona |
| Customer Complaint Portal | Separate persona |
| New Subscription/Paywall Logic | Business decision pending |

---

## Security Hardening (v1.5.0 Release)

Critical security issues identified during release verification and fixed:

| Issue | Severity | Fix |
|-------|----------|-----|
| Attachment download proxy bypassed auth when attachment DB record was null | 🔴 Critical | Rewrote proxy to always require DB lookup + tenant check before serving any file. Removed unsafe `contains` fallback. |
| Attachment record creation accepted unvalidated `storageKey` from client | 🔴 Critical | Added server-side validation that `storageKey` starts with `field-defects/{fieldDefectId}/`. Added `fileSize` bounds check (1–20MB). |
| Prisma updates on FieldDefect used bare `{ id }` without tenant filter | 🔴 Critical | Added `oemId` to all `where` clauses on `prisma.fieldDefect.update` calls (4 locations). |
| `"use server"` file exported non-async values (`PAGE_SIZE`, `FieldDefectRow`) | 🟡 Warning | Extracted to `src/lib/field-defect-types.ts`. |
| Presigned URL upload flow failed due to CORS (`host.docker.internal` unreachable from browser) | 🔴 Critical | Replaced with server-side FormData upload matching the existing evidence upload pattern. Removed `/api/field/attachments/record` route. |
| Media uploader made redundant `/api/session` calls for `companyId`/`userId` | 🟡 Warning | Removed client-side session fetch; API endpoint uses server-side session only. Simplified upload from presigned-URL flow to server-side FormData upload. |
| Inline `DetailRow` component caused "Cannot create component during render" lint error | 🟡 Warning | Extracted to shared `src/components/DetailRow.tsx`, imported in both OEM and Supplier detail pages. |
| Unused imports (`FIELD_DEFECT_SOURCE_LABELS`, `FIELD_DEFECT_STATUS_LABELS`, `suppliers` prop, `useTransition`) | 🟢 Nit | Removed across all affected files. |

---

## Credits

Built by the PlantX Engineering Team.  
For support: [GitHub Issues](https://github.com/anomalyco/opencode/issues)