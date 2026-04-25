# PlantX — Agent Reference

> Last updated: 2026-04-25
## Docker Development Environment

This project runs locally via Docker Compose on Orbstack (macOS).

### Architecture

| Service    | Image                 | Host Port   | Purpose                  |
|------------|----------------------|-------------|--------------------------|
| `app`      | `plant-quality-app`  | `3000`      | Next.js 16 application   |
| `db`       | `postgres:16-alpine` | `5432`      | PostgreSQL database      |
| `minio`    | `minio/minio`        | `9000/9001` | S3-compatible storage    |
| `mailpit`  | `axllent/mailpit`    | `1025/8025` | SMTP catcher + web UI    |

### Quick Start

```bash
docker-compose up -d          # Start everything
docker-compose logs -f app  # Tail app logs
docker-compose down -v      # Stop + remove volumes
```

### Local Endpoints

| Service            | URL                        | Credentials           |
|--------------------|---------------------------|-----------------------|
| Application        | http://localhost:3000     | —                     |
| MinIO API          | http://localhost:9000     | `minioadmin/minioadmin` |
| MinIO Console      | http://localhost:9001     | `minioadmin/minioadmin` |
| Mailpit Web UI     | http://localhost:8025     | —                     |
| PostgreSQL         | `localhost:5432`          | `postgres/postgres`     |

### Environment

- `.env.docker` — used **only** by Docker Compose (never commit!)
- `.env.docker.example` — template for new developers

### Build Notes

- `output: "standalone"` is required in `next.config.ts` for containerized build
- Dockerfile uses multi-stage build (deps → builder → runner)
- `node_modules` is copied to runner stage for Prisma CLI + TS execution
- Entrypoint: `migrate deploy` → `prisma generate` → `db seed` → `node server.js`

### Deploying Code Changes

**After making ANY code change, you MUST rebuild and restart the Docker container for changes to take effect.** The app runs in production mode inside Docker — hot-reload is NOT available.

```bash
docker-compose up -d --build app
```

This single command rebuilds the app image and restarts the container. Other services (db, minio, mailpit) are unaffected.

If only the database schema changed (Prisma migrations), a simpler restart suffices:

```bash
docker-compose restart app
```

> **Rule:** Never consider a code change "done" until `docker-compose up -d --build app` has been run and the app is serving the new code at `http://localhost:3000`.

### Auth in Development

Two login methods are available:

1. **Dev Mode (Credentials)** — select any seeded user from dropdown, instant login
2. **Magic Link** — Mailpit catches emails at `localhost:8025`

> The `credentials` provider is **dev-only** and bypasses OAuth/email flow.

### Database

```bash
# Connect from host
psql -h localhost -U postgres -d plantx

# Connect from another container
docker exec -it plantx-db psql -U postgres -d plantx
```

### Troubleshooting

| Issue                              | Fix                                                  |
|------------------------------------|------------------------------------------------------|
| Connection refused (PostgreSQL)    | Ensure port `5432` is mapped in docker-compose.yml   |
| CSRF errors during login           | `trustHost: true` is set in `src/lib/auth.ts`        |
| `Missing env: R2_ACCOUNT_ID` build | `.env.docker` is injected during build stage         |
| Verification link fails            | Check `AUTH_URL` matches actual host:port          |
| Mailpit empty                      | Check `EMAIL_SERVER` points to `plantx-mail:1025`    |
| Magic link redirects to login        | Verify cookie domain; use `localhost`, not `127.0.0.1` |

### Reset Everything

```bash
docker-compose down -v
rm -rf postgres_data minio_data
docker-compose up -d --build
```

## Production

Do NOT use `.env.docker` in production. Replace with:
- **Supabase** → `DATABASE_URL`
- **Cloudflare R2** → `R2_*` credentials
- **Resend** → `EMAIL_SERVER` with actual API key

---

## Legacy Notes

- Previously used Supabase PostgreSQL directly during dev
- Previously ran `npm run dev` on host machine
- Now fully containerized for clean, reproducible local stacks

---

## Code Review Agent Prompt

> **Usage:** Feed this entire section into a sub-agent when requesting code review. The sub-agent does not have automatic project context — include the changed files or relevant code blocks in your prompt.

### System Role

You are a senior software engineer performing a code review for the **PlantQuality** project. You enforce the project's architecture rules, security constraints, and coding directives. Be concise but thorough. Do not approve code that violates hard requirements.

### Project Context

- **Stack:** Next.js 16 (App Router), TypeScript strict, Tailwind CSS, shadcn/ui, Prisma 7, PostgreSQL (JSONB), Auth.js v5 (JWT strategy).
- **Auth:** JWT-only sessions enriched with `user.id`, `role`, `plan`, `companyId`, `companyName`, `companyType`.
- **Patterns:** Server Components by default; `'use client'` only for interactivity. Mutations via Server Actions (`"use server"`).
- **Multi-tenancy:** Every DB query MUST be scoped to `session.user.companyId`. Cross-tenant data access is a critical security failure.
- **JSONB:** Several tables use JSONB columns with `@map` (e.g., `team` → `d1_team`, `d5Actions` → `d5_actions`). In Prisma queries, use the **Prisma field name** (e.g., `team`), not the DB column name. Ensure JSON shapes match the documented interfaces.
- **Portal Patterns:** Dropdowns inside tables MUST use `createPortal` + `position: fixed` based on trigger `getBoundingClientRect()`. Outside-click handler MUST use `ref` for both parent and portal elements. Use `click` (not `mousedown`) for outside detection to preserve input focus.

### Review Checklist

For every change, verify the following. Flag any violation with the file path and line number if applicable.

1. **Multi-tenancy & Authorization**
   - [ ] Every Prisma query includes `companyId` (or `oemId`/`supplierId` derived from the session) in its `where` clause.
   - [ ] Server Actions verify the actor's `role` and `companyType` before mutating or returning data.
   - [ ] No raw SQL without `companyId` filtering.
   - [ ] No data is returned to the client that belongs to a different `companyId`.

2. **Server vs. Client Boundaries**
   - [ ] `'use client'` is only used when necessary (interactivity, hooks, browser APIs). Data fetching should happen in Server Components.
   - [ ] `"use server"` files do not import client-only modules (React hooks, browser APIs, `window`, `document`).
   - [ ] Serializing JSONB to the client uses safe parsing; `JSON.stringify` is used for initial props where needed.

3. **Type Safety & Prisma**
   - [ ] No `any`. Prefer `unknown` with type guards if runtime variance is needed.
   - [ ] Prisma JSONB fields use the correct Prisma model field names (not `@map` DB column names) in queries.
   - [ ] JSONB data structures match the documented shapes (`TeamMember`, `ContainmentAction`, `D5Action`, etc.).
   - [ ] Type assertions (`as`) are justified; avoid casting to bypass strictness.

4. **Security**
   - [ ] No secrets or env vars exposed to the client.
   - [ ] No SQL injection vectors; use Prisma ORM. If raw queries exist, validate inputs.
   - [ ] AI endpoints (`/api/ai/suggest`) are gated by `plan === 'PRO'`.
   - [ ] File uploads use presigned URLs; no direct client-to-storage credentials.
   - [ ] Authentication checks exist before mutation/reads in API routes and Server Actions.

5. **Performance**
   - [ ] No N+1 queries. Use `include` or batched queries where appropriate.
   - [ ] Server Components do not trigger unnecessary re-renders by passing non-memoized objects to children.
   - [ ] Images use Next.js `<Image>` with optimization where possible.
   - [ ] No heavy computations on the client if they can be done server-side.

6. **UX & UI Patterns**
   - [ ] shadcn/ui primitives are used instead of one-off custom components unless justified.
   - [ ] `UserSearchSelect` and `DatePicker` inside tables follow the portal + `position: fixed` pattern.
   - [ ] Form validation messages are user-friendly.
   - [ ] Loading and error states are handled (skeletons, error boundaries, or fallback UI).

7. **Code Quality**
   - [ ] Variable and function names are descriptive.
   - [ ] Complex logic is commented; no obvious comments (`// increment i`).
   - [ ] No dead code, unused imports, or console logs (except in dev-only blocks).
   - [ ] Magic strings/numbers are constantized if reused.
   - [ ] Error handling is explicit; do not swallow errors silently.

### Output Format

Provide your review as structured Markdown:

```markdown
## Summary
Brief overall assessment (2-3 sentences).

### Issues
| # | Severity | File | Line | Category | Description | Suggestion |
|---|----------|------|------|----------|-------------|------------|
| 1 | 🔴 Critical | `...` | 42 | Security | ... | ... |
| 2 | 🟡 Warning | `...` | 88 | Performance | ... | ... |
| 3 | 🟢 Nit | `...` | 12 | Style | ... | ... |

### Verdict
- **Status:** ✅ Approved / ⚠️ Approved with comments / ❌ Request changes
- **Required changes:** (list if any)
```

Severity definitions:
- **🔴 Critical:** Security vulnerability, cross-tenant leak, broken auth, data loss risk, type error that breaks build.
- **🟡 Warning:** Performance issue, maintainability problem, missing error handling, deviation from project patterns.
- **🟢 Nit:** Style preference, naming, missing superficial comments, minor optimization.

### Special Focus Areas for PlantQuality

- **8D Wizard (`EightDWizardForm.tsx`, `8d.ts`):** Ensure row IDs remain stable (`genId()` pattern). Validate percentage totals (e.g., D4 contribution sum) on both client and server. Check that AI brainstorm helpers are PRO-gated.
- **Notifications:** Verify that notification creation targets the correct company users and does not leak across tenants.
- **Defect Events:** Ensure `defect_events` writes use the correct `DefectEventType` and include actor metadata safely.
- **Schema Changes:** If Prisma schema is modified, remind to run `prisma db push` for JSONB column type changes, then `prisma generate`, and restart the dev server.

---

## Design System Agent Prompt

> **Usage:** Include this entire section in your prompt when asking any AI to create or modify UI. This eliminates theme inconsistencies and ensures every new piece of UI matches PlantQuality's established design language.

### Philosophy

- **Semantic-first**: Every color MUST be a CSS design-token (`bg-background`, `text-foreground`, etc.). Hard-coded hex colors (`bg-[#0a0c10]`, `text-slate-700`, etc.) are strictly forbidden.
- **shadcn/ui primitives first**: If a component exists in `src/components/ui/`, USE it. Do not rebuild.
- **Theme-safe**: The app supports **Light / Dark / System** via `next-themes`. Your code must render correctly in all three modes without any dark/light manual overrides.
- **Emerald accent**: Brand color is emerald (`text-emerald-400`, `bg-emerald-500`, `bg-emerald-500/10`). Preserve it for CTAs, active states, and primary actions.

---

### Color Tokens — Reference Table

| Layer | Light Value | Dark Value | Tailwind Class |
|-------|------------|-----------|----------------|
| **Background** | `oklch(1 0 0)` (white) | `oklch(0.145 0 0)` (near-black) | `bg-background` |
| **Foreground** | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` (near-white) | `text-foreground` |
| **Card** | `oklch(1 0 0)` | `oklch(0.205 0 0)` | `bg-card` / `text-card-foreground` |
| **Popover** | `oklch(1 0 0)` | `oklch(0.205 0 0)` | `bg-popover` / `text-popover-foreground` |
| **Sidebar** | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` | `bg-sidebar` / `text-sidebar-foreground` |
| **Muted** | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | `bg-muted` / `text-muted-foreground` |
| **Primary** | `oklch(0.205 0 0)` | `oklch(0.922 0 0)` | `bg-primary` / `text-primary-foreground` |
| **Secondary** | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | `bg-secondary` / `text-secondary-foreground` |
| **Accent** | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | `bg-accent` / `text-accent-foreground` |
| **Border** | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` | `border-border` |
| **Destructive** | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` | `bg-destructive` / `text-destructive` |
| **Sidebar Accent** | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | `hover:bg-sidebar-accent` |
| **Sidebar Border** | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` | `border-sidebar-border` |
| **Brand** | `oklch(0.696 0.17 162.5)` (emerald) | same | `text-emerald-400`, `bg-emerald-500`, `bg-emerald-500/10` |

**Chart Colors:**
| Token | Light | Dark |
|-------|-------|------|
| `--chart-1` | `oklch(0.87 0 0)` | same |
| `--chart-2` | `oklch(0.556 0 0)` | same |
| `--chart-3` | `oklch(0.439 0 0)` | same |
| `--chart-4` | `oklch(0.371 0 0)` | same |
| `--chart-5` | `oklch(0.269 0 0)` | same |

### ❌ NEVER USE / ✅ ALWAYS USE

| ❌ Forbidden | ✅ Required |
|-------------|-------------|
| `bg-[#0a0c10]`, `bg-[#0b0e14]` | `bg-background`, `bg-sidebar`, `bg-card` |
| `text-slate-100`, `text-slate-200`, `text-slate-300`, `text-slate-400`, `text-slate-500`, `text-slate-600`, `text-slate-700`, `text-slate-800` | `text-foreground`, `text-muted-foreground`, `text-sidebar-foreground` |
| `border-slate-700`, `border-slate-700/50`, `border-slate-800/60` | `border-border`, `border-sidebar-border` |
| `bg-slate-800`, `bg-slate-900`, `bg-slate-950` | `bg-card`, `bg-muted`, `bg-popover` |
| `text-white` | `text-foreground` (or `text-primary-foreground` on `bg-primary`) |
| `hover:bg-slate-700/40`, `hover:bg-slate-800/60` | `hover:bg-sidebar-accent`, `hover:bg-accent` |
| Inline `dark:` manual overrides | Trust the `.dark` class + CSS variables |
| `bg-black` for tooltips/popovers | `bg-popover text-popover-foreground` |

---

### Layout Patterns

```
Dashboard (any page under /app/(dashboard)):
┌──────────────────────────────────────────┐
│ Sidebar (w-64 / w-16) │ Header (h-14)    │
│                       ├──────────────────┤
│ bg-sidebar            │ Main Content     │
│ border-r              │ bg-background    │
│                       │ p-6              │
│ ThemeToggle           │                  │
│ Sign Out              │                  │
└───────────────────────┴──────────────────┘
```

| Pattern | Tailwind Classes |
|---------|-----------------|
| **Page wrapper** | `space-y-6` inside `<main className="...">` |
| **Header bar** | `h-14 shrink-0 border-b border-border bg-sidebar px-6` |
| **Sidebar** | `w-64 / w-16` (collapsible), `bg-sidebar border-r border-sidebar-border` |
| **Card grid (KPIs)** | `grid gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` |
| **Two-column detail** | `grid gap-6 lg:grid-cols-[2fr_1fr]` |
| **Table container** | `rounded-lg border bg-card` wrapping `table` |
| **Loading skeleton** | `bg-muted` / `bg-muted/60` with `animate-pulse` |
| **Empty state** | Centered icon (`text-muted-foreground/50`) + message + CTA button |

---

### Typography Patterns

| Hierarchy | Tailwind |
|-----------|----------|
| Page title | `text-xl font-semibold tracking-tight text-foreground` |
| Section title | `text-lg font-semibold text-foreground` |
| Card title | `text-sm font-medium text-foreground` |
| Body text | `text-sm text-muted-foreground` |
| Label / helper | `text-xs text-muted-foreground` |
| Badge / pill | `text-[10px] font-semibold tracking-wider uppercase` |
| Table header | `text-xs font-medium uppercase tracking-wider text-muted-foreground` |
| Big metric value | `text-3xl font-bold tracking-tight text-foreground` |

---

### Existing Components — REUSE BEFORE REBUILD

**Layout**
- `Sidebar` — collapsible, theme-aware, includes `ThemeToggle` + `SignOutButton`
- `DashboardLayout` — sidebar + header + main content
- `PageHeader` — title + description + optional actions slot

**Cards**
- `DashboardCard` — icon + big value + subtitle, optional `href`
- `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter` — shadcn/ui

**Charts** (Recharts-based)
- `StatusDonut` — PieChart donut with tooltip
- `SupplierBar` / `CustomerBar` — horizontal bar charts
- `TrendArea` — area chart with gradient fill

**Forms & Interactive**
- `UserSearchSelect` — portal-based searchable dropdown (MUST use in tables)
- `DatePicker` — portal-based date picker
- `ImageUploader` — presigned URL upload flow

**Defect-Specific**
- `EightDWizardForm` — 6-step stepper
- `StatusBadge` — colored dot + label per `DefectStatus`
- `UpgradeModal` — PRO-plan gate

**Overlays**
- `Dialog`, `Tooltip`, `DropdownMenu`, `Popover` — shadcn/ui primitives
- NotificationBell — dropdown with unread count + mark-as-read

---

### The Theme Toggle (already built)

- **Location:** Sidebar footer (above Sign Out)
- **Modes:** Light ☀️ / Dark 🌙 / System 🖥️
- **Collapsed state:** Icon-only, dropdown opens to the right
- **Expanded state:** Icon + label, dropdown opens above
- **Do NOT recreate** — import and use existing `ThemeToggle` component

---

### Prompt Templates for Design Tasks

Use these exact formulas when requesting UI from any AI:

**Template A — New Dashboard Page**
```
Add a new page at `/oem/{slug}` inside the `(dashboard)` layout.
Use PageHeader for the title. Layout: {card grid / two-column / table}.
Reuse existing {DashboardCard / Table / Chart}. Theme-safe semantic tokens only.
```

**Template B — New Form / Settings**
```
Add a settings panel to {existing page} using Card components.
Form fields: {list}. Use Input, Select, Textarea from shadcn/ui.
Mutation: Server Action with optimistic update. Theme-safe.
```

**Template C — New Wizard Step**
```
Add step D{X} to EightDWizardForm between D{prev} and D{next}.
Use the same patterns as D3 (table with inline editing + portal dropdowns).
Include AI Brainstorm button (PRO-gated using existing gate).
Save via saveEightDStep with prefix d{X}_.
```

**Template D — New Chart Component**
```
Add a new chart `{Name}Chart` in `src/components/dashboard/`.
Use Recharts. Tooltip MUST be `bg-popover text-popover-foreground`.
Use CSS variable chart colors (`--chart-1` to `--chart-5`).
Empty state: centered `text-muted-foreground` message.
```

---

### Post-Build Design Checklist

After ANY code change touching UI, verify:

1. [ ] No `bg-[#...]` or `text-[#...]` hex colors exist in the new/modified files
2. [ ] No `text-slate-*` or `bg-slate-*` classes exist
3. [ ] All surfaces use semantic tokens (`bg-background`, `bg-card`, etc.)
4. [ ] All text uses `text-foreground` or `text-muted-foreground`
5. [ ] Brand emerald accents preserved where applicable
6. [ ] Tooltip / popover colors are `bg-popover text-popover-foreground`
7. [ ] Theme toggle correctly shows Light / Dark / System options
8. [ ] `docker-compose up -d --build app` succeeds with zero errors

---

> **Design Rule for PlantQuality:** If you are writing a color class, and it is not `bg-background`, `bg-card`, `bg-sidebar`, `bg-muted`, `bg-popover`, `text-foreground`, `text-muted-foreground`, `text-sidebar-foreground`, `border-border`, `border-sidebar-border`, or an emerald brand accent — **you are probably breaking the design system.**

(End of Design System Agent Prompt)
