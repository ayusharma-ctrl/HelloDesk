-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN "ai_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "tier" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN "free_tier_tokens_used" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "free_tier_token_limit" INTEGER NOT NULL DEFAULT 100000,
ADD COLUMN "free_tier_reset_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN "tokens_used" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "llm_models" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'unverified',
    "rate_limit_reset_at" TIMESTAMP(3),
    "total_tokens_used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "llm_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_request_logs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "provider" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "task_type" TEXT NOT NULL,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "response_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "latency_ms" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "llm_models_workspace_id_idx" ON "llm_models"("workspace_id");

-- CreateIndex
CREATE INDEX "llm_request_logs_workspace_id_idx" ON "llm_request_logs"("workspace_id");

-- CreateIndex
CREATE INDEX "llm_request_logs_conversation_id_idx" ON "llm_request_logs"("conversation_id");

-- AddForeignKey
ALTER TABLE "llm_models" ADD CONSTRAINT "llm_models_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_request_logs" ADD CONSTRAINT "llm_request_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_request_logs" ADD CONSTRAINT "llm_request_logs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
