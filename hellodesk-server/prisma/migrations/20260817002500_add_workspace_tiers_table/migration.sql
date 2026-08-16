-- CreateTable
CREATE TABLE "workspace_tiers" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token_limit" INTEGER NOT NULL,
    "token_percent" INTEGER NOT NULL,
    "max_custom_models" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspace_tiers_key_key" ON "workspace_tiers"("key");

-- Seed Default Tiers
INSERT INTO "workspace_tiers" ("id", "key", "name", "token_limit", "token_percent", "max_custom_models", "created_at", "updated_at")
VALUES 
  (gen_random_uuid()::text, 'basic', 'Basic (Free)', 50000, 5, 3, NOW(), NOW()),
  (gen_random_uuid()::text, 'pro', 'Pro', 100000, 10, 5, NOW(), NOW()),
  (gen_random_uuid()::text, 'advance', 'Advance', 200000, 20, 10, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

-- AlterTable
ALTER TABLE "workspaces" DROP COLUMN IF EXISTS "tier",
DROP COLUMN IF EXISTS "free_tier_token_limit",
ADD COLUMN "tier_key" TEXT NOT NULL DEFAULT 'basic';

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_tier_key_fkey" FOREIGN KEY ("tier_key") REFERENCES "workspace_tiers"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
