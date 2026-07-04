-- AlterTable
ALTER TABLE "Users" ADD COLUMN "banned_at" TIMESTAMPTZ;
ALTER TABLE "Users" ADD COLUMN "deleted_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "AuditLogs" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "actor_role" "user_role" NOT NULL,
    "target_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "ip" VARCHAR(45),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_log_actor_idx" ON "AuditLogs"("actor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_target_idx" ON "AuditLogs"("target_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "AuditLogs"("action", "created_at" DESC);
