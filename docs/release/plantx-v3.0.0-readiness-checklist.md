# PlantX v3.0.0 — Readiness Checklist

**Release:** PlantX v3.0.0 — PlantQuality Commercial Readiness
**Date:** 2026-05-12
**Status:** Ready for review

---

## 1. Security Checklist

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1.1 | Image/evidence access requires authentication | PASS | `/api/image` checks session + tenant-scoped parent record |
| 1.2 | PPAP/FMEA detail pages enforce `requireFeature` | PASS | Both OEM and supplier detail pages redirect unauthorized users |
| 1.3 | All server actions enforce `requireFeature` | PASS | Every mutation action verifies plan-based feature access |
| 1.4 | AI routes gated by plan (PRO/ENTERPRISE) | PASS | All 5 AI routes check `requireFeature` + OEM-only + role |
| 1.5 | Free-tier users cannot trigger paid AI | PASS | AI_CLASSIFICATION requires PRO, AI_8D_REVIEW requires ENTERPRISE |
| 1.6 | Cross-tenant supplier assignment blocked | PASS | `assertSupplierBelongsToOem` enforced in all creation/assignment actions |
| 1.7 | Cron routes protected by `CRON_SECRET` | PASS | SLA reminders require valid Authorization header |
| 1.8 | No client-provided `companyId` trusted | PASS | All server actions derive companyId from session |
| 1.9 | Evidence upload requires `companyId` | PASS | Upload route requires session with companyId |
| 1.10 | Proxy enforces session on protected routes | PASS | `proxy.ts` redirects unauthenticated page requests, returns 401 for API |
| 1.11 | No SQL injection vectors | PASS | All queries use Prisma ORM, no raw SQL |
| 1.12 | No secrets exposed to client | PASS | Env vars not leaked; `next.config.ts` does not expose keys |

---

## 2. Feature Gate Checklist

| # | Feature | Page Gate | Server Action Gate | Sidebar Gate | API Gate |
|---|---------|-----------|-------------------|-------------|----------|
| 2.1 | Defects/8D | Yes | Yes | DEFECTS | N/A |
| 2.2 | Field Quality | Yes | Yes | FIELD_QUALITY | N/A |
| 2.3 | PPAP | Yes | Yes | PPAP | Yes (upload) |
| 2.4 | IQC | Yes | Yes | IQC | N/A |
| 2.5 | FMEA | Yes | Yes | FMEA | Yes (save) |
| 2.6 | Escalation | Yes | Yes | ESCALATION | N/A |
| 2.7 | War Room | Yes | N/A | WAR_ROOM | N/A |
| 2.8 | Quality Intelligence | Yes | Yes | QUALITY_INTELLIGENCE | N/A |
| 2.9 | Quality Linkage | Component | Yes | N/A | N/A |
| 2.10 | Similar Issues | N/A | Yes | SIMILAR_ISSUES | N/A |
| 2.11 | AI Classification | N/A | Yes | AI_CLASSIFICATION | Yes |
| 2.12 | AI 8D Review | N/A | Yes | N/A | N/A |
| 2.13 | Root Cause Suggestion | N/A | Yes | N/A | N/A |
| 2.14 | Executive Cockpit | Yes | Yes | EXECUTIVE_COCKPIT | N/A |
| 2.15 | Supplier Scorecard | Yes | Yes | SUPPLIER_SCORECARD | N/A |
| 2.16 | Supplier Development | Yes | Yes | SUPPLIER_DEVELOPMENT | N/A |
| 2.17 | Notifications | Yes | N/A | NOTIFICATIONS | N/A |

---

## 3. Tenant / Supplier Isolation Checklist

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 3.1 | All Prisma OEM queries include `oemId: companyId` | PASS | Verified across all OEM pages and actions |
| 3.2 | All Prisma supplier queries include `supplierId: companyId` | PASS | Verified across all supplier pages |
| 3.3 | Supplier assignment validates OEM-supplier relationship | PASS | `assertSupplierBelongsToOem` checks 6 relationship types |
| 3.4 | Image access resolves parent record for tenant check | PASS | `/api/image` checks `oemId` or `supplierId` on parent record |
| 3.5 | Notifications scoped by `companyId` | PASS | SLA cron creates per-tenant notifications |
| 3.6 | Scorecard blocks supplier access | PASS | Returns null/redirect for non-OEM sessions |
| 3.7 | Executive Cockpit blocks supplier access | PASS | Returns null/redirect for non-OEM sessions |
| 3.8 | Supplier Development blocks cross-tenant plans | PASS | OEM sees only their plans; supplier sees only assigned plans |

---

## 4. Demo Data Checklist

| # | Data | Status | Notes |
|---|------|--------|-------|
| 4.1 | OEM companies (Free, Pro, Enterprise) | PASS | Seed data includes 3 OEM companies |
| 4.2 | Supplier companies (Precision Parts, SteelForged) | PASS | 2 supplier companies with relationships |
| 4.3 | Users per company (ADMIN, QE roles) | PASS | 11 seeded users across all plans |
| 4.4 | Defects with 8D data | PASS | 9 defects with event timelines |
| 4.5 | Field defects | PASS | Seeded with severity and supplier assignment |
| 4.6 | PPAP submissions with evidence | PASS | Multiple PPAPs with evidence records and events |
| 4.7 | IQC reports with checklists | PASS | 5 IQC reports with checklist items and events |
| 4.8 | FMEA records with failure modes | PASS | Seeded with events |
| 4.9 | Quality Linkage (manual links) | PASS | Seeded cross-module links |
| 4.10 | Notifications | PASS | 11 notifications across users |
| 4.11 | Development plans | PASS | 4 plans across statuses |
| 4.12 | Scorecard data (via existing defects/IQC/PPAP) | PASS | Derived from seeded data |

---

## 5. Docker Local Runtime Checklist

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 5.1 | `docker-compose.yml` exists and is valid | PASS | Present in repo root |
| 5.2 | `Dockerfile` multi-stage build (deps → builder → runner) | PASS | Standalone output mode |
| 5.3 | `.env.docker` present (not committed) | PASS | In `.gitignore` |
| 5.4 | `.env.docker.example` present | PASS | Template for new developers |
| 5.5 | `docker-compose up -d --build app` succeeds | PENDING | Must validate |
| 5.6 | App container runs without fatal errors | PENDING | Must validate |
| 5.7 | App reachable at `http://localhost:3000` | PENDING | Must validate |
| 5.8 | PostgreSQL container running | PENDING | Must validate |
| 5.9 | MinIO container running | PENDING | Must validate |
| 5.10 | Mailpit container running | PENDING | Must validate |
| 5.11 | Database migrations applied | PENDING | Must validate |
| 5.12 | Seed data loaded | PENDING | Must validate |

---

## 6. Production Docker/VPS Readiness Checklist

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 6.1 | `output: "standalone"` in `next.config.ts` | PASS | Required for containerized build |
| 6.2 | Health check endpoint configured | N/A | No explicit `/health` route; app serves pages if running |
| 6.3 | `trustHost: true` in auth config | PASS | Required for container/proxy environments |
| 6.4 | No hardcoded localhost URLs in production code | PASS | Verified |
| 6.5 | Environment variable injection via Docker Compose | PASS | `.env.docker` injected at build stage |
| 6.6 | CORS configuration appropriate | N/A | Same-origin app; no CORS headers needed |
| 6.7 | nginx/reverse proxy configuration | PENDING | Not in repo; must be configured on VPS |
| 6.8 | SSL/TLS termination | PENDING | Must be configured on VPS (nginx/Let's Encrypt) |
| 6.9 | Contabo VPS deployment process documented | PENDING | Docker Compose on VPS |
| 6.10 | GHCR/private image registry | PENDING | Not yet configured |

---

## 7. Environment Variable Checklist

| # | Variable | Required | Notes |
|---|----------|----------|-------|
| 7.1 | `DATABASE_URL` | Yes | PostgreSQL connection string |
| 7.2 | `AUTH_SECRET` | Yes | Auth.js secret for JWT signing |
| 7.3 | `AUTH_URL` | Yes | Base URL for auth redirects |
| 7.4 | `EMAIL_SERVER` | Yes | SMTP or Resend endpoint |
| 7.5 | `EMAIL_FROM` | Yes | Sender email address |
| 7.6 | `R2_ACCOUNT_ID` | Yes (prod) | Cloudflare R2 account ID |
| 7.7 | `R2_ACCESS_KEY_ID` | Yes (prod) | Cloudflare R2 access key |
| 7.8 | `R2_SECRET_ACCESS_KEY` | Yes (prod) | Cloudflare R2 secret key |
| 7.9 | `R2_BUCKET_NAME` | Yes (prod) | Cloudflare R2 bucket |
| 7.10 | `R2_PUBLIC_URL` | Yes (prod) | Public URL for R2 objects |
| 7.11 | `AI_ENABLED` | No | Set `true` to enable AI features |
| 7.12 | `OPENAI_API_KEY` | No | Required if `AI_ENABLED=true` |
| 7.13 | `OPENAI_BASE_URL` | No | Custom AI provider endpoint |
| 7.14 | `OPENAI_MODEL` | No | Model name (default: DeepSeek) |
| 7.15 | `CRON_SECRET` | Yes (prod) | Secret for cron endpoint authorization |
| 7.16 | `MINIO_ENDPOINT` | Dev only | MinIO endpoint for local dev |
| 7.17 | `MINIO_ACCESS_KEY` | Dev only | MinIO access key |
| 7.18 | `MINIO_SECRET_KEY` | Dev only | MinIO secret key |

---

## 8. AI Configuration Checklist

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 8.1 | AI features disabled gracefully when `AI_ENABLED=false` | PASS | Safe error messages, no crashes |
| 8.2 | AI routes return 403 for unauthorized plans | PASS | `requireFeature` blocks Free/Pro Enterprise-only features |
| 8.3 | AI routes return 403 for supplier companyType | PASS | OEM-only check on all AI routes |
| 8.4 | Rate limit handling for AI provider | PASS | `isRateLimitError` detection added in v2.7.1 |
| 8.5 | Malformed response type guards | PASS | Added in v2.7.1 for 8D review |
| 8.6 | AI output is suggestion-only | PASS | No auto-approve or auto-reject |
| 8.7 | Free users see upgrade CTA, not AI features | PASS | Verified in UI and backend |

---

## 9. Database Migration Checklist

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 9.1 | `prisma validate` passes | PENDING | Must validate |
| 9.2 | No pending migrations blocking deploy | PENDING | Must check |
| 9.3 | Seed data loads without errors | PENDING | Must validate |
| 9.4 | No schema changes needed for v3.0.0 | PASS | v3.0.0 is a documentation/release version, no DB changes |
| 9.5 | All JSONB field names use Prisma names (not @map) in queries | PASS | Verified in v2.9.x |

---

## 10. Known Limitations

- No PDF or Excel export (deferred)
- No ERP/MRP/PLM integration (deferred)
- No AI executive summaries (deferred)
- No automated email digest (deferred)
- No API access, webhooks, or SSO (feature gates defined but not implemented)
- No multi-plant support (feature gate defined but not implemented)
- Advanced audit logging not implemented (feature gate defined but not implemented)
- Email notifications only verified in dev mode (Mailpit)
- AI Vision route does not validate image S3 key company ownership (low risk; behind auth/role/plan)
- API rate limiting not implemented (deferred)
- Plan usage limits tracked but not hard-enforced (deferred)
- Development plan creation uses inline association check instead of shared helper (functionally correct)

---

## 11. Go/No-Go Checklist

| # | Check | Required | Status |
|---|-------|----------|--------|
| 11.1 | Lint passes (`npm run lint`) | GO | PENDING |
| 11.2 | TypeCheck passes (`npm run typecheck`) | GO | PENDING |
| 11.3 | Build passes (`npm run build`) | GO | PENDING |
| 11.4 | Prisma schema validates | GO | PENDING |
| 11.5 | Migrations apply cleanly | GO | PENDING |
| 11.6 | Docker build succeeds | GO | PENDING |
| 11.7 | App container runs without fatal errors | GO | PENDING |
| 11.8 | App reachable at `http://localhost:3000` | GO | PENDING |
| 11.9 | Login works (Dev Mode) | GO | PENDING |
| 11.10 | Dashboard loads after login | GO | PENDING |
| 11.11 | Image route requires auth | GO | PENDING |
| 11.12 | v3.0.0 docs exist | GO | PENDING |
| 11.13 | RELEASE_NOTES.md includes v3.0.0 | GO | PENDING |
| 11.14 | package.json and package-lock.json versions are 3.0.0 | GO | PENDING |
| 11.15 | No critical/high security blockers remaining | GO | PASS |
| 11.16 | All v2.9.3 blocker resolutions verified | GO | PASS (8/8) |

---

## Conclusion

**v3.0.0 readiness depends on:**
1. All PENDING validation checks passing (Steps 5, 6, 9, 11)
2. No new critical/high blockers discovered during validation
3. Successful Docker rebuild and smoke test

**v3.0.0 is ready for review when all GO checks are marked PASS.**