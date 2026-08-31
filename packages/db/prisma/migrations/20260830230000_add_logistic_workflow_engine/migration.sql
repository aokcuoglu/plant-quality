CREATE TYPE "LogisticWorkflowSubjectType" AS ENUM ('PLAN_SHEET', 'ORDER', 'VEHICLE_UNIT', 'YARD_RECORD', 'DISPATCH');
CREATE TYPE "LogisticWorkflowNodeKind" AS ENUM ('START', 'TASK', 'APPROVAL', 'DECISION', 'AUTOMATION', 'WAIT', 'END');
CREATE TYPE "LogisticWorkflowAssignmentStrategy" AS ENUM ('NONE', 'ACTOR', 'USER', 'ORGANIZATION_UNIT');
CREATE TYPE "LogisticWorkflowTaskScope" AS ENUM ('INSTANCE', 'EACH_LINE', 'EACH_VEHICLE_GROUP');
CREATE TYPE "LogisticWorkflowInstanceStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'SUSPENDED');
CREATE TYPE "LogisticWorkflowTaskStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

CREATE TABLE "logistic_workflow_definitions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject_type" "LogisticWorkflowSubjectType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "logistic_workflow_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "logistic_workflow_versions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "definition_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "LogisticFlowVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "published_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "logistic_workflow_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "logistic_workflow_nodes" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "workflow_version_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "kind" "LogisticWorkflowNodeKind" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "position_x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position_y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "assignment_strategy" "LogisticWorkflowAssignmentStrategy" NOT NULL DEFAULT 'NONE',
    "organization_unit_id" TEXT,
    "responsible_user_id" TEXT,
    "task_scope" "LogisticWorkflowTaskScope" NOT NULL DEFAULT 'INSTANCE',
    "allowed_actions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "automation_action_key" TEXT,
    "target_duration_minutes" INTEGER,
    "configuration" JSONB,
    CONSTRAINT "logistic_workflow_nodes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "logistic_workflow_edges" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "workflow_version_id" TEXT NOT NULL,
    "source_client_id" TEXT NOT NULL,
    "target_client_id" TEXT NOT NULL,
    "action_key" TEXT,
    "label" TEXT,
    CONSTRAINT "logistic_workflow_edges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "logistic_workflow_instances" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "definition_id" TEXT NOT NULL,
    "workflow_version_id" TEXT NOT NULL,
    "subject_type" "LogisticWorkflowSubjectType" NOT NULL,
    "subject_id" TEXT NOT NULL,
    "current_node_id" TEXT,
    "status" "LogisticWorkflowInstanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "context" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "logistic_workflow_instances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "logistic_workflow_tasks" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "scope_key" TEXT NOT NULL DEFAULT 'INSTANCE',
    "status" "LogisticWorkflowTaskStatus" NOT NULL DEFAULT 'ACTIVE',
    "assigned_user_id" TEXT,
    "assigned_organization_unit_id" TEXT,
    "allowed_actions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "completed_by_id" TEXT,
    "resolution" TEXT,
    CONSTRAINT "logistic_workflow_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "logistic_workflow_events" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "from_node_id" TEXT,
    "to_node_id" TEXT,
    "action_key" TEXT,
    "actor_id" TEXT,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "logistic_workflow_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "logistic_workflow_definitions_company_id_subject_type_activ_idx" ON "logistic_workflow_definitions"("company_id", "subject_type", "active");
CREATE UNIQUE INDEX "logistic_workflow_definitions_company_id_code_key" ON "logistic_workflow_definitions"("company_id", "code");
CREATE UNIQUE INDEX "logistic_workflow_definitions_one_default_per_subject" ON "logistic_workflow_definitions"("company_id", "subject_type") WHERE "is_default" = true AND "active" = true;
CREATE INDEX "logistic_workflow_versions_company_id_definition_id_status_idx" ON "logistic_workflow_versions"("company_id", "definition_id", "status");
CREATE UNIQUE INDEX "logistic_workflow_versions_definition_id_version_key" ON "logistic_workflow_versions"("definition_id", "version");
CREATE UNIQUE INDEX "logistic_workflow_versions_one_draft_per_definition" ON "logistic_workflow_versions"("definition_id") WHERE "status" = 'DRAFT';
CREATE UNIQUE INDEX "logistic_workflow_versions_one_published_per_definition" ON "logistic_workflow_versions"("definition_id") WHERE "status" = 'PUBLISHED';
CREATE INDEX "logistic_workflow_nodes_company_id_kind_idx" ON "logistic_workflow_nodes"("company_id", "kind");
CREATE UNIQUE INDEX "logistic_workflow_nodes_workflow_version_id_client_id_key" ON "logistic_workflow_nodes"("workflow_version_id", "client_id");
CREATE UNIQUE INDEX "logistic_workflow_nodes_workflow_version_id_sequence_key" ON "logistic_workflow_nodes"("workflow_version_id", "sequence");
CREATE INDEX "logistic_workflow_edges_company_id_workflow_version_id_idx" ON "logistic_workflow_edges"("company_id", "workflow_version_id");
CREATE UNIQUE INDEX "logistic_workflow_edges_workflow_version_id_source_client_i_key" ON "logistic_workflow_edges"("workflow_version_id", "source_client_id", "target_client_id", "action_key");
CREATE INDEX "logistic_workflow_instances_company_id_subject_type_subject_idx" ON "logistic_workflow_instances"("company_id", "subject_type", "subject_id", "status");
CREATE INDEX "logistic_workflow_instances_company_id_current_node_id_stat_idx" ON "logistic_workflow_instances"("company_id", "current_node_id", "status");
CREATE UNIQUE INDEX "logistic_workflow_instances_company_id_definition_id_subjec_key" ON "logistic_workflow_instances"("company_id", "definition_id", "subject_type", "subject_id");
CREATE INDEX "logistic_workflow_tasks_company_id_status_assigned_user_id_idx" ON "logistic_workflow_tasks"("company_id", "status", "assigned_user_id");
CREATE INDEX "logistic_workflow_tasks_company_id_status_assigned_organiza_idx" ON "logistic_workflow_tasks"("company_id", "status", "assigned_organization_unit_id");
CREATE INDEX "logistic_workflow_tasks_instance_id_node_id_scope_key_status_idx" ON "logistic_workflow_tasks"("instance_id", "node_id", "scope_key", "status");
CREATE INDEX "logistic_workflow_events_company_id_instance_id_created_at_idx" ON "logistic_workflow_events"("company_id", "instance_id", "created_at");

ALTER TABLE "logistic_workflow_definitions" ADD CONSTRAINT "logistic_workflow_definitions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_versions" ADD CONSTRAINT "logistic_workflow_versions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_versions" ADD CONSTRAINT "logistic_workflow_versions_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "logistic_workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_versions" ADD CONSTRAINT "logistic_workflow_versions_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_nodes" ADD CONSTRAINT "logistic_workflow_nodes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_nodes" ADD CONSTRAINT "logistic_workflow_nodes_workflow_version_id_fkey" FOREIGN KEY ("workflow_version_id") REFERENCES "logistic_workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_nodes" ADD CONSTRAINT "logistic_workflow_nodes_organization_unit_id_fkey" FOREIGN KEY ("organization_unit_id") REFERENCES "organization_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_nodes" ADD CONSTRAINT "logistic_workflow_nodes_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_edges" ADD CONSTRAINT "logistic_workflow_edges_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_edges" ADD CONSTRAINT "logistic_workflow_edges_workflow_version_id_fkey" FOREIGN KEY ("workflow_version_id") REFERENCES "logistic_workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_instances" ADD CONSTRAINT "logistic_workflow_instances_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_instances" ADD CONSTRAINT "logistic_workflow_instances_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "logistic_workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_instances" ADD CONSTRAINT "logistic_workflow_instances_workflow_version_id_fkey" FOREIGN KEY ("workflow_version_id") REFERENCES "logistic_workflow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_instances" ADD CONSTRAINT "logistic_workflow_instances_current_node_id_fkey" FOREIGN KEY ("current_node_id") REFERENCES "logistic_workflow_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_tasks" ADD CONSTRAINT "logistic_workflow_tasks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_tasks" ADD CONSTRAINT "logistic_workflow_tasks_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "logistic_workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_tasks" ADD CONSTRAINT "logistic_workflow_tasks_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "logistic_workflow_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_tasks" ADD CONSTRAINT "logistic_workflow_tasks_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_tasks" ADD CONSTRAINT "logistic_workflow_tasks_assigned_organization_unit_id_fkey" FOREIGN KEY ("assigned_organization_unit_id") REFERENCES "organization_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_tasks" ADD CONSTRAINT "logistic_workflow_tasks_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_events" ADD CONSTRAINT "logistic_workflow_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_events" ADD CONSTRAINT "logistic_workflow_events_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "logistic_workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_events" ADD CONSTRAINT "logistic_workflow_events_from_node_id_fkey" FOREIGN KEY ("from_node_id") REFERENCES "logistic_workflow_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_events" ADD CONSTRAINT "logistic_workflow_events_to_node_id_fkey" FOREIGN KEY ("to_node_id") REFERENCES "logistic_workflow_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "logistic_workflow_events" ADD CONSTRAINT "logistic_workflow_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Bootstrap the first dynamic PlantLogistic workflow for existing OEM tenants.
-- Assignment is derived from the first owned process of a published vehicle flow;
-- if no process owner exists, the tenant admin becomes the initial reviewer.
INSERT INTO "logistic_workflow_definitions" (
    "id", "company_id", "code", "name", "description", "subject_type", "active", "is_default", "updated_at"
)
SELECT
    'plan-sheet-workflow-' || c."id",
    c."id",
    'PLAN_SHEET_APPROVAL',
    'Plan Sheet Approval',
    'Dynamic review and order-generation workflow for monthly chassis lists.',
    'PLAN_SHEET',
    true,
    true,
    CURRENT_TIMESTAMP
FROM "companies" c
WHERE c."type" = 'OEM';

INSERT INTO "logistic_workflow_versions" (
    "id", "company_id", "definition_id", "version", "status", "published_at", "published_by_id", "updated_at"
)
SELECT
    'plan-sheet-workflow-v1-' || d."company_id",
    d."company_id",
    d."id",
    1,
    'PUBLISHED',
    CURRENT_TIMESTAMP,
    (
        SELECT u."id"
        FROM "users" u
        WHERE u."companyId" = d."company_id" AND u."role" IN ('ADMIN', 'SUPER_ADMIN')
        ORDER BY CASE WHEN u."role" = 'ADMIN' THEN 0 ELSE 1 END, u."createdAt"
        LIMIT 1
    ),
    CURRENT_TIMESTAMP
FROM "logistic_workflow_definitions" d
WHERE d."code" = 'PLAN_SHEET_APPROVAL';

INSERT INTO "logistic_workflow_nodes" (
    "id", "company_id", "workflow_version_id", "client_id", "kind", "sequence", "position_x", "position_y",
    "name", "description", "assignment_strategy", "task_scope", "allowed_actions"
)
SELECT 'plan-sheet-start-' || v."company_id", v."company_id", v."id", 'start', 'START', 0, 60, 180,
       'Start', NULL, 'NONE', 'INSTANCE', ARRAY[]::TEXT[]
FROM "logistic_workflow_versions" v
JOIN "logistic_workflow_definitions" d ON d."id" = v."definition_id"
WHERE d."code" = 'PLAN_SHEET_APPROVAL' AND v."version" = 1;

INSERT INTO "logistic_workflow_nodes" (
    "id", "company_id", "workflow_version_id", "client_id", "kind", "sequence", "position_x", "position_y",
    "name", "description", "assignment_strategy", "task_scope", "allowed_actions"
)
SELECT 'plan-sheet-sales-' || v."company_id", v."company_id", v."id", 'sales-preparation', 'TASK', 1, 300, 180,
       'Sales Preparation', 'Prepare the chassis list and send it for review.', 'ACTOR', 'INSTANCE',
       ARRAY['PLAN_SHEET_EDIT', 'PLAN_SHEET_SUBMIT', 'PLAN_SHEET_CANCEL']::TEXT[]
FROM "logistic_workflow_versions" v
JOIN "logistic_workflow_definitions" d ON d."id" = v."definition_id"
WHERE d."code" = 'PLAN_SHEET_APPROVAL' AND v."version" = 1;

INSERT INTO "logistic_workflow_nodes" (
    "id", "company_id", "workflow_version_id", "client_id", "kind", "sequence", "position_x", "position_y",
    "name", "description", "assignment_strategy", "organization_unit_id", "responsible_user_id", "task_scope", "allowed_actions"
)
SELECT
    'plan-sheet-review-' || v."company_id",
    v."company_id",
    v."id",
    'production-review',
    'APPROVAL',
    2,
    560,
    180,
    'Production Review',
    'Set forecast dispatch dates, review lines, and approve or reject the list.',
    CASE WHEN reviewer."user_id" IS NOT NULL THEN 'USER'::"LogisticWorkflowAssignmentStrategy"
         WHEN reviewer."organization_unit_id" IS NOT NULL THEN 'ORGANIZATION_UNIT'::"LogisticWorkflowAssignmentStrategy"
         ELSE 'NONE'::"LogisticWorkflowAssignmentStrategy" END,
    reviewer."organization_unit_id",
    reviewer."user_id",
    'INSTANCE',
    ARRAY['PLAN_SHEET_SET_FORECAST', 'PLAN_SHEET_REVIEW_LINE', 'PLAN_SHEET_APPROVE', 'PLAN_SHEET_REJECT']::TEXT[]
FROM "logistic_workflow_versions" v
JOIN "logistic_workflow_definitions" d ON d."id" = v."definition_id"
LEFT JOIN LATERAL (
    SELECT
        COALESCE(
            owned."responsible_user_id",
            (
                SELECT u."id"
                FROM "users" u
                WHERE u."companyId" = v."company_id" AND u."role" IN ('ADMIN', 'SUPER_ADMIN')
                ORDER BY CASE WHEN u."role" = 'ADMIN' THEN 0 ELSE 1 END, u."createdAt"
                LIMIT 1
            )
        ) AS "user_id",
        owned."organization_unit_id_snapshot" AS "organization_unit_id"
    FROM (
        SELECT n."responsible_user_id", n."organization_unit_id_snapshot"
        FROM "logistic_flow_nodes" n
        JOIN "logistic_flow_versions" fv ON fv."id" = n."flow_version_id"
        WHERE fv."company_id" = v."company_id"
          AND fv."status" = 'PUBLISHED'
          AND n."kind" = 'PROCESS'
          AND (n."responsible_user_id" IS NOT NULL OR n."organization_unit_id_snapshot" IS NOT NULL)
        ORDER BY n."sequence", fv."published_at" DESC NULLS LAST
        LIMIT 1
    ) owned
    UNION ALL
    SELECT
        (
            SELECT u."id"
            FROM "users" u
            WHERE u."companyId" = v."company_id" AND u."role" IN ('ADMIN', 'SUPER_ADMIN')
            ORDER BY CASE WHEN u."role" = 'ADMIN' THEN 0 ELSE 1 END, u."createdAt"
            LIMIT 1
        ),
        NULL::TEXT
    WHERE NOT EXISTS (
        SELECT 1
        FROM "logistic_flow_nodes" n
        JOIN "logistic_flow_versions" fv ON fv."id" = n."flow_version_id"
        WHERE fv."company_id" = v."company_id"
          AND fv."status" = 'PUBLISHED'
          AND n."kind" = 'PROCESS'
          AND (n."responsible_user_id" IS NOT NULL OR n."organization_unit_id_snapshot" IS NOT NULL)
    )
    LIMIT 1
) reviewer ON true
WHERE d."code" = 'PLAN_SHEET_APPROVAL' AND v."version" = 1;

INSERT INTO "logistic_workflow_nodes" (
    "id", "company_id", "workflow_version_id", "client_id", "kind", "sequence", "position_x", "position_y",
    "name", "description", "assignment_strategy", "task_scope", "allowed_actions"
)
SELECT 'plan-sheet-end-' || v."company_id", v."company_id", v."id", 'end', 'END', 3, 820, 180,
       'End', NULL, 'NONE', 'INSTANCE', ARRAY[]::TEXT[]
FROM "logistic_workflow_versions" v
JOIN "logistic_workflow_definitions" d ON d."id" = v."definition_id"
WHERE d."code" = 'PLAN_SHEET_APPROVAL' AND v."version" = 1;

INSERT INTO "logistic_workflow_edges" (
    "id", "company_id", "workflow_version_id", "source_client_id", "target_client_id", "action_key", "label"
)
SELECT 'plan-sheet-edge-start-' || v."company_id", v."company_id", v."id", 'start', 'sales-preparation', NULL, NULL
FROM "logistic_workflow_versions" v
JOIN "logistic_workflow_definitions" d ON d."id" = v."definition_id"
WHERE d."code" = 'PLAN_SHEET_APPROVAL' AND v."version" = 1
UNION ALL
SELECT 'plan-sheet-edge-submit-' || v."company_id", v."company_id", v."id", 'sales-preparation', 'production-review', 'PLAN_SHEET_SUBMIT', 'Submit'
FROM "logistic_workflow_versions" v
JOIN "logistic_workflow_definitions" d ON d."id" = v."definition_id"
WHERE d."code" = 'PLAN_SHEET_APPROVAL' AND v."version" = 1
UNION ALL
SELECT 'plan-sheet-edge-cancel-' || v."company_id", v."company_id", v."id", 'sales-preparation', 'end', 'PLAN_SHEET_CANCEL', 'Cancel'
FROM "logistic_workflow_versions" v
JOIN "logistic_workflow_definitions" d ON d."id" = v."definition_id"
WHERE d."code" = 'PLAN_SHEET_APPROVAL' AND v."version" = 1
UNION ALL
SELECT 'plan-sheet-edge-approve-' || v."company_id", v."company_id", v."id", 'production-review', 'end', 'PLAN_SHEET_APPROVE', 'Approve'
FROM "logistic_workflow_versions" v
JOIN "logistic_workflow_definitions" d ON d."id" = v."definition_id"
WHERE d."code" = 'PLAN_SHEET_APPROVAL' AND v."version" = 1
UNION ALL
SELECT 'plan-sheet-edge-reject-' || v."company_id", v."company_id", v."id", 'production-review', 'end', 'PLAN_SHEET_REJECT', 'Reject'
FROM "logistic_workflow_versions" v
JOIN "logistic_workflow_definitions" d ON d."id" = v."definition_id"
WHERE d."code" = 'PLAN_SHEET_APPROVAL' AND v."version" = 1;

-- Pin existing plan sheets to v1 and place them at the node that matches their current status.
INSERT INTO "logistic_workflow_instances" (
    "id", "company_id", "definition_id", "workflow_version_id", "subject_type", "subject_id",
    "current_node_id", "status", "revision", "started_at", "completed_at"
)
SELECT
    'plan-sheet-instance-' || ps."id",
    ps."company_id",
    d."id",
    v."id",
    'PLAN_SHEET',
    ps."id",
    CASE
        WHEN ps."status" = 'DRAFT' THEN 'plan-sheet-sales-' || ps."company_id"
        WHEN ps."status" IN ('SUBMITTED', 'UNDER_REVIEW') THEN 'plan-sheet-review-' || ps."company_id"
        ELSE 'plan-sheet-end-' || ps."company_id"
    END,
    CASE WHEN ps."status" IN ('APPROVED', 'REJECTED', 'CANCELLED') THEN 'COMPLETED'::"LogisticWorkflowInstanceStatus"
         ELSE 'ACTIVE'::"LogisticWorkflowInstanceStatus" END,
    0,
    ps."created_at",
    CASE WHEN ps."status" IN ('APPROVED', 'REJECTED', 'CANCELLED') THEN COALESCE(ps."approved_at", ps."rejected_at", ps."updated_at") ELSE NULL END
FROM "plant_logistic_plan_sheets" ps
JOIN "logistic_workflow_definitions" d ON d."company_id" = ps."company_id" AND d."code" = 'PLAN_SHEET_APPROVAL'
JOIN "logistic_workflow_versions" v ON v."definition_id" = d."id" AND v."version" = 1;

INSERT INTO "logistic_workflow_tasks" (
    "id", "company_id", "instance_id", "node_id", "scope_key", "status", "assigned_user_id",
    "assigned_organization_unit_id", "allowed_actions", "started_at"
)
SELECT
    'plan-sheet-task-' || ps."id",
    ps."company_id",
    'plan-sheet-instance-' || ps."id",
    CASE WHEN ps."status" = 'DRAFT' THEN 'plan-sheet-sales-' || ps."company_id" ELSE 'plan-sheet-review-' || ps."company_id" END,
    'INSTANCE',
    'ACTIVE',
    CASE WHEN ps."status" = 'DRAFT' THEN ps."created_by_id" ELSE review."responsible_user_id" END,
    CASE WHEN ps."status" = 'DRAFT' THEN NULL ELSE review."organization_unit_id" END,
    CASE WHEN ps."status" = 'DRAFT'
         THEN ARRAY['PLAN_SHEET_EDIT', 'PLAN_SHEET_SUBMIT', 'PLAN_SHEET_CANCEL']::TEXT[]
         ELSE ARRAY['PLAN_SHEET_SET_FORECAST', 'PLAN_SHEET_REVIEW_LINE', 'PLAN_SHEET_APPROVE', 'PLAN_SHEET_REJECT']::TEXT[] END,
    COALESCE(ps."submitted_at", ps."created_at")
FROM "plant_logistic_plan_sheets" ps
JOIN "logistic_workflow_instances" i ON i."subject_id" = ps."id" AND i."company_id" = ps."company_id"
JOIN "logistic_workflow_nodes" review ON review."id" = 'plan-sheet-review-' || ps."company_id"
WHERE ps."status" IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW');
