# Changelog

All notable PlantX changes are documented here. The project follows semantic versioning for release tags.

## [3.8.0] — 2026-08-31

### Added

- Enterprise PlantLogistic workflow orchestration with versioned definitions, drafts, published versions, nodes, edges, runtime instances, active tasks, and event history.
- Visual business workflow designer with graph validation, action-aware transitions, user and organization-unit assignments, publication, restoration, and default workflow selection.
- Workflow runtime authorization and task ownership for plan-sheet actions.
- Plan-sheet workflow timeline, line-level forecast/review rules, rejection feedback, notifications, and automatic order generation.
- Database migration, generated Prisma client models, seed bootstrap, and existing plan-sheet workflow backfill.
- Unit tests for workflow graphs, assignment rules, runtime transitions, and plan-sheet date/status validation.
- Reusable alert dialog, native select, radio group, skeleton, and switch UI primitives.
- Expanded Turkish and English localization for workflow, confirmation, status, loading, and error states.

### Changed

- Upgraded the PlantLogistic board with optimistic drag-and-drop, topology-aware destinations, operational ownership context, and audited administrator overrides.
- Refined vehicle flow editing with multi-port connections, dedicated toolbar/inspector components, fit-view controls, and clearer validation feedback.
- Integrated workflow access state into plan-sheet creation, submission, review, approval, rejection, cancellation, and order generation.
- Standardized semantic color tokens, emerald branding, loading skeletons, application dialogs, and shared form/table primitives across the web application.
- Strengthened ESLint rules to reject native alerts and raw interactive/table elements outside the shared UI layer.

### Fixed

- Closed company-scoping gaps in vehicle model and plan-sheet mutations.
- Prevented unauthorized workflow actions by validating the active task assignee, organization unit, role, and tenant on the server.
- Prevented stale concurrent vehicle/workflow transitions with revision-guarded updates and recovery paths.
- Rejected disconnected, cyclic, ambiguous, or incomplete workflow graphs before publication.
- Prevented confirmation without a forecast date, past forecast dates, changes to locked/generated rows, and rejection without a reason.
- Improved failed optimistic updates by restoring prior board state and returning localized destructive feedback.
- Replaced inconsistent browser confirmations and hardcoded UI messages with localized application-level components.
- Removed the production build dependency on Google Fonts by bundling Geist locally.
- Declared direct Auth.js core and root Nodemailer dependencies so npm 10/11 workspace installs resolve identically.

### Security

- Added tenant filters to the new workflow data model and all workflow/plan-sheet access paths.
- Enforced assignment-based capabilities server-side instead of relying on visible UI controls.
- Preserved actor metadata and company boundaries in workflow, plan-sheet, vehicle, and notification events.
- Updated Next.js, Auth.js core/adapter, Nodemailer, Prisma, html2pdf.js, and jsPDF to patched release lines and refreshed transitive dependencies.

[3.8.0]: https://github.com/aokcuoglu/plantx/releases/tag/v3.8.0
