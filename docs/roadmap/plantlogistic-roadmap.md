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

## v3.2.0 — Production Milestone Tracking

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

## v3.2.1 — Milestone Workflow Polish Patch

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

## v3.3.0 — Yard + Dispatch MVP (Current)

**Scope:**
- Yard location and parking slot management per order (`PlantLogisticYardStatus`)
- Ready for dispatch status and blocked for dispatch with reason
- Carrier assignment and dispatch batch tracking (`PlantLogisticDispatch`)
- Transport mode (ROAD, SEA, RAIL, AIR, MULTIMODAL, OTHER)
- Dispatch status workflow: NOT_PLANNED → PLANNED → CARRIER_ASSIGNED → LOADING_PLANNED → LOADED → IN_TRANSIT → ARRIVED → DELIVERED, with CANCELLED from early states
- Destination country/city, dealer/distributor, tracking reference per dispatch
- Date tracking: planned loading, actual loading, ETA, actual arrival, delivered
- Order detail Yard & Dispatch sections with inline edit and status transition actions
- Dashboard yard/dispatch summary cards: Vehicles in Yard, Ready for Dispatch, Dispatch Blocked, Loading Planned This Week, In Transit, Delivered This Month
- Order list yard/dispatch summary columns
- Dispatch status badge component
- Module entitlement / access protection (PLANT_LOGISTIC_MODULE + PLANT_LOGISTIC feature gate)
- Tenant isolation (companyId scoping on all yard/dispatch queries)
- Supplier denial (companyType check)
- Invalid dispatch status transition blocking (server-side)
- Demo seed data: 6 yard statuses, 5 dispatches, 7 yard/dispatch events
- Yard/dispatch timeline events in order activity feed
- Waiting days calculation for yard vehicles
- ETA risk highlighting for past-due estimated arrivals
- v3.3.0 internal OEM yard/dispatch visibility only — external dealer/distributor portal remains v3.4.0

**New data models:**
- `PlantLogisticYardStatus`: yardLocation, parkingSlot, readyForDispatch, blockedForDispatch, blockReason, lastMovementAt, notes (1:1 with order)
- `PlantLogisticDispatch`: dispatchBatchNo, carrierName, transportMode, status, plannedLoadingDate, actualLoadingDate, estimatedArrivalDate, actualArrivalDate, deliveredAt, destinationCountry, destinationCity, dealerOrDistributorName, trackingReference, notes (N:1 with order)
- `DispatchTransportMode` enum: ROAD, SEA, RAIL, AIR, MULTIMODAL, OTHER
- `DispatchStatus` enum: NOT_PLANNED, PLANNED, CARRIER_ASSIGNED, LOADING_PLANNED, LOADED, IN_TRANSIT, ARRIVED, DELIVERED, CANCELLED
- New `LogisticOrderEventType` values: YARD_STATUS_UPDATED, YARD_READY_FOR_DISPATCH, YARD_BLOCKED, YARD_UNBLOCKED, DISPATCH_CREATED, DISPATCH_STATUS_CHANGED, DISPATCH_CARRIER_ASSIGNED, DISPATCH_LOADING_PLANNED, DISPATCH_LOADED, DISPATCH_IN_TRANSIT, DISPATCH_ARRIVED, DISPATCH_DELIVERED, DISPATCH_CANCELLED

**New server actions:**
- Yard: upsertYardStatus, updateYardLocation, markReadyForDispatch, blockDispatch, unblockDispatch
- Dispatch: createOrUpdateDispatch, assignCarrier, changeDispatchStatus, updateDispatchDates, markLoaded, markInTransit, markArrived, markDelivered

---

## v3.3.1 — Module Switcher & Subscription Polish

**Scope:**
- AppSwitcher badge logic corrected: Active (current module), Live (entitled + live), Locked (not entitled + live), Soon (future module)
- PlantQuality and PlantLogistic never show "Soon" — always Live or Locked based on entitlement
- Plan & Usage page moved to platform-level route `/settings/plan`
- Plan & Usage now shows Module Access section (PlantQuality Active/Locked, PlantLogistic Active/Locked)
- Legacy routes `/oem/settings/plan` and `/quality/oem/settings/plan` redirect to `/settings/plan`
- Sidebar Plan & Usage link points to `/settings/plan` from both modules
- Dispatch cancel bugfix: LOADED status now included in cancelable statuses
- Yard/Dispatch server action error handling: all actions now check for error responses
- Yard waitingDays NaN risk fixed: Invalid date parsing now returns null
- PlantLogistic persona documentation clarified
- Subscription strategy documentation created
- QA checklist for module switcher and subscription

---

## v3.4.0 — Dealer / Distributor Portal MVP

**Scope:**
- `CompanyType` enum extended with `DEALER` and `DISTRIBUTOR`
- `ExternalOrderStatus` enum for safe external status mapping
- `PlantLogisticOrder` fields: `dealerCompanyId`, `distributorCompanyId`, `externalVisible`, `externalStatus`, `externalStatusNote`
- Dealer/Distributor portal route group: `/logistic/portal`, `/logistic/portal/orders`, `/logistic/portal/orders/[id]`
- Portal layout with simplified nav (Overview, My Orders)
- Portal dashboard with summary cards (total, in production, ready for dispatch, in transit, delivered)
- Portal order list with filtered visibility (only externalVisible=true, scoped by company)
- Portal order detail with masked internal data
- External status mapping from internal order/dispatch status
- OEM order detail External Visibility section with toggle, dealer/distributor selector, status override, note
- Portal server actions with strict tenant isolation (session-based companyId scoping)
- Direct URL protection: dealer/distributor cannot access another company's orders
- Route protection enforced at Server Component and Server Action level (no runtime middleware/proxy claimed for v3.4.0)
- `src/proxy.ts` present in codebase but not wired as active runtime middleware
- AppSwitcher updated: dealer/distributor see only PlantLogistic; supplier does not see PlantLogistic
- Dashboard layout updated: portal nav for dealer/distributor users
- Demo seed data: dealer company (Metro Bayi A.S.), distributor company (Akdeniz Distributor), 4 visible orders + 3 updated orders
- Module entitlement: dealer/distributor companies have no module entitlements (participant model, not subscriber)
- Sensitive data masking: VIN, chassis, production order number, sales order number, internal notes, delay reason, quality hold, milestone details hidden from portal
- Portal timeline shows only external-safe events (STATUS_CHANGED, DISPATCH_*, ORDER_CREATED)
- Prisma migration for new fields and enum values
- QA checklist for dealer/distributor portal
- Commercial docs updated with participant model clarification
- Package version bumped to 3.4.0

**New data models:**
- `ExternalOrderStatus` enum: ORDER_RECEIVED, PRODUCTION_PLANNED, IN_PRODUCTION, QUALITY_CHECK, READY_FOR_DISPATCH, DISPATCHED, IN_TRANSIT, DELIVERED, ON_HOLD
- `CompanyType` enum values: DEALER, DISTRIBUTOR (added)
- `PlantLogisticOrder` new fields: dealerCompanyId (FK), distributorCompanyId (FK), externalVisible (boolean), externalStatus (enum), externalStatusNote (text)

**New server actions:**
- `getPortalOrders`: dealer/distributor-scoped order list
- `getPortalOrderDetail`: dealer/distributor-scoped single order
- `getPortalOrderTimeline`: filtered external-safe timeline
- `getPortalDashboardStats`: dealer/distributor dashboard metric counts
- `updateOrderExternalVisibility`: OEM action for external visibility settings

**External status mapping:**
- DRAFT/SUBMITTED/COMMERCIAL_REVIEW → ORDER_RECEIVED
- APPROVED/WAITING_PRODUCTION_PLAN/PLANNED → PRODUCTION_PLANNED
- IN_PRODUCTION → IN_PRODUCTION
- QUALITY_HOLD → QUALITY_CHECK
- READY_FOR_DISPATCH → READY_FOR_DISPATCH
- DISPATCHED → IN_TRANSIT (order status-based)
- DELIVERED/CLOSED → DELIVERED
- CANCELLED/REJECTED → ON_HOLD

**Excluded (deferred to v3.5.0+):**
- Dealer self-service order creation
- Dealer comments/messaging
- Dealer document upload
- External carrier portal
- Real email notification
- ERP/MRP integration
- Payment/billing integration
- PlantQuality integration
- AI prediction
- Mobile app
- Advanced SLA/Delay Intelligence (v3.5.0)
- Broad redesign

---

## v3.4.1 — Dealer Portal UX + Access Polish

**Scope:**
- Direct URL denial UX hardening: portal users accessing unauthorized orders receive `notFound()` instead of redirect, preventing data existence leakage
- Portal server actions: `getPortalOrderDetail` and `getPortalOrderTimeline` return `NOT_FOUND` for both access denied and not found, eliminating data leak vectors
- Portal dashboard empty state: "No visible orders yet" with "Contact your OEM" message when dashboard has zero visible orders
- Shared external status helpers: `getExternalOrderStatus()`, `getExternalOrderStatusLabel()`, `getExternalEta()` added for consistent status resolution across dashboard, list, and detail
- AppSwitcher: dealer/distributor users now see only PlantLogistic in the module switcher — all other modules (Quality, Dock, Quote, etc.) are completely hidden
- Seed data fix: LO-00008 now has `dealerCompanyId` assigned (was dangling with `externalVisible=true` but no assignment)
- Seed output clarity: dealer/distributor portal seed summary logged with company IDs, visible order counts, and persona mapping
- Lint cleanup: unused `companyId` variable removed from `portal-access.ts`, unused `Supplier` interface fixed in defect form
- No new product scope

---

## v3.5.0 — SLA + Delay Intelligence

**Scope:**
- Deterministic rule-based SLA status calculation for every order (ON_TRACK, AT_RISK, DELAYED, BLOCKED, DELIVERED)
- Risk level determination (LOW, MEDIUM, HIGH, CRITICAL) based on overdue days and blocking conditions
- Delay category classification (PRODUCTION_DELAY, MILESTONE_OVERDUE, QUALITY_HOLD_AGING, YARD_AGING, DISPATCH_DELAY, DELIVERY_RISK, ETA_OVERDUE, EXTERNAL_COMMITMENT_RISK)
- Aging / waiting days calculations for yard vehicles
- Stage-level delay detection: milestone overdue, quality hold aging, yard dispatch block, dispatch loading overdue, ETA overdue
- Delay Intelligence page (`/logistic/delay-intelligence`) with KPI cards and risk table for OEM internal users
- Dashboard SLA/Delay cards: Delayed, At Risk, Blocked, ETA Overdue counts
- Order list SLA/Risk badge column with days overdue/remaining
- Order detail SLA & Delay panel showing blocking stage, delay category, internal reason, responsible department, suggested action
- Dealer/distributor external-safe delay visibility: safe status (On Track, At Risk, Delayed, In Transit, Delivered, Contact OEM) with ETA but no internal delay reasons or responsible departments
- `src/lib/logistic/sla.ts` pure helper library with no DB model additions
- Module entitlement / access protection: Delay Intelligence gated by PLANT_LOGISTIC_MODULE + PLANT_LOGISTIC feature
- Tenant isolation: all queries scoped by companyId
- Supplier denial: supplier users cannot access PlantLogistic routes
- Dealer/distributor: cannot access Delay Intelligence internal page
- Demo seed data: LO-00015 (dispatched, ETA overdue), LO-00016 (AT_RISK, milestone delayed, dealer-visible with safe external status)
- Nav updated: Delay Intelligence route added to LOGISTIC_NAV
- Feature gate: `/logistic/delay-intelligence` added to `isFeatureGatedNav`
- No new Prisma migration (calculated helpers only)
- No PlantQuality workflow changes

**Excluded:**
- AI delay prediction
- Persistent alert records / acknowledge workflow
- Automated email notifications
- Dealer/distributor messaging/comments
- PlantQuality integration (v3.6.0)
- ERP/MRP integration
- Carrier portal
- Mobile app
- PDF/Excel export
- Billing/payment integration
- Broad redesign
- SLA configuration UI

**New helper functions:**
- `getOrderSlaStatus()`, `getOrderRiskLevel()`, `getOrderDelayCategory()`, `getOrderDelaySummary()`
- `getExternalDelayStatus()`, `getExternalEta()`
- `getDaysUntilOrOverdue()`, `getCurrentBlockingStage()`
- `getMilestoneDelays()`, `getYardDelay()`, `getDispatchDelays()`
- `getInternalDelayReason()`, `getResponsibleDepartment()`, `getSuggestedAction()`

**New UI components:**
- Delay Intelligence page: `/logistic/delay-intelligence` (Server Component, OEM-only)
- `DelayRiskPanel`: order detail SLA & delay breakdown component
- `ExternalDelayPanel`: portal order detail safe delay status component
- `SlaStatusBadge` / `RiskLevelBadge`: reusable badge components

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