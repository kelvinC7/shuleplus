-- CreateTable
CREATE TABLE "roll_call_sessions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "class_id" TEXT,
    "session_date" DATE NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Class attendance',
    "subject" TEXT,
    "period" TEXT,
    "roster" JSONB NOT NULL,
    "present_count" INTEGER NOT NULL DEFAULT 0,
    "absent_count" INTEGER NOT NULL DEFAULT 0,
    "excused_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roll_call_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roll_call_sessions_organization_id_class_name_session_date__key" ON "roll_call_sessions"("organization_id", "class_name", "session_date", "label");

-- CreateIndex
CREATE INDEX "roll_call_sessions_organization_id_session_date_idx" ON "roll_call_sessions"("organization_id", "session_date");

-- CreateIndex
CREATE INDEX "roll_call_sessions_organization_id_class_name_idx" ON "roll_call_sessions"("organization_id", "class_name");

-- AddForeignKey
ALTER TABLE "roll_call_sessions" ADD CONSTRAINT "roll_call_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
