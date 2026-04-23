# PlantQuality - Product Requirements Document (PRD) & Architecture

## 1. Project Overview & Vision
**Product Name:** PlantQuality (A module under the PlantX ecosystem)
**Domain:** Heavy Commercial Vehicle Manufacturing (B2B SaaS)
**Goal:** Digitize the Supplier Quality Management (SQM) process. Specifically, streamline defect reporting and the 8D problem-solving methodology between Main Manufacturers (OEMs) and their Suppliers.
**Core Philosophy:** Extremely lightweight, fast, and scalable. No hardware integration, no heavy server processing. Must operate as a high-performance web application optimized for low RAM/CPU usage.

## 2. Tech Stack & Architecture

### Core Stack
* **Framework:** Next.js 16 (App Router strictly) — `proxy.ts` middleware convention (not deprecated `middleware.ts`) [DONE]
* **Language:** TypeScript (Strict mode enabled) [DONE]
* **Styling:** Tailwind CSS + shadcn/ui (Base UI primitives, minimalist B2B look) [DONE]
* **Database:** PostgreSQL (Supabase) [DONE]
* **ORM:** Prisma 7 (`@prisma/adapter-pg`, `prisma.config.ts` for config, generated client at `src/generated/prisma/`) [DONE]
* **Authentication:** NextAuth v5 / Auth.js (Nodemailer Magic Link provider, `@auth/prisma-adapter`) [DONE]
* **File Storage:** Cloudflare R2 or AWS S3 (Direct client-to-cloud uploads — not yet implemented)

### Auth & Session Architecture (JWT with Multi-Tenant Claims)
* **Strategy:** `session: { strategy: "jwt" }` (no database sessions — scalable, no per-request DB lookup) [DONE]
* **JWT Token Enrichment:** On sign-in / token refresh, the `jwt` callback queries the DB (`prisma.user.findUnique` with `include: { company }`) and embeds into the token: [DONE]
  - `token.id` — user UUID
  - `token.role` — `ADMIN` | `QUALITY_ENGINEER` | `VIEWER`
  - `token.companyId` — tenant ID for multi-tenant scoping
  - `token.companyName` — display name in topbar
  - `token.companyType` — `OEM` | `SUPPLIER` (for route-level decisions)
* **Session Shape:** `session` callback maps all token claims to `session.user` (id, role, companyId, companyName, companyType) [DONE]
* **Login Flow:** Nodemailer Magic Link (passwordless). `sendVerificationRequest` overridden to print link to console in dev; production swaps to real SMTP/Resend. [DONE]
* **Pages config:** `signIn: "/login"`, `verifyRequest: "/verify-request"` [DONE]

### Route Protection (Proxy/Middleware)
* **Proxy:** `src/proxy.ts` exports `auth as proxy` with matcher excluding `/api`, `/_next`, `/login`, `/verify-request`, `/favicon.ico` [DONE]
* **Role-Based Redirects:** Root `/` reads `session.user.companyType` — OEM users → `/oem`, Supplier users → `/supplier` [DONE]
* **Route Guards:** Each dashboard page/server action verifies `session.user.companyType` matches expected type (e.g. OEM-only routes reject Supplier tokens) [DONE]

### Core Dependencies (package.json)
* `next@16.2.4`, `react@19` [DONE]
* `next-auth@5.0.0-beta.31`, `@auth/core`, `@auth/prisma-adapter` [DONE]
* `@prisma/client@7.8.0`, `@prisma/adapter-pg`, `prisma@7.8.0` [DONE]
* `@base-ui/react` (shadcn/ui primitives), `lucide-react` [DONE]
* `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge` [DONE]

## 3. System Constraints & AI Coding Directives
* **Server Components First:** Default to React Server Components (RSC). Only use `'use client'` when interactivity or hooks (useState, useEffect) are absolutely necessary. [DONE]
* **Data Fetching:** Use Server Actions (`"use server"`) for all mutations (POST, PUT, DELETE). Use Server Components for reading data (GET) directly via Prisma. [DONE]
* **Multi-Tenancy Rule:** Every user belongs to a `Company` (Tenant). Every database query MUST scope data to the user's `companyId`. Cross-tenant data leakage is a critical security failure. [DONE]
* **UI/UX:** Use `shadcn/ui` components (Data Tables, Dialogs, Forms, Selects). Keep the design minimalist, utilizing ample whitespace and standard B2B dashboards layouts (Sidebar + Topbar + Main Content). [DONE]

## 4. User Roles & Permissions (RBAC)
* **OEM_ADMIN** (role: `ADMIN`, companyType: `OEM`) — can create defects, invite suppliers, review and approve/reject 8D reports [DONE]
* **OEM_QUALITY** (role: `QUALITY_ENGINEER`, companyType: `OEM`) — can create defects and review 8D reports [DONE]
* **SUPPLIER_ADMIN** (role: `ADMIN`, companyType: `SUPPLIER`) — can manage their company profile, invite team members, and submit 8D reports [DONE]
* **SUPPLIER_ENGINEER** (role: `QUALITY_ENGINEER`, companyType: `SUPPLIER`) — can fill out and submit 8D reports [DONE]

## 4a. Auth Flows

### Magic Link Sign-In (Nodemailer)
```
User enters email → Server Action calls signIn("nodemailer", formData)
  → Auth.js creates VerificationToken (SHA-256 hashed) in DB
  → sendVerificationRequest() logs URL to console (dev) or sends via SMTP (prod)
  → User redirected to /verify-request ("Check your email")
User clicks link → GET /api/auth/callback/nodemailer?token=...&email=...
  → Auth.js reads token from URL, hashes it, calls adapter.useVerificationToken()
  → Token found & not expired → User looked up or created (auto-provision)
  → jwt callback fires → queries company data → enriches JWT with role/companyId/companyType
  → Session cookie set → redirected to callbackUrl → / redirects to /oem or /supplier
```

### Session Validation (Per Request)
```
Request → proxy.ts (auth) → validates JWT cookie → session.user populated
  → Server Component reads session → checks companyType → renders/redirects accordingly
  → Server Action reads session → checks companyType + role → performs mutation scoped to companyId
```

## 5. UI Structure (Routes & Layouts)

### Route Map
| Route | Access | Component | Status |
|---|---|---|---|
| `/login` | Public | Magic Link email form | [DONE] |
| `/verify-request` | Public | "Check your email" page | [DONE] |
| `/` | Authenticated | Redirects to `/oem` or `/supplier` | [DONE] |
| `/oem` | OEM only | Dashboard with defect stats (total, open, awaiting 8D) | [DONE] |
| `/oem/defects` | OEM only | Defects list table (part number, description, supplier, status, date) | [DONE] |
| `/oem/defects/new` | OEM only | Create defect form (supplier dropdown, part number, description) | [DONE] |
| `/supplier` | Supplier only | Dashboard with defect stats (total, awaiting 8D, resolved) | [DONE] |

### Dashboard Layout (`(dashboard)`)
- **Sidebar** (w-64): logo/brand → nav links (role-filtered) [DONE]
- **Topbar**: company name (left) + email + sign out button (right) [DONE]
- **Main content**: `{children}` from nested routes [DONE]

## 6. Development & Operations
* **Seed command:** `npx tsx prisma/seed.ts` (creates 2 companies, 4 users, 4 sample defects) [DONE]
* **Migration workflow:** `npx prisma migrate dev` (Prisma 7 config at `prisma.config.ts`, no `directUrl`) [DONE]
* **DB connection:** Direct PostgreSQL on port 5432 (pooling on 6543 unavailable in Prisma 7) [DONE]

## 7. Database Schema (Prisma Blueprint)

```prisma
// This is the core schema to be used by Prisma.

enum CompanyType {
  OEM
  SUPPLIER
}

enum Role {
  ADMIN
  QUALITY_ENGINEER
  VIEWER
}

enum DefectStatus {
  OPEN
  IN_PROGRESS
  WAITING_APPROVAL
  RESOLVED
  REJECTED
}

model Company {
  id             String    @id @default(uuid())
  name           String
  type           CompanyType
  taxNumber      String?
  users          User[]
  // Relations for Defects
  defectsAsOem   Defect[]  @relation("OemDefects")
  defectsAsSup   Defect[]  @relation("SupplierDefects")
  createdAt      DateTime  @default(now())
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  role      Role     @default(VIEWER)
  companyId String
  company   Company  @relation(fields: [companyId], references: [id])
  createdAt DateTime @default(now())
}

model Defect {
  id           String         @id @default(uuid())
  oemId        String
  oem          Company        @relation("OemDefects", fields: [oemId], references: [id])
  supplierId   String
  supplier     Company        @relation("SupplierDefects", fields: [supplierId], references: [id])
  partNumber   String
  description  String
  status       DefectStatus   @default(OPEN)
  imageUrls    String[]       // Array of S3/R2 URLs
  eightDReport EightDReport?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}

model EightDReport {
  id             String   @id @default(uuid())
  defectId       String   @unique
  defect         Defect   @relation(fields: [defectId], references: [id])
  d1_team        String?
  d2_problem     String?
  d3_containment String?
  d4_rootCause   String?
  d5_d6_action   String?
  d7_preventive  String?
  d8_recognition String?
  submittedAt    DateTime?
  updatedAt      DateTime @updatedAt
}