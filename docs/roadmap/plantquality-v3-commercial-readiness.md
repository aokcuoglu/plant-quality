# PlantQuality v3.0.0 — Commercial Readiness Roadmap

**Last Updated:** 2026-05-10
**Current Version:** 2.9.2
**Target Version:** 3.0.0

---

## v3.0.0 Goal

PlantQuality v3.0.0 marks commercial readiness — a stable, polished, fully validated product ready for paid customers beyond early adopters. The product must be production-proven, all critical flows must work end-to-end, upgrade paths must be smooth, and the demo must be compelling.

---

## Remaining Must-Have Items (Block v3.0.0)

1. **Performance/load testing** — Validate response times under realistic concurrent user load (10+ simultaneous users)
2. **Accessibility audit** — WCAG 2.1 AA compliance check on all major pages
3. **Email notification delivery** — Verify email notifications work in production with Resend (currently only Mailpit in dev)
4. **Production deployment validation** — Test on Supabase PostgreSQL + Cloudflare R2, not just local Docker
5. **Data backup/restore** — Document and test database backup and restore procedures
6. **Rate limiting** — Add rate limiting to API routes to prevent abuse
7. **Error monitoring** — Set up error tracking (Sentry or similar) for production
8. **SEO/landing page review** — Ensure marketing pages are accurate and have correct CTAs

---

## Nice-to-Have Items (Post-v3.0.0)

- AI-generated executive summaries (currently template-based)
- Graph/network visualization of quality relationships
- PDF/PPT export for executive presentations
- Full supplier-facing scorecard sharing
- Custom KPI weighting UI
- Advanced benchmarking across organizations
- Automated email digest to executives
- ERP/MRP/PLM integration
- PlantLogistic module
- Mobile-responsive dashboard views

---

## Commercial Demo Checklist

### Demo Flow (15 minutes)

1. **Login** as OEM Enterprise Admin (`admin-enterprise@oem.com`)
2. **Executive Cockpit** — Show KPI cards, risk table, supplier attention, SLA monitoring
3. **Quality Intelligence** — Show risk signals, FMEA coverage gaps, PPAP issues, repeat clusters
4. **Supplier Scorecard** — Show Precision Parts score breakdown, penalty details, drill-downs
5. **Supplier Development** — Show SUPPLIER_ACTION_REQUIRED plan, supplier response flow
6. **Defects/8D** — Show defect detail with AI 8D Review, root cause suggestion
7. **PPAP** — Show APPROVED PPAP with post-approval issues (CS-3344-D)
8. **IQC** — Show REJECTED IQC with checklist items
9. **FMEA** — Show SUPPLIER_IN_PROGRESS FMEA with high RPN (200)
10. **Field Quality** — Show critical field defect with supplier assignment
11. **Plan & Usage** — Show ENTERPRISE plan, feature list, usage counter

### Demo Credentials

| Account | Purpose |
|---------|---------|
| `admin-enterprise@oem.com` | OEM Enterprise Admin — full access |
| `qe-enterprise@oem.com` | OEM Enterprise QE — role-restricted |
| `admin-pro@oem.com` | OEM Pro Admin — upgrade CTAs for Enterprise features |
| `admin-free@oem.com` | OEM Free Admin — upgrade CTAs for Pro and Enterprise |
| `admin@supplier.com` | Supplier A Admin — supplier portal view |
| `admin@steelforged.com` | Supplier B Admin — supplier isolation testing |

---

## Deployment Readiness Checklist

- [x] Application builds successfully (standalone output)
- [x] Docker container builds and runs
- [x] Database migrations apply cleanly
- [x] Seed data loads without errors
- [x] All lint checks pass
- [x] All type checks pass
- [x] No hardcoded localhost URLs in production code
- [x] Auth.js configured for production OAuth
- [x] Email provider configured for production
- [x] Object storage (R2) credentials configured
- [x] CSRF protection enabled (trustHost: true for containers)
- [ ] Production database seeded with demo data (not real secrets)
- [ ] SSL/TLS certificates configured
- [ ] Domain name configured
- [ ] Monitoring and alerting set up
- [ ] Backup schedule configured
- [ ] Rate limiting configured
- [ ] CDN configuration for static assets

---

## What is Deferred After v3.0.0

- PlantLogistic module (not started)
- PDF/Excel export (not started)
- ERP/MRP/PLM integration (not started)
- Supplier-facing scorecard sharing (not started)
- AI executive summaries (not started)
- Graph/network visualization (not started)
- Custom KPI weighting UI (not started)
- Multi-plant support (design only)
- SSO/SAML integration (not started)