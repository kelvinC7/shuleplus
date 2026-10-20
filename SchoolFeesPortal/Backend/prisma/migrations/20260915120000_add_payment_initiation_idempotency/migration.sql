-- CreateTable
CREATE TABLE "payment_initiation_idempotencies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "http_status" INTEGER NOT NULL DEFAULT 201,
    "response_body" TEXT,
    "payment_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_initiation_idempotencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_initiation_idempotencies_organization_id_idempotency_key_key" ON "payment_initiation_idempotencies"("organization_id", "idempotency_key");
