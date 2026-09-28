CREATE TABLE "app_private"."AgentBill" (
 "id" UUID PRIMARY KEY, "version" INTEGER NOT NULL DEFAULT 1, "title" VARCHAR(160) NOT NULL,
 "agentId" UUID NOT NULL, "agentName" VARCHAR(200) NOT NULL,
 "total" DECIMAL(14,2) NOT NULL CHECK ("total">0), "paid" DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK ("paid">=0 AND "paid"<="total"),
 "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN', "dueOn" DATE NOT NULL, "snapshot" JSONB NOT NULL,
 "createdBy" UUID NOT NULL, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "app_private"."AgentBillLine" (
 "bookingId" UUID PRIMARY KEY REFERENCES "app_private"."TourBooking"("id") ON DELETE RESTRICT,
 "billId" UUID NOT NULL REFERENCES "app_private"."AgentBill"("id") ON DELETE RESTRICT
);
CREATE TABLE "app_private"."AgentPayment" (
 "id" UUID PRIMARY KEY, "billId" UUID NOT NULL REFERENCES "app_private"."AgentBill"("id") ON DELETE RESTRICT,
 "amount" DECIMAL(14,2) NOT NULL CHECK ("amount">0), "receivedOn" DATE NOT NULL,
 "reference" VARCHAR(300) NOT NULL, "recordedBy" UUID NOT NULL, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AgentBill_agentId_status_idx" ON "app_private"."AgentBill"("agentId","status");
CREATE INDEX "AgentBillLine_billId_idx" ON "app_private"."AgentBillLine"("billId");
CREATE INDEX "AgentPayment_billId_createdAt_idx" ON "app_private"."AgentPayment"("billId","createdAt");
ALTER TABLE "app_private"."AgentBill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_private"."AgentBillLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_private"."AgentPayment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "app_private"."AgentBill", "app_private"."AgentBillLine", "app_private"."AgentPayment" FROM PUBLIC, anon, authenticated;
ALTER TABLE "app_private"."EvidenceAttachment" DROP CONSTRAINT "EvidenceAttachment_targetKind_check";
ALTER TABLE "app_private"."EvidenceAttachment" ADD CONSTRAINT "EvidenceAttachment_targetKind_check" CHECK ("targetKind" IN ('BOOKING','PERSONNEL_FINANCE','AGENT_BILL','AGENT_PAYMENT'));
