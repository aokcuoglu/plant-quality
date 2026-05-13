# PlantQuality v3.0.0 — Demo Script

**Duration:** 15–20 minutes
**Primary Persona:** OEM Enterprise Admin
**Secondary Persona:** Supplier Admin

---

## Pre-Demo Setup

1. Ensure Docker environment is running: `docker-compose up -d --build app`
2. Confirm app is reachable at `http://localhost:3000`
3. Seed data is loaded (default for Docker environment)
4. Clear any browser cache/session to start fresh
5. Have a second browser window ready for Supplier login

---

## Scene 1: Login as Enterprise OEM (1 minute)

**What to say:** "Let's start by logging in as the OEM Enterprise Quality Director."

**What to click:**
1. Navigate to `http://localhost:3000/login`
2. Switch to "Dev Mode" tab
3. Select `admin-enterprise@oem.com` (Enterprise Motors Group)
4. Click "Sign In"

**Expected outcome:** Dashboard loads showing the OEM sidebar and main content area.

**Fallback:** If Dev Mode is not available, use magic-link login with `admin-enterprise@oem.com` and check Mailpit at `http://localhost:8025`.

---

## Scene 2: Executive Cockpit (2 minutes)

**What to say:** "The Executive Quality Cockpit gives leadership a real-time view of quality KPIs, risk tables, and action items — all deterministic, no AI-generated content."

**What to click:**
1. Click "Executive Cockpit" in the sidebar

**What to show:**
- Seven KPI cards: Critical/High Field Issues, Open Defects/8D, Overdue Actions, High-Risk Supplier/Part Combos, Repeat Issue Clusters, PPAP With Issues, FMEA Coverage Gaps
- Top Risk Supplier/Part Table with risk scores and recommended actions
- Supplier Attention Panel listing suppliers that need management focus
- SLA & Escalation Attention Panel
- Action Required List with priority items

**Expected outcome:** Full cockpit with seeded data showing multiple risk signals, supplier attention items, and overdue actions.

**Fallback:** If cockpit shows empty state, switch to `admin-enterprise@oem.com` and confirm Enterprise plan. Free/Pro users see upgrade CTA.

---

## Scene 3: Quality Intelligence (2 minutes)

**What to say:** "Quality Intelligence aggregates cross-module risk signals — PPAP post-approval issues, FMEA coverage gaps, repeat issue clusters, and IQC rejection patterns."

**What to click:**
1. Click "Quality Intelligence" in the sidebar

**What to show:**
- Risk signal summary cards
- PPAP with Post-Approval Issues section
- FMEA Coverage Gaps section
- IQC Rejection Signals
- Repeat Issue Clusters
- Supplier-Part risk ranking

**Expected outcome:** Rich data view showing seed data risk signals across multiple modules.

**Known limitation:** Intelligence `cat:` and `subcat:` filter params in ranking table links are not parsed by the field quality filter system. Links work; filters just don't apply.

---

## Scene 4: Supplier Scorecard (2 minutes)

**What to say:** "The Supplier Scorecard provides a deterministic, explainable quality score for each supplier. Every point deduction is traceable to specific quality events."

**What to click:**
1. Click "Scorecard" in the sidebar
2. Click on a supplier detail (e.g., SteelForged Co.)

**What to show:**
- Supplier ranking table with scores, grades (A–E), and risk levels
- Penalty breakdown on detail page
- Module breakdown with drill-down links (Field Defects, 8D, IQC, PPAP, FMEA)
- Key signals with severity badges

**Expected outcome:** Scorecard shows two suppliers. SteelForged has worse metrics and lower score. Drill-down links preserve supplier context.

---

## Scene 5: Drill into Risky Supplier (1 minute)

**What to say:** "Let's drill into SteelForged to see their field defects and 8D records."

**What to click:**
1. On the SteelForged detail page, click "Field Defects" metric card

**Expected outcome:** Navigates to `/quality/oem/field?supplierId=supplier-company-2` with active filter badge showing "Filtered by SteelForged Co."

**Fallback:** Click the supplier filter badge X to clear and return to all defects.

---

## Scene 6: Field Defect Detail (1 minute)

**What to say:** "Here's a critical field defect assigned to SteelForged."

**What to click:**
1. Click on any critical field defect in the filtered list

**What to show:**
- Defect details: part number, severity, supplier, status
- Attachments/evidence section
- Quality Linkage panel (related records)

---

## Scene 7: Quality Linkage (1 minute)

**What to say:** "Quality Linkage shows all cross-module connections for this defect — related 8D, IQC, PPAP, and FMEA records."

**What to click:**
1. On a defect detail page, scroll to Quality Linkage panel
2. Click a related record link

**Expected outcome:** Related records panel shows linked IQC, PPAP, FMEA, field defect records. Clicking a link navigates to the related record.

---

## Scene 8: Defect → 8D Flow (2 minutes)

**What to say:** "Let me show the complete defect-to-8D workflow. A defect can be escalated into a full 8D problem-solving process."

**What to click:**
1. Navigate to Defects (`/quality/oem/defects`)
2. Click on a defect with "8D Started" or "In Progress" status

**What to show:**
- 8D wizard with all steps: D1 (Team), D2 (Problem), D3 (Containment), D4 (Root Cause), D5 (Corrective Actions), D6 (Implementation)
- Defect events timeline
- Status badges

**Expected outcome:** Full 8D workflow visible with seeded data showing various completion stages.

---

## Scene 9: AI Classification / Similar Issues (1 minute)

**What to say:** "For Pro and Enterprise users, AI can classify defects and find similar issues across the database. All AI is suggestion-only — it never auto-approves or auto-closes records."

**What to click:**
1. On a defect detail page, look for "AI Classification" or "Similar Issues" panel
2. Click "Classify" or "Find Similar Issues"

**Expected outcome:** AI returns classification suggestion or similar defect matches.

**Known limitation:** AI requires `AI_ENABLED=true` and a valid provider API key. If AI is not configured, you'll see a safe error message, not a crash.

**Avoid:** Do not demo AI for Free-tier users — they see upgrade CTA instead.

---

## Scene 10: AI 8D Review / Root Cause (1 minute)

**What to say:** "Enterprise users also get AI-assisted 8D review and root-cause suggestion. The AI reviews the submitted 8D report and highlights strengths and gaps."

**What to click:**
1. On an 8D detail page with completed data, look for "AI 8D Review" panel
2. Click "Generate AI Review"

**Expected outcome:** AI returns a review with overall score, section-by-section feedback, and improvement suggestions.

**Avoid:** Only show for Enterprise users. Free/Pro users see upgrade CTAs. Do not claim AI auto-approves anything.

---

## Scene 11: PPAP / IQC / FMEA Workflows (2 minutes)

**What to say:** "PlantQuality manages the full PPAP, IQC, and FMEA workflows with status tracking, evidence management, and review cycles."

**What to click:**
1. Click "PPAP" in sidebar → show a PPAP submission with evidence and review status
2. Click "IQC" in sidebar → show an IQC report with checklist items
3. Click "FMEA" in sidebar → show an FMEA with failure modes and RPN values

**Expected outcome:** Each module shows seeded data with realistic statuses, evidence, and review workflows.

**Avoid:** Do not demo PPAP/IQC/FMEA creation for Free users — they see upgrade CTAs.

---

## Scene 12: Supplier Development Plan (1 minute)

**What to say:** "From the scorecard, OEMs can create Supplier Development Action Plans to drive improvement. Let me show an active plan."

**What to click:**
1. Click "Supplier Development" in sidebar
2. Click on a plan with SUPPLIER_ACTION_REQUIRED status

**What to show:**
- Plan overview: priority, status, action items
- Action items with OEM/Supplier ownership
- Activity timeline
- Status workflow actions

**Expected outcome:** Active development plan with action items visible.

---

## Scene 13: Login as Supplier (1 minute)

**What to say:** "Now let's switch to the supplier perspective. Suppliers see only what's assigned to them — no cross-tenant data."

**What to click:**
1. Log out (or use second browser)
2. Login as `admin@supplier.com` (Precision Parts Inc.)

**Expected outcome:** Supplier portal loads with reduced sidebar showing assigned defects, PPAP, IQC, FMEA, and development plans.

---

## Scene 14: Supplier Views Assigned 8D / Development Plan (1 minute)

**What to say:** "Precision Parts can see their assigned 8D reports and development action plans."

**What to click:**
1. Click "Defects / 8D" in supplier sidebar
2. Click "Development" in supplier sidebar

**What to show:**
- Assigned 8D reports with respond/actions
- Assigned development plan with action items owned by supplier

---

## Scene 15: Supplier Submits Response (1 minute)

**What to say:** "The supplier can now respond to action items and submit for OEM review."

**What to click:**
1. On a development plan detail page, find a supplier-owned action item
2. Enter a response in the response field
3. Click "Submit for Review" on the plan

**Expected outcome:** Action item shows supplier response. Plan status transitions from SUPPLIER_ACTION_REQUIRED to OEM_REVIEW.

---

## Scene 16: OEM Reviews and Closes Loop (1 minute)

**What to say:** "Back on the OEM side, the quality engineer reviews the supplier's response and can close the plan."

**What to click:**
1. Log back in as `admin-enterprise@oem.com`
2. Navigate to Supplier Development plan that was just submitted
3. Review action item responses
4. Click "Complete Plan" or add a comment

**Expected outcome:** OEM can review supplier responses, add comments, and transition the plan to COMPLETED status.

---

## Scene 17: Plan & Usage / Upgrade Request (1 minute)

**What to say:** "Users can view their current plan, feature access, and usage from the Settings page. Free and Pro users can request upgrades."

**What to click:**
1. Log in as `admin-free@oem.com` (Free OEM)
2. Navigate to `/oem/settings/plan`

**What to show:**
- Current plan: FREE
- Feature list with locked/unlocked indicators
- Usage counters
- "Request Upgrade" button

**Expected outcome:** Free user sees their plan limitations. Pro and Enterprise features show locked CTAs.

---

## Demo Tips

- **Stay logged in as Enterprise Admin** for most of the demo. It has full access.
- **Switch to Free/Pro users** only to show upgrade CTAs for a few seconds, then switch back.
- **Do not attempt AI features** unless the environment has `AI_ENABLED=true` and a valid provider API key.
- **Do not create real PPAP/IQC/FMEA records** in Free mode — use Enterprise mode for full demonstrations.
- **If data is empty**, check that seed data loaded correctly. Re-seed with `npx prisma db seed`.
- **If a page redirects to login**, check that the correct user is logged in. Some pages require specific company types (OEM vs. Supplier) or plans.
- **Known limitation:** FMEA new page only shows OEM-associated suppliers (not all system suppliers). This is correct behavior.

---

## Things to Avoid During Demo

1. Do not demo AI features without verifying AI is configured
2. Do not claim AI auto-approves or auto-rejects anything
3. Do not show Free user accessing Pro/Enterprise features via direct URL
4. Do not create cross-tenant supplier assignments
5. Do not claim the scorecard uses AI (it is 100% deterministic)
6. Do not show email notifications working without confirming Resend/SMTP is configured
7. Do not claim PDF/Excel export exists (it is deferred)
8. Do not claim ERP integration exists (it is deferred)