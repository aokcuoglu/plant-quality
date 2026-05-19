# PlantLogistic Roadmap

## Product Positioning

**PlantLogistic** is the **Vehicle Order & Delivery Control Tower** module of the PlantX platform.

It tracks vehicle requests and orders from customer, dealer, or distributor demand through production planning, VIN/chassis assignment, status tracking, and delivery target visibility — providing end-to-end factory-to-dealer transparency.

---

## Target Customer

- Bus, midibus, truck, and light truck OEMs
- Special-purpose vehicle manufacturers
- Manufacturers with dealer and distributor networks
- Made-to-order or engineer-to-order producers
- OEMs managing mixed EV / CNG / diesel product lines

---

## v3.1.0 — Order Tracking MVP

**Scope:**
- PlantLogistic module shell and sidebar/nav integration
- Vehicle request/order data model (`PlantLogisticOrder`, `PlantLogisticOrderEvent`)
- Customer/dealer/distributor entities via order fields
- OEM order list with search and status filters
- OEM order create flow
- OEM order detail page with status workflow, planning, VIN/chassis, timeline
- Vehicle order status workflow (DRAFT → SUBMITTED → COMMERCIAL_REVIEW → APPROVED → WAITING_PRODUCTION_PLAN → PLANNED → IN_PRODUCTION → QUALITY_HOLD → READY_FOR_DISPATCH → DISPATCHED → DELIVERED → CLOSED, plus CANCELLED)
- VIN/chassis assignment fields
- Planned production week/date and planned delivery date
- Basic order timeline/activity events
- Basic dashboard summary cards (active orders, in production, ready for dispatch, quality hold, delivery risk)
- Role/tenant isolation (OEM ENTERPRISE only)
- Feature gating via `PLANT_LOGISTIC` key
- Demo seed data (10 orders, 12 events)
- AppSwitcher integration showing PlantLogistic as live module

**Excluded:**
- Production milestone tracking by station/gate
- Yard/stock tracking
- Dispatch/carrier/shipment management
- Dealer/distributor external portal
- PlantQuality integration
- ERP integration
- PDF/Excel export
- AI order prediction
- Advanced SLA/delay intelligence

---

## v3.1.1 — Module Entitlements + Strategic Patch

**Scope:**
- PlantLogistic module entitlement decoupled from ENTERPRISE-only plan
- Two-layer access model: Module Entitlement (what you own) × Plan Tier (feature level)
- AppSwitcher module visibility based on entitlements
- Supplier users never see PlantLogistic
- Direct URL and API protection for unauthorized module access
- Landing page ecosystem section updated with PlantLogistic as live module
- Commercial entitlement documentation
- Demo seed data with per-company module entitlements

---

## v3.2.0 — Production Milestone Tracking (Current)

**Scope:**
- Production milestone data model (`PlantLogisticProductionMilestone`)
- Standard production gates: Body, Paint, Assembly, Electrical, Powertrain, EOL Test, PDI, Final Quality, Yard Ready
- Planned start/finish and actual start/finish date tracking
- Milestone status workflow: NOT_STARTED → PLANNED → IN_PROGRESS → COMPLETED, with BLOCKED, QUALITY_HOLD, SKIPPED, CANCELLED
- Delay reason capture per milestone
- Responsible department per milestone
- Quality hold flag per milestone
- Production progress percentage calculation
- Order detail milestone timeline table with status badges and actions
- Default milestone seed functionality ("Create Default Milestones" button)
- Status transition validation (server-side enforcement)
- Milestone summary cards on dashboard (Milestones Blocked, Q-Hold, Due This Week)
- Production progress bar and current gate on order list
- Demo seed data for 6 orders with diverse milestone states
- Module entitlement / access protection (PLANT_LOGISTIC_MODULE + PLANT_LOGISTIC feature gate)
- Tenant isolation (companyId scoping)
- New LogisticOrderEventType values for milestone events

**Status transitions:**
- NOT_STARTED → PLANNED, CANCELLED
- PLANNED → IN_PROGRESS, CANCELLED
- IN_PROGRESS → COMPLETED, BLOCKED, QUALITY_HOLD
- BLOCKED → IN_PROGRESS
- QUALITY_HOLD → IN_PROGRESS
- COMPLETED, SKIPPED, CANCELLED are terminal

---

## v3.2.1 — Milestone Workflow Polish Patch (Current)

**Scope:**
- Terminal state edit guard: workflow fields (title, description, dates, department, delayReason) blocked on COMPLETED/CANCELLED/SKIPPED milestones; only notes editable
- BLOCKED → IN_PROGRESS now clears delayReason and qualityHold (consistent with QUALITY_HOLD → IN_PROGRESS)
- CANCELLED and SKIPPED transitions now create timeline events (STATUS_CHANGED)
- Date validation: plannedStart cannot exceed plannedFinish in create and update actions
- Default milestone idempotency: gate-level check — only missing gates are created, existing gates are skipped
- Progress calculation: SKIPPED milestones count as resolved (100% reachable)
- Current gate display: "All milestones completed" shown when all milestones are in terminal state
- MilestoneGateBadge shows human-readable labels instead of raw enum values
- AppSwitcher/module entitlement regression verified
- Supplier denial and tenant isolation regression verified
- QA checklist documentation
- No new product scope

---

## v3.3.0 — Yard + Dispatch MVP

**Scope:**
- Yard location and parking slot management
- Ready for dispatch status and queue
- Carrier assignment and loading status
- Shipment tracking and ETA
- Delivery confirmation workflow

---

## v3.4.0 — Dealer / Distributor Portal

**Scope:**
- Limited external visibility for customers
- Order status, ETA, and document checklist
- No internal sensitive data exposed
- Customer self-service order tracking

---

## v3.5.0 — SLA + Delay Intelligence

**Scope:**
- Delivery SLA configuration per customer / market / vehicle type
- Aging orders dashboard and alerts
- Blocked vehicles tracking
- Delay reason analytics
- Management escalation notifications

---

## v3.6.0 — PlantLogistic ↔ PlantQuality Integration

**Scope:**
- Quality hold links to defects and 8D reports
- PDI defect creation from logistic flow
- Supplier-caused delay signal to quality module
- FMEA / IQC / PPAP quality risk connection to delivery risk

---

## Future Vision

- ERP / MRP integration (SAP, Oracle, Dynamics)
- EDI / API dealer integration for order intake
- Mobile yard scan (QR / VIN)
- Telematics / connected vehicle data integration
- Predictive ETA based on production pace
- AI delay reason suggestion
- Carrier performance scoring
- Carbon / logistics footprint tracking
- Multi-plant production coordination

---

## OEM Benchmark Principles

| Principle | Description |
|---|---|
| Real-time order visibility | Across the entire chain, from request to delivery |
| Delivery planning intelligence | Scheduling and planning with configurable SLAs |
| Exception & delay management | Workflow-driven escalation and root-cause capture |
| Yard & vehicle location visibility | At every stage — production, yard, transit |
| Gate & zone check automation | Station/gate milestone tracking and bottleneck detection |
| Dealer/customer transparency | Limited external portal for order and delivery visibility |
| End-to-end factory-to-dealer traceability | Full lifecycle from order to handover |