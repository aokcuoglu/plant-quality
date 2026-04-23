# PlantQuality - Product Requirements Document (PRD) & Architecture

## 1. Project Overview & Vision
**Product Name:** PlantQuality (A module under the PlantX ecosystem)
**Domain:** Heavy Commercial Vehicle Manufacturing (B2B SaaS)
**Goal:** Digitize the Supplier Quality Management (SQM) process. Specifically, streamline defect reporting and the 8D problem-solving methodology between Main Manufacturers (OEMs) and their Suppliers.
**Core Philosophy:** Extremely lightweight, fast, and scalable. No hardware integration, no heavy server processing. Must operate as a high-performance web application optimized for low RAM/CPU usage.

## 2. Tech Stack & Architecture
* **Framework:** Next.js 14+ (App Router strictly)
* **Language:** TypeScript (Strict mode enabled)
* **Styling:** Tailwind CSS + shadcn/ui (Clean, professional B2B look)
* **Database:** PostgreSQL (Relational integrity is crucial)
* **ORM:** Prisma
* **Authentication:** NextAuth.js (v5 / Auth.js) or Supabase Auth. Must support Multi-tenant logic.
* **File Storage:** Cloudflare R2 or AWS S3 (Direct client-to-cloud uploads to prevent server memory bloat. Do not process images on the Node.js server).

## 3. System Constraints & AI Coding Directives
* **Server Components First:** Default to React Server Components (RSC). Only use `'use client'` when interactivity or hooks (useState, useEffect) are absolutely necessary.
* **Data Fetching:** Use Server Actions for all mutations (POST, PUT, DELETE). Use Server Components for reading data (GET) directly via Prisma.
* **Multi-Tenancy Rule:** Every user belongs to a `Company` (Tenant). Every database query MUST scope data to the user's `companyId`. Cross-tenant data leakage is a critical security failure.
* **UI/UX:** Use `shadcn/ui` components (Data Tables, Dialogs, Forms, Selects). Keep the design minimalist, utilizing ample whitespace and standard B2B dashboards layouts (Sidebar + Topbar + Main Content).

## 4. User Roles & Permissions (RBAC)
* **OEM_ADMIN:** Can create defects, invite suppliers, review and approve/reject 8D reports.
* **OEM_QUALITY:** Can create defects and review 8D reports.
* **SUPPLIER_ADMIN:** Can manage their company profile, invite team members, and submit 8D reports.
* **SUPPLIER_ENGINEER:** Can fill out and submit 8D reports.

## 5. Database Schema (Prisma Blueprint)

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
  WAITING_8D
  RESOLVED
  CLOSED
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