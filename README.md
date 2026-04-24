# PlantQuality

PlantQuality is the supplier quality management module of the PlantX ecosystem. It helps heavy commercial vehicle OEMs and suppliers manage defect reports, 8D problem-solving workflows, review cycles, image evidence, notifications, and AI-assisted quality analysis in one lightweight web application.

## Product Scope

- OEM users create supplier defect reports with images and part-level context.
- Supplier users complete a structured 8D report: team, problem description, containment, root cause, corrective actions, implementation, prevention, and closure.
- OEM quality teams review submitted 8D reports, add section-level comments, request revisions, or approve closure.
- Company-scoped access keeps OEM and supplier data isolated.
- PRO-plan users can use AI brainstorming and image-based defect analysis.

## Tech Stack

| Area | Technology |
| --- | --- |
| App framework | Next.js 16 App Router |
| Language | TypeScript |
| UI | Tailwind CSS, shadcn/ui-style primitives, lucide-react |
| Database | PostgreSQL |
| ORM | Prisma 7 with generated client in `src/generated/prisma` |
| Auth | Auth.js / NextAuth v5, Nodemailer magic links, JWT sessions |
| Storage | Cloudflare R2 / S3-compatible presigned uploads |
| AI | OpenAI-compatible client, DeepSeek defaults |

## Repository Layout

```text
src/app                 Next.js routes, server actions, API routes
src/components          Shared UI, dashboard, defect and 8D components
src/lib                 Auth, Prisma, storage and utility modules
src/generated/prisma    Generated Prisma client
prisma                  Schema, migrations and seed data
public                  Static assets
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Cloudflare R2 or compatible S3 bucket for image upload features

### Setup

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run seed
npm run dev
```

The application runs at [http://localhost:3000](http://localhost:3000).

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

## Demo Data

`npm run seed` creates:

- 1 OEM company
- 2 supplier companies
- 6 users
- 4 sample defects

Sample login emails include `admin@oem.com`, `quality@oem.com`, `admin@supplier.com`, and `engineer@supplier.com`.

## Development Notes

- Prefer Server Components for reads and Server Actions for mutations.
- Scope every database query by `session.user.companyId` when reading tenant data.
- The 8D JSON fields use Prisma `Json?` fields mapped to JSONB columns. After schema changes, run `npm run db:push` and `npm run db:generate`.
- Portal-based popovers are used inside table cells to avoid clipping issues.

## Quality Gates

Before opening a pull request, run:

```bash
npm run lint
npm run typecheck
npm run build
```

## License

Proprietary. All rights reserved by PlantX.
