-- Migration: Backfill agent default permissions for all workspaces
-- Ensures all 4 standard agent permissions ('conversation:reply', 'conversation:status:update', 'dashboard:view', 'team:view')
-- exist in workspace_default_permissions for every workspace, backfilling any missing records gracefully.

INSERT INTO "workspace_default_permissions" ("workspace_id", "permission_id", "created_at")
SELECT 
    w."id" AS "workspace_id", 
    p."id" AS "permission_id",
    NOW() AS "created_at"
FROM "workspaces" w
CROSS JOIN "permissions" p
WHERE p."key" IN ('conversation:reply', 'conversation:status:update', 'dashboard:view', 'team:view')
ON CONFLICT ("workspace_id", "permission_id") DO NOTHING;
