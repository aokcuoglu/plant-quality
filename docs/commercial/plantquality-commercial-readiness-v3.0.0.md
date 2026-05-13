# PlantQuality Commercial Readiness — v3.0.0

**Release:** PlantX v3.0.0 — PlantQuality Commercial Readiness
**Date:** 2026-05-12
**Status:** Commercial-ready for demo, early customer presentation, and production deployment assessment

---

## 1. Product Positioning

PlantQuality is an OEM-focused quality management SaaS module within the PlantX industrial platform. It is designed for heavy commercial vehicle OEMs and their suppliers who need end-to-end visibility into field quality, defect management, corrective actions, and supplier performance.

PlantQuality replaces scattered spreadsheets, disconnected email chains, and siloed quality tools with a single, tenant-isolated platform where OEM quality teams and their suppliers collaborate on 8D problem-solving, PPAP, IQC, FMEA, and supplier development workflows.

**Key differentiators:**
- OEM-centric design: built around how OEM quality teams actually work
- Supplier portal: suppliers respond to 8D, development plans, and quality tasks without leaving the platform
- AI-assisted quality: classification, similar-issue detection, 8D review, and root-cause suggestion (Pro/Enterprise)
- Deterministic scoring: supplier scorecard and executive cockpit use explainable, data-driven scoring — no black-box AI
- Multi-tenant isolation: every query is scoped by company; no cross-tenant data leakage
- Feature gating: every module, action, and route enforces plan-based access control

---

## 2. Target Users

| Persona | Role | Typical Need |
|---------|------|-------------|
| OEM Quality Director | ADMIN, ENTERPRISE plan | Executive dashboard, KPI monitoring, supplier scoring |
| OEM Quality Engineer | QUALITY_ENGINEER, PRO/ENTERPRISE plan | Defect management, 8D workflow, IQC inspections, PPAP tracking |
| OEM Quality Manager | ADMIN, PRO/ENTERPRISE plan | Quality intelligence, supplier development, FMEA review |
| Supplier Quality Contact | ADMIN, SUPPLIER company | Responding to 8D, PPAP submissions, development plan actions |
| Supplier Engineer | QUALITY_ENGINEER, SUPPLIER company | Completing containment actions, filling PPAP evidence |

---

## 3. Main Modules

| Module | Route | Plan | Description |
|--------|-------|------|-------------|
| Defects / 8D | `/quality/oem/defects` | FREE | Core defect reporting and 8D problem-solving workflow |
| Field Quality | `/quality/oem/field` | FREE | Field defect tracking with severity, supplier assignment |
| Supplier Portal | `/quality/supplier/*` | FREE | Supplier-facing views for assigned defects, PPAP, IQC, FMEA, development |
| Notifications | Bell icon | FREE | In-app notification center |
| PPAP | `/quality/oem/ppap` | PRO | PPAP submission tracking, evidence, review workflow |
| IQC | `/quality/oem/iqc` | PRO | Incoming quality control inspections, checklists, results |
| FMEA | `/quality/oem/fmea` | PRO | Failure mode and effects analysis with AI-assisted suggestions |
| Escalation | `/quality/oem/escalations` | PRO | Overdue and escalated items management |
| War Room | `/quality/oem/war-room` | PRO | Cross-functional quality collaboration view |
| Similar Issues | (8D panel) | PRO | AI-powered similar defect detection |
| AI Classification | (Field defect) | PRO | AI-powered defect categorization |
| Quality Intelligence | `/quality/oem/quality-intelligence` | PRO | Cross-module risk signals, repeat issues, PPAP/FMEA gaps |
| Quality Linkage | (Defect detail) | PRO | Manual and AI-assisted cross-record linking |
| AI 8D Review | (8D panel) | ENTERPRISE | AI-generated 8D report review and scoring |
| Root Cause Suggestion | (8D panel) | ENTERPRISE | AI-powered root-cause hypothesis generation |
| Executive Cockpit | `/quality/oem/executive` | ENTERPRISE | Leadership KPI dashboard, risk tables, action items |
| Supplier Scorecard | `/quality/oem/scorecard` | ENTERPRISE | Deterministic supplier quality scoring and ranking |
| Supplier Development | `/quality/oem/supplier-development` | ENTERPRISE | Action plans, status tracking, supplier collaboration |

---

## 4. Demo Story

PlantQuality tells the story of an OEM quality team that discovers a critical field defect, opens an 8D, uses AI to classify it and find similar issues, tracks it through the PPAP and IQC lifecycle, identifies a risky supplier on the scorecard, and creates a development action plan — all from a single platform.

The demo starts at the executive level (cockpit), drills into supplier risk (scorecard), follows the quality workflow (defects → 8D → AI), and ends with supplier collaboration (development plan).

---

## 5. Demo Personas

| Persona | Email | Role | Company | Plan | Purpose |
|---------|-------|------|---------|------|---------|
| OEM Enterprise Admin | `admin-enterprise@oem.com` | ADMIN | Enterprise Motors Group | ENTERPRISE | Full demo walkthrough |
| OEM Enterprise QE | `qe-enterprise@oem.com` | QUALITY_ENGINEER | Enterprise Motors Group | ENTERPRISE | Role-restricted view |
| OEM Pro Admin | `admin-pro@oem.com` | ADMIN | PlantX Automotive | PRO | Show upgrade CTAs for Enterprise features |
| OEM Free Admin | `admin-free@oem.com` | ADMIN | TestFree OEM Corp | FREE | Show upgrade CTAs for Pro features |
| Supplier Admin A | `admin@supplier.com` | ADMIN | Precision Parts Inc. | FREE (supplier) | Supplier portal view |
| Supplier Admin B | `admin@steelforged.com` | ADMIN | SteelForged Co. | FREE (supplier) | Supplier isolation testing |

**Note:** Passwords are managed by the development/deployment team. Do not store real passwords in this document.

---

## 6. Demo Credentials (Placeholders)

Credentials are provisioned via seed data. Use Dev Mode login during demo:

1. Navigate to `/login`
2. Select "Dev Mode" tab
3. Choose the desired user from the dropdown
4. Click "Sign In"

For production deployments, magic-link authentication is used (Resend or configured SMTP).

---

## 7. Feature Package Matrix

See `docs/commercial/plantquality-packaging-v3.0.0.md` for the complete feature-to-tier mapping.

---

## 8. Security / Readiness Checklist

See `docs/release/plantx-v3.0.0-readiness-checklist.md` for the complete security and deployment readiness checklist.

**Summary of v2.9.3 security hardening (all verified):**
- Authenticated image/evidence access — all routes require session + tenant-scoped authorization
- Backend feature gates — all detail pages and server actions enforce plan-based access
- Free-tier AI blocked — AI routes require PRO (classification, similar issues) or ENTERPRISE (8D review, root cause)
- Cross-tenant supplier assignment — `assertSupplierBelongsToOem` enforced across all creation/assignment actions
- Cron scoping — `CRON_SECRET` header required; notifications are companyId-scoped
- Middleware protection — `proxy.ts` enforces session on dashboard and protected API routes
- Sidebar/nav gate alignment — all nav items have `gate` property synced with backend
- Direct URL and Server Action access — pages redirect unauthorized users; actions return errors

---

## 9. Deployment Readiness Checklist

See `docs/release/plantx-v3.0.0-readiness-checklist.md` for the full deployment checklist.

---

## 10. Known Limitations

- No PDF or Excel export (deferred)
- No ERP/MRP/PLM integration (deferred)
- No AI-generated executive summaries (deferred)
- No automated email digest to suppliers (deferred)
- No advanced effectiveness analytics for development plans (deferred)
- No custom KPI weighting in supplier scorecard (deferred)
- No SSO/SAML integration (deferred)
- No API access for external systems (deferred)
- No webhook notifications (deferred)
- No mobile-responsive dashboard (deferred)
- No multi-plant support (deferred)
- AI Vision route does not validate image S3 key belongs to user's company (low risk; behind auth/role/plan)
- Email notifications only verified in dev mode (Mailpit); production email delivery via Resend requires real configuration
- Development plan creation uses inline OEM-supplier association check instead of shared `assertSupplierBelongsToOem` helper (functionally correct, minor DRY debt)
- Per-route API rate limiting is not implemented (deferred)
- Comprehensive audit logging of unauthorized access attempts is not implemented (deferred)

---

## 11. Deferred Items After v3.0.0

- PlantLogistic module begins in v3.1.0
- PDF/Excel export for 8D, PPAP, IQC, FMEA reports
- ERP/MRP/PLM integration adapters
- AI executive summaries (LLM-based)
- Advanced analytics and effectiveness tracking
- SSO/SAML authentication
- API access (REST/GraphQL)
- Webhook notifications
- Multi-plant support
- Mobile-responsive dashboard views
- Comprehensive audit logging
- Rate limiting on API routes
- Automated supplier email digests

---

## 12. Recommended Next Module: PlantLogistic

PlantLogistic is the next PlantX module, targeting warehouse gate management, inbound logistics, and dock scheduling. It will share the same multi-tenant architecture, feature gating, and design system as PlantQuality.

**Proposed scope for v3.1.0:**
- Dock appointment scheduling
- Inbound shipment tracking
- Gate check-in/check-out workflow
- ASN (Advanced Shipping Notice) management
- Supplier delivery scoring (integrated with PlantQuality scorecard)
- Storage location assignment

This module is not started and is not in scope for v3.0.0.