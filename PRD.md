# PlantQuality — PRD & Architecture

## 1. Project Overview
**Product:** PlantQuality (PlantX ecosystem module)
**Domain:** Heavy Commercial Vehicle Manufacturing (B2B SaaS)
**Goal:** Digitize Supplier Quality Management (SQM) — defect reporting and the 8D problem-solving methodology between OEMs and Suppliers.
**Philosophy:** Lightweight, fast, scalable. No hardware integration. High-performance web app optimized for low RAM/CPU.

## 2. Tech Stack

| Layer | Technology | Status |
|-------|-----------|--------|
| Framework | Next.js 16 (App Router), proxy.ts middleware | DONE |
| Language | TypeScript (strict) | DONE |
| Styling | Tailwind CSS + shadcn/ui primitives | DONE |
| Database | PostgreSQL (Supabase) | DONE |
| ORM | Prisma 7 (`prisma.config.ts`, output `src/generated/prisma/`) | DONE |
| Auth | NextAuth v5 / Auth.js (Nodemailer Magic Link, JWT strategy) | DONE |
| File Storage | Cloudflare R2 / AWS S3-compatible presigned uploads + image proxy | DONE |

### Key Dependencies
- `next@16.2.4`, `react@19`
- `next-auth@5.0.0-beta.31`, `@auth/prisma-adapter`
- `@prisma/client@7.8.0`, `@prisma/adapter-pg`, `prisma@7.8.0`
- `lucide-react`, `date-fns`
- `tailwindcss`, `cva`, `clsx`, `tailwind-merge`

## 3. Auth & Session Architecture

### Strategy
- **JWT-only** (`session: { strategy: "jwt" }`) — no DB lookups per request.
- **Token enrichment** (jwt callback): queries `prisma.user.findUnique({ include: { company } })`, embeds:
  - `id`, `role`, `plan`, `companyId`, `companyName`, `companyType`
- **Session shape:** `session` callback maps all claims to `session.user`.
- **Login:** Nodemailer Magic Link (passwordless). Dev prints link to console; production uses SMTP/Resend.
- **Pages:** `signIn: "/login"`, `verifyRequest: "/verify-request"`

### Plans (Subscription)
- `BASIC` — no AI features
- `PRO` — AI Brainstorm access (Deepseek API)

## 4. Route Protection

- **Proxy:** `src/proxy.ts` exports `auth as proxy` — matcher excludes `/api`, `/_next`, `/login`, `/verify-request`, `/favicon.ico`
- **Root redirect:** `/` reads `companyType` → `/oem` or `/supplier`
- **Route guards:** Each page/server action verifies `companyType` matches expected role.

## 5. User Roles & Permissions

| Role | companyType | Capabilities |
|------|-------------|-------------|
| ADMIN | OEM | Create defects, review/approve 8D |
| QUALITY_ENGINEER | OEM | Create defects, review 8D |
| ADMIN | SUPPLIER | Manage supplier-side quality workflow, submit 8D |
| QUALITY_ENGINEER | SUPPLIER | Fill and submit 8D reports |
| VIEWER | OEM/SUPPLIER | Read-only role reserved for future access control hardening |

## 6. Route Map

| Route | Access | Content | Status |
|-------|--------|---------|--------|
| `/login` | Public | Magic Link form | DONE |
| `/verify-request` | Public | "Check your email" | DONE |
| `/` | Auth | Redirect to `/oem` or `/supplier` | DONE |
| `/oem` | OEM only | Dashboard (stats, charts) | DONE |
| `/oem/defects` | OEM only | Defect list table | DONE |
| `/oem/defects/new` | OEM only | Create defect form | DONE |
| `/oem/defects/[id]` | OEM only | Defect detail + 8D review | DONE |
| `/oem/defects/[id]/8d` | OEM only | Review 8D report with comments | DONE |
| `/supplier` | Supplier only | Dashboard (stats) | DONE |
| `/supplier/defects` | Supplier only | Defect list | DONE |
| `/supplier/defects/[id]` | Supplier only | Defect detail | DONE |
| `/supplier/defects/[id]/8d` | Supplier only | 8D Wizard (6-step form) | DONE |

### Layout (`(dashboard)`)
- Sidebar (w-64): logo + role-filtered nav links
- Topbar: company name + email + sign out
- Main content: `{children}`

## 7. Database Schema (Current)

### Enums
- `CompanyType`: `OEM | SUPPLIER`
- `Role`: `ADMIN | QUALITY_ENGINEER | VIEWER`
- `Plan`: `BASIC | PRO`
- `NotificationType`: `INFO | REVISION | NEW_DEFECT`
- `ReviewCommentStatus`: `OPEN | RESOLVED`
- `DefectEventType`: `CREATED | EIGHT_D_STARTED | EIGHT_D_STEP_SAVED | EIGHT_D_SUBMITTED | REVIEW_COMMENT_ADDED | REVIEW_COMMENT_RESPONDED | REVIEW_COMMENT_RESOLVED | REVIEW_COMMENT_REOPENED | REVISION_REQUESTED | APPROVED`
- `DefectStatus`: `OPEN | IN_PROGRESS | WAITING_APPROVAL | RESOLVED | REJECTED`

### Models

#### Company (`companies`)
`id`, `name`, `type` (CompanyType), `taxNumber?`, `createdAt`

#### User (`users`)
`id`, `email` (unique), `name?`, `emailVerified?`, `image?`, `role` (Role), `plan` (Plan), `companyId` → Company, `createdAt`

#### Account (`accounts`), Session (`sessions`), VerificationToken (`verification_tokens`)
Standard Auth.js tables.

#### Defect (`defects`)
`id`, `oemId` → Company (OemDefects), `supplierId` → Company (SupplierDefects), `partNumber`, `description`, `status` (DefectStatus), `imageUrls` (String[]), `createdAt`, `updatedAt`, `resolvedAt?`

#### EightDReport (`eight_d_reports`)

| Prisma Field | DB Column | Type | Notes |
|-------------|-----------|------|-------|
| `team` | `d1_team` | `Json?` | Array of `TeamMember` objects (userId, userName, role) |
| `containmentActions` | `d3_containment` | `Json?` | Array of `ContainmentAction` objects |
| `d5Actions` | `d5_actions` | `Json?` | Array of `D5Action` objects |
| `d6Actions` | `d6_actions` | `Json?` | Array of `D6Action` objects |
| `d7Impacts` | `d7_impacts` | `Json?` | Array of `D7Impact` objects |
| `d7Preventive` | `d7_preventive` | `String?` | Plain text |
| `d2_problem` | `d2_problem` | `String?` | Plain text |
| `d4_rootCause` | `d4_rootCause` | `String?` | Plain text |
| `d5_d6_action` | `d5_d6_action` | `String?` | Legacy — kept for compat |
| `d8_recognition` | `d8_recognition` | `String?` | Plain text |
| `submittedAt` | `submitted_at` | `DateTime?` | Set on final submit |

**⚠️ CRITICAL — Schema sync:** JSONB columns (`d1_team`, `d3_containment`, `d5_actions`, `d6_actions`, `d7_impacts`) were originally TEXT columns in the initial migration. When changing the Prisma schema from `String?` to `Json?` with `@map`, you must:
1. Run `prisma db push` to ALTER column types to `jsonb` — migration files alone won't do this for `@map` renames
2. If `prisma migrate dev` says "already in sync", run `prisma db push` explicitly OR manually `ALTER COLUMN ... TYPE jsonb USING ...::jsonb`
3. Always run `prisma generate` after schema changes and restart the Next.js dev server

#### ReviewComment (`review_comments`)
`id`, `reportId` → EightDReport, `stepId`, `comment`, `status` (`OPEN | RESOLVED`), `supplierResponse?`, `resolvedAt?`, `resolvedById?` → User, `authorId` → User, `createdAt`

#### Notification (`notifications`)
`id`, `userId` → User, `message`, `type` (NotificationType), `link?`, `isRead` (default false), `createdAt`

#### DefectEvent (`defect_events`)
Append-only audit trail for defect and 8D workflow events. Stores `defectId`, `type`, optional `actorId`, optional `metadata` JSON, and `createdAt`.

### JSONB Data Shapes (server action types in `src/app/(dashboard)/supplier/defects/actions/8d.ts`)

```typescript
TeamMember { id, userId, userName, role: "champion" | "teamLeader" | "member" }
ContainmentAction { id, description, responsibleUserId, responsibleName, effectiveness, targetDate, actualDate }
RootCauseEntry { id, cause, contribution }  // stored as d4_rootCause text
D5Action { id, action, verificationMethod, effectiveness }
D6Action { id, actionId, actionDescription, targetDate, actualDate, validatedByUserId, validatedByName }
D7Impact { id, documentType, revisionNo }
```

## 8. 8D Wizard — Implementation Details

### Form Component
`EightDWizardForm.tsx` — 6-step wizard with step indicator, save/next/back.

### Step Map

| Step | Title | Inputs |
|------|-------|--------|
| D1 | Team | Dynamic rows: UserSearchSelect (searchable user dropdown) + Role Select (champion/teamLeader/member) |
| D2 | Problem | Textarea + AI Brainstorm (PRO) + per-image Vision Analysis |
| D3 | Containment | Table: Action, Responsible (UserSearchSelect), % Effectiveness, Target/Actual Date (DatePicker) |
| D4 | Root Cause | Table: Cause + % Contribution (0-100, live total validation) |
| D5 | Action Plan | Table: Action, Verification Method, % Effectiveness + AI Brainstorm (PRO) |
| D6 | Implementation | Table linked to D5 via select + Target/Actual Date + Validated By (UserSearchSelect) |
| D7 | Prevention | Checkbox multi-select (Control Plan, FMEA, Work Instructions, Training Logs, Process Flow Chart) + Revision No + Preventive textarea + AI Brainstorm (PRO) |
| D8 | Recognition | Textarea |

### Key Patterns
- **UserSearchSelect** (`src/components/defects/UserSearchSelect.tsx`): Searchable dropdown with `createPortal` + `position: fixed` positioning (solves table cell clipping). Uses `click` event for outside detection (not `mousedown` — which breaks input focus in portals).
- **DatePicker** (`src/components/defects/DatePicker.tsx`): Same portal pattern. Both components use `dropdownRef` for portal element in the outside-click handler.
- **Row IDs**: `genId()` → `row_${counter++}_${Date.now()}` — stable unique keys across renders.
- **AI Integration**: PRO-plan users get brainstorm buttons. Markdown stripped both at prompt level ("no markdown") and client side (regex fallback).
- **Server action routing**: `saveEightDStep` routes form keys by prefix — `d1_`/`d3_`/`d5_`/`d6_`/`d7_` → JSONB; all others → scalar text fields. **IMPORTANT:** use Prisma field names (e.g., `team` not `d1_team`, `d5Actions` not `d5_actions`) since `@map` handles the DB column mapping.
- **Page hydration**: `src/app/(dashboard)/supplier/defects/[id]/8d/page.tsx` serializes JSONB fields with `JSON.stringify` for initial data. Form hydrates with `parseJsonSafe<T>()`.

## 9. AI Integration

- **Endpoint:** `POST /api/ai/suggest` (PRO-gated server-side)
- **Provider:** Deepseek (configurable via `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` env vars)
- **Per-step prompts:** D2 (problem description), D3 (containment actions), D4 (root cause analysis), D7 (preventive actions)
- **Vision:** D2 has per-image "Analyze" buttons for uploaded defect images

## 10. Notification Flow

- OEM creates defect → Notification to all users in the supplier company
- Supplier submits 8D → Notification to all users in the OEM company
- OEM comments/approves/rejects → Notification to all users in the supplier company
- Type `REVISION` used when OEM requests changes

## 11. Development & Operations

- **Seed:** `npx tsx prisma/seed.ts` (2 companies, 6 users, 4 sample defects with images)
- **Migration:** `npx prisma migrate dev` — but for JSONB column type changes, use `prisma db push` (or manual ALTER) + `prisma generate`
- **DB connection:** Direct PostgreSQL (port 5432). Supabase pooler (6543) not used.
- **Dev server restart required** after `prisma generate` to pick up new Prisma client types.

### Migration Workflow (JSONB Pitfall)
```
# After changing String? → Json? with @map in Prisma schema:
npx prisma migrate dev              # Creates migration file but won't ALTER column type
npx prisma db push                  # Actually ALTERs columns to jsonb
npx prisma generate                 # Regenerates client
# Restart Next.js dev server
```

If you see `Argument "d1_team": Expected String or Null, provided (Object)` or `column eight_d_reports.d5_actions does not exist`, run `prisma db push` + `prisma generate`.

## 12. Coding Directives

- **Server Components first** — `'use client'` only for interactivity.
- **Server Actions** (`"use server"`) for mutations. Server Components for reads via Prisma.
- **Multi-tenancy:** Every query scoped to `session.user.companyId`. Cross-tenant leakage is a critical security failure.
- **shadcn/ui** components for all UI. Minimalist B2B design.
- **Portal-based popovers** inside table cells: use `createPortal` + `position: fixed` based on trigger button `getBoundingClientRect()`. Always use `ref` for both parent and portal elements in outside-click handlers.

## 13. Key Files Reference

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Full schema with enums, JSONB columns, @map directives |
| `src/lib/auth.ts` | Auth.js config (JWT, Nodemailer, token enrichment) |
| `src/proxy.ts` | Route protection middleware |
| `src/lib/prisma.ts` | Prisma client singleton |
| `src/app/(dashboard)/supplier/defects/actions/8d.ts` | Server actions + typed interfaces for JSONB data |
| `src/components/defects/EightDWizardForm.tsx` | 6-step 8D wizard form |
| `src/components/defects/UserSearchSelect.tsx` | Portal-based user search dropdown |
| `src/components/defects/DatePicker.tsx` | Portal-based date picker |
| `src/app/api/users/search/route.ts` | GET same-company users |
| `src/app/api/ai/suggest/route.ts` | AI brainstorm (PRO-gated) |
| `prisma/seed.ts` | Sample data seeder |
