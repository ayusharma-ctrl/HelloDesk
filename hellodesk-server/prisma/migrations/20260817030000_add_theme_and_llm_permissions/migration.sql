-- Migration: Add RBAC permissions for Theme and LLM settings
-- Seed permissions for theme:manage and llm:manage
INSERT INTO "permissions" ("id", "key", "description", "created_at")
VALUES 
  (gen_random_uuid()::text, 'theme:manage', 'theme:manage', NOW()),
  (gen_random_uuid()::text, 'llm:manage', 'llm:manage', NOW())
ON CONFLICT ("key") DO NOTHING;

-- Grant theme:manage and llm:manage to admin role
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT 
  r."id",
  p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" = 'admin'
  AND p."key" IN ('theme:manage', 'llm:manage')
ON CONFLICT DO NOTHING;
