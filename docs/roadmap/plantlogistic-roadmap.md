# PlantLogistic Roadmap

## Product Definition

PlantLogistic is the Vehicle Order & Delivery Control Tower module of the PlantX platform. It tracks vehicle requests/orders from customer/dealer/distributor demand through production planning, VIN/chassis assignment, status tracking, and delivery target visibility. PlantLogistic is designed for OEMs producing buses, midibuses, trucks, light trucks, or similar vehicles.

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

## v3.2.0 — Production Milestone Tracking

**Planned scope:**
- Production line station/gate milestone tracking
- Per-unit production progress visibility
- Station-level status updates (body shop, paint, assembly, inspection, etc.)
- Production bottleneck identification
- Delay reasons and root cause tagging per station
- Production progress percentage calculation
- Integration with VIN/chassis assignment from v3.1.0

---

## v3.3.0 — Yard + Dispatch MVP

**Planned scope:**
- Yard/stock yard management (vehicle location, status in yard)
- Dispatch scheduling and carrier management
- Delivery tracking (carrier, driver, ETA)
- Shipment document management
- Pre-delivery inspection (PDI) checklist
- Delivery confirmation workflow
- Yard movement history

---

## v3.4.0 — Dealer/Distributor Portal

**Planned scope:**
- External portal for dealers/distributors
- Order visibility for customers (read-only or limited edit)
- Customer self-service order tracking
- Request/complaint submission from dealers
- Order confirmation workflow from customer side
- Dealer dashboard (their orders, delivery timeline)

---

## v3.5.0 — SLA + Delay Intelligence

**Planned scope:**
- SLA configuration per customer/market/vehicle type
- Delay detection and notification
- Delay reason categorization and analytics
- On-time delivery KPI tracking
- Customer-specific delivery performance dashboards
- Automatic escalation for SLA breaches
- Delay pattern analysis across orders

---

## v3.6.0 — PlantLogistic ↔ PlantQuality Integration

**Planned scope:**
- Link vehicle orders to quality defects and 8D reports
- Quality hold triggers in production pipeline linked to PlantQuality defects
- Vehicle order quality history view
- Cross-module KPI: orders on quality hold → impact on delivery
- Quality event feed on order detail page
- Defect-to-order traceability

---

## Deferred Items

- PlantDock module (warehouse gate & dock scheduling)
- PlantQuote module (RFQ & supplier bidding)
- ERP integration (SAP, Oracle, Dynamics)
- Advanced analytics and reporting dashboards
- PDF/Excel export for orders and reports
- AI order prediction (demand forecasting)
- Payment/billing changes
- Multi-plant production coordination (depends on v3.2.0)
- VIN lifecycle tracking beyond delivery
- Regulatory compliance module (homologation tracking)