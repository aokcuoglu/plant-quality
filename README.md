# PlantX — PlantQuality

PlantQuality is the supplier quality management module of the PlantX ecosystem. It helps heavy commercial vehicle OEMs and suppliers manage defect reports, 8D problem-solving workflows, review cycles, image evidence, notifications, and AI-assisted quality analysis in one lightweight web application.

## PlantX Ecosystem

PlantX is a modular industrial platform. Each module targets a specific operational domain:

| Module | Purpose | Status |
|--------|---------|--------|
| **PlantQuality** | Supplier Quality Management (8D, Defects, PPAP, IQC, FMEA) | **Live** |
| **PlantDock** | Warehouse Gate & Logistics | Upcoming |
| **PlantQuote** | RFQ & Supplier Bidding | Upcoming |
| **PlantTrace** | Traceability & Carbon Footprint | Planned |
| **PlantAudit** | Digital Auditing (LPA, VDA) | Planned |
| **PlantAsset** | Machinery Maintenance & OEE | Planned |
| **PlantFlow** | Internal Material Flow & RFID | Planned |
| **PlantStaff** | Skill Matrix & HSE Compliance | Planned |

## Product Scope

- OEM users create supplier defect reports with images and part-level context.
- Supplier users complete a structured 8D report: team, problem description, containment, root cause, corrective actions, implementation, prevention, and closure.
- OEM quality teams review submitted 8D reports, add section-level comments, request revisions, or approve closure.
- Activity timeline tracks all defect and 8D workflow events.
- Search and pagination across defect lists with real-time filtering.
- Confirmation dialogs for critical actions (approve, reject).
- SLA reminder notifications via cron endpoint.
- PDF export of 8D reports.
- Company-scoped access keeps OEM and supplier data isolated.
- PRO-plan users can use AI brainstorming and image-based defect analysis.

## Tech Stack

| Area | Technology |
| --- | --- |
| App framework | Next.js 16 App Router |
| Language | TypeScript (strict) |
| UI | Tailwind CSS, shadcn/ui primitives, lucide-react |
| Database | PostgreSQL (JSONB) |
| ORM | Prisma 7 with generated client in `src/generated/prisma` |
| Auth | Auth.js / NextAuth v5, Nodemailer magic links, JWT sessions |
| Storage | Cloudflare R2 / S3-compatible presigned uploads |
| AI | OpenAI-compatible client, DeepSeek defaults |
| PDF | jsPDF (server-side generation) |
| Deployment | Docker Compose (Orbstack) / Vercel |

## Repository Layout

```text
src/app                 Next.js routes, server actions, API routes
src/components          Shared UI, dashboard, defect and 8D components
src/lib                 Auth, Prisma, storage, SLA notifications, event labels
src/generated/prisma    Generated Prisma client
prisma                  Schema, migrations and seed data
public                  Static assets
```

## Getting Started

### Docker (Recommended)

```bash
docker-compose up -d --build
```

The application runs at [http://localhost:3000](http://localhost:3000).

See `AGENTS.md` for full Docker development environment details.

### Local Development

Prerequisites: Node.js 22+, PostgreSQL, Cloudflare R2 or compatible S3 bucket.

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run seed
npm run dev
```

Magic link URLs are printed to the dev server console when no real SMTP service is configured.

### Useful Scripts

```bash
npm run dev          # Start local development server
npm run build        # Build production bundle
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript without emitting files
npm run db:generate  # Regenerate Prisma client
npm run db:push      # Push Prisma schema to the database
npm run db:migrate   # Create and apply a local migration
npm run seed         # Seed sample companies, users and defects
```

## Environment Variables

Use `.env.example` as the source of truth for local configuration.

Required for core app:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`

Required for image upload and retrieval:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

Required for AI features:

- `AI_API_KEY`
- `AI_BASE_URL`
- `AI_MODEL`

Required for SLA cron endpoint:

- `CRON_SECRET`

## Demo Data

`npm run seed` creates:

- 1 OEM company (PlantX Automotive)
- 2 supplier companies (Precision Parts Inc., SteelForged Co.)
- 6 users
- 4 sample defects with 8D reports

Sample login emails include `admin@oem.com`, `quality@oem.com`, `admin@supplier.com`, and `engineer@supplier.com`.

## Development Notes

- Prefer Server Components for reads and Server Actions for mutations.
- Scope every database query by `session.user.companyId` when reading tenant data.
- The 8D JSON fields use Prisma `Json?` fields mapped to JSONB columns. After schema changes, run `npm run db:push` and `npm run db:generate`.
- Portal-based popovers are used inside table cells to avoid clipping issues.
- After any code change, rebuild the Docker container: `docker-compose up -d --build app`

## Quality Gates

Before opening a pull request, run:

```bash
npm run lint
npm run typecheck
npm run build
```

## Documentation

- `AGENTS.md` — Agent reference, Docker setup, code review guidelines, design system
- `PRD.md` — Product requirements, database schema, 8D wizard details, auth architecture
- `CONTRIBUTING.md` — Contribution guidelines, security expectations

## License

Proprietary. All rights reserved by PlantX Technologies.