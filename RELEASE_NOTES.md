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