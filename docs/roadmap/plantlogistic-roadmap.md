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

## v3.1.0 — Order Tracking MVP (Current)

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

## v3.2.0 — Production Milestone Tracking

**Scope:**
- Body / paint / assembly / EOL / PDI production gates
- Planned vs. actual dates per station
- Delay reason capture at each gate
- Quality hold flag linking to PlantQuality defects
- Station/gate timeline visualization on order detail

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