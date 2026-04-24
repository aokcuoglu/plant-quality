# PlantQuality 8D GAP & Roadmap

Date: 2026-04-24  
Scope: OEM > Supplier > OEM defect and 8D workflow in PlantQuality

## Executive Summary

PlantQuality currently has a strong MVP foundation for the 8D loop: OEM creates a defect, supplier prepares a structured 8D report, OEM reviews the report, comments on sections, requests revision or approves closure. The current implementation proves the workflow and establishes the core data model, but it is not yet at the level of an enterprise-grade supplier quality system.

The main gaps are not about whether the 8D flow exists. They are about process rigor: stronger validation, revision traceability, evidence management, task ownership, timing/SLA control, auditability, and reviewer ergonomics. These are the areas that should shape the next roadmap.

## Current Flow Snapshot

### OEM Creates Defect

- OEM selects a supplier.
- OEM enters part number and defect description.
- OEM uploads defect images through R2/S3-backed upload.
- System creates a `Defect` with status `OPEN`.
- Supplier company users receive `NEW_DEFECT` notifications.

### Supplier Prepares 8D

- Supplier opens the defect and starts or continues the 8D wizard.
- Wizard covers D1-D8 in six UI steps:
  - D1-D2: team and problem description
  - D3: containment actions
  - D4: root cause analysis
  - D5-D6: corrective actions and validation
  - D7: preventive/system updates
  - D8: recognition and closure
- Supplier can save each step as draft.
- First save moves defect from `OPEN` or `REJECTED` to `IN_PROGRESS`.
- Submit moves status to `WAITING_APPROVAL`.
- OEM company users receive submission notifications.

### OEM Reviews 8D

- OEM sees report sections in the defect detail view.
- OEM can add section-level comments while status is `WAITING_APPROVAL`.
- OEM can approve the report, moving defect to `RESOLVED`.
- OEM can request revision, moving defect to `REJECTED`.
- Supplier company users receive comment, approval, and revision notifications.

## GAP Analysis

| Area | Current State | Gap | Impact | Priority |
| --- | --- | --- | --- | --- |
| 8D submission validation | Client checks only broad required fields before enabling submit. Server accepts any existing report. | Server does not enforce completeness, field shape, or quality thresholds. | Supplier can submit incomplete or malformed 8D data through bypass or stale client state. | P0 |
| Workflow state model | `OPEN`, `IN_PROGRESS`, `WAITING_APPROVAL`, `RESOLVED`, `REJECTED`. | No explicit states for containment pending, corrective action implementation, overdue, cancelled, reopened, or archived. | Hard to report process health or model real supplier quality operations. | P0 |
| Revision lifecycle | OEM comments persist; reject moves status to `REJECTED`. | Comments have no resolved state, revision number, response, or before/after history. | Revision loops become ambiguous after several cycles. | P0 |
| Review representation | OEM sees sections and can comment per section. | D5 and D6 can collapse into one display path; D7 impacted documents can hide the preventive text context. | OEM review may miss parts of the supplier's submitted content. | P0 |
| Audit trail | `createdAt`, `updatedAt`, `submittedAt`, comments, notifications exist. | No append-only event history for status changes, submissions, approvals, rejections, or edits. | Weak traceability for customer audits and internal quality reviews. | P0 |
| Evidence and attachments | Defect images exist. | No per-8D-step attachments, implementation evidence, containment evidence, or document revision evidence. | 8D report remains text-heavy and less defensible. | P1 |
| Ownership and due dates | Rows include responsible users and dates in some steps. | No global owner, due date, SLA, escalation, overdue state, or dashboard filters. | Management cannot reliably drive supplier responsiveness. | P1 |
| Supplier/OEM communication | Section comments and notifications exist. | No threaded replies, mention support, comment resolution, or comment assignment. | Collaboration is usable but thin for enterprise review cycles. | P1 |
| 8D data model | JSONB fields allow fast iteration. | Important records are embedded JSON rather than queryable first-class entities. | Reporting, filtering, audit, ownership, and evidence linking will become harder. | P1 |
| RBAC | Session includes role, company, plan. | Most guards check only `companyType`; role-level permission is not enforced. | Viewer/admin/engineer boundaries are not yet production-ready. | P1 |
| AI features | PRO-gated brainstorm and vision endpoints exist. | AI output is inserted without structured confidence, provenance, or approval markers. | Users may treat suggestions as accepted engineering facts. | P2 |
| Notifications | Basic notification list and read state exist. | No email reminders, digest, escalation, preferences, or notification deduplication. | Important quality events can be missed. | P2 |
| Export/reporting | None observed for 8D package output. | No PDF/Excel/customer-facing 8D export. | Hard to use PlantQuality as system of record in customer processes. | P2 |
| Metrics | Dashboards exist at high level. | No detailed cycle time, revision count, overdue, supplier scorecard, or defect recurrence analytics. | Limited value for OEM supplier quality leadership. | P2 |

## Recommended Roadmap

### Implementation Status

`v1.1 core hardening` has been started after this GAP review. The first implementation pass covers:

- Server-side 8D completeness validation before supplier submission.
- Role-aware guards for OEM review actions and supplier 8D actions.
- Audit event model for defect creation, 8D saves/submissions, review comments, revision requests, approvals, and comment lifecycle changes.
- Revision metadata on 8D reports.
- Review comment lifecycle fields: open/resolved, supplier response, resolver, resolved timestamp.
- OEM review display split for D5, D6, D7 document updates, and D7 preventive actions.

Evidence attachments, SLA ownership, exports, analytics, and AI provenance remain future roadmap items.

### Phase 1: Stabilize the 8D Core

Goal: Make the current 8D loop reliable enough for controlled pilot use.

- Add server-side 8D completeness validation in `submitEightDReport`.
- Normalize review display so OEM always sees D5, D6, D7 documents, and D7 preventive text together.
- Add revision metadata:
  - `revisionNo`
  - `lastSubmittedAt`
  - `lastReviewedAt`
  - `approvedAt`
  - `rejectedAt`
- Add comment states:
  - open
  - resolved
  - supplier response
- Add a lightweight audit/event table for status changes and review actions.
- Enforce role-level permissions for create, submit, comment, approve, and reject.

Recommended release target: `v1.1`.

### Phase 2: Evidence, Ownership, and SLA

Goal: Turn the form workflow into an operational supplier quality process.

- Add due dates at defect and 8D step level.
- Add owner fields for the defect and current supplier assignee.
- Add overdue badges and filters in OEM/Supplier lists.
- Add per-step attachments:
  - D3 containment evidence
  - D5 corrective action evidence
  - D6 validation evidence
  - D7 revised document evidence
- Add escalation notifications and daily/weekly reminders.
- Add a clearer “current action required by” indicator:
  - OEM review
  - Supplier update
  - Closed

Recommended release target: `v1.2`.

### Phase 3: Enterprise Review and Reporting

Goal: Make PlantQuality useful as a long-term system of record.

- Add 8D export:
  - PDF package
  - Excel-friendly report
  - attached images and evidence appendix
- Add supplier scorecards:
  - defect count
  - average 8D response time
  - average closure time
  - revision count
  - recurrence rate
- Add advanced filters:
  - supplier
  - part number
  - status
  - overdue
  - assigned user
  - date range
- Add audit trail UI.
- Add approval history and immutable submitted snapshots.

Recommended release target: `v1.3`.

### Phase 4: AI and Quality Intelligence

Goal: Make AI a controlled assistant, not just a text generator.

- Store AI suggestions separately from accepted user-entered content.
- Add “accept suggestion” and “discard suggestion” actions.
- Add AI provenance metadata:
  - model
  - timestamp
  - source context
  - user who accepted it
- Add recurrence detection across similar part numbers and defects.
- Add supplier quality assistant for OEM reviewers:
  - missing evidence detection
  - weak root cause warning
  - containment gap warning
  - D5/D6 consistency check

Recommended release target: `v1.4`.

## Suggested Data Model Evolutions

### Near Term

- `DefectEvent`
  - `id`
  - `defectId`
  - `type`
  - `actorId`
  - `metadata`
  - `createdAt`
- `ReviewComment`
  - add `status`
  - add `resolvedAt`
  - add `resolvedById`
  - add `supplierResponse`
- `EightDReport`
  - add revision and review timestamps
  - add `approvedAt`, `approvedById`
  - add `rejectedAt`, `rejectedById`

### Mid Term

Consider promoting major JSONB arrays into first-class models when reporting and audit needs grow:

- `EightDTeamMember`
- `ContainmentAction`
- `CorrectiveAction`
- `ValidationAction`
- `PreventiveDocumentUpdate`
- `EightDAttachment`

JSONB is still useful for MVP flexibility, but first-class models will make ownership, due dates, comments, evidence, and analytics easier.

## UX Improvements

- Add a persistent 8D progress sidebar with section completion and reviewer comment count.
- Show OEM comments directly next to the relevant input, not only above the step.
- Make “submit blockers” explicit before D8.
- Add “Save draft and exit” as a first-class action.
- Add autosave with visible sync state.
- Add read-only submitted snapshot mode while waiting for OEM review.
- Add clear banner for “Supplier action required” and “OEM action required”.

## Product Positioning Notes

PlantQuality should not become only a form builder. Its stronger positioning is “supplier quality workflow control”:

- It owns the transaction between OEM and supplier.
- It records accountable actions and dates.
- It provides audit-ready evidence.
- It turns repeated defects into supplier intelligence.

The current 8D flow is the right foundation. The next product leap should be traceability and operational control.

## Proposed Next Decision

Before implementation, decide whether `v1.1` should focus narrowly on “8D core hardening” or also include “evidence attachments.” My recommendation is to keep `v1.1` focused on validation, revision lifecycle, review display correctness, audit events, and RBAC. Evidence attachments should follow immediately in `v1.2`, because they touch storage, schema, UI, and review workflows together.
