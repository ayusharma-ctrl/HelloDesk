-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN "short_name" TEXT,
ADD COLUMN "logo_url" TEXT;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN "attachments" JSONB,
ADD COLUMN "media_type" TEXT;
