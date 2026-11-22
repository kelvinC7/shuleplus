-- CreateTable
CREATE TABLE "document_verifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "pdf_hash" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_verification_events" (
    "id" TEXT NOT NULL,
    "verification_id" TEXT,
    "organization_id" TEXT,
    "document_type" TEXT,
    "reference" TEXT,
    "token" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_verification_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_verifications_token_key" ON "document_verifications"("token");

-- CreateIndex
CREATE UNIQUE INDEX "document_verifications_org_type_doc_key" ON "document_verifications"("organization_id", "document_type", "document_id");

-- CreateIndex
CREATE INDEX "document_verifications_organization_id_idx" ON "document_verifications"("organization_id");

-- CreateIndex
CREATE INDEX "document_verifications_document_type_document_id_idx" ON "document_verifications"("document_type", "document_id");

-- CreateIndex
CREATE INDEX "document_verification_events_token_idx" ON "document_verification_events"("token");

-- CreateIndex
CREATE INDEX "document_verification_events_organization_id_idx" ON "document_verification_events"("organization_id");

-- CreateIndex
CREATE INDEX "document_verification_events_created_at_idx" ON "document_verification_events"("created_at");

-- AddForeignKey
ALTER TABLE "document_verifications" ADD CONSTRAINT "document_verifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_verification_events" ADD CONSTRAINT "document_verification_events_verification_id_fkey" FOREIGN KEY ("verification_id") REFERENCES "document_verifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_verification_events" ADD CONSTRAINT "document_verification_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tenants"("organization_id") ON DELETE SET NULL ON UPDATE CASCADE;
