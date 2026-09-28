-- Additive fields only: existing agreements and bill due dates remain unchanged.
ALTER TABLE app_private."BusinessPartner"
 ADD COLUMN "billingMode" varchar(20),
 ADD COLUMN "billingCycleCount" integer,
 ADD COLUMN "billingCycleUnit" varchar(10),
 ADD COLUMN "billingCycleAnchor" date,
 ADD COLUMN "creditCount" integer,
 ADD COLUMN "creditUnit" varchar(10),
 ADD COLUMN "creditAnchor" varchar(20);
ALTER TABLE app_private."AgentBill"
 ADD COLUMN "billingPolicySnapshot" jsonb,
 ADD COLUMN "originalDueOn" date,
 ADD COLUMN "promisedOn" date,
 ADD COLUMN "rescheduleHistory" jsonb NOT NULL DEFAULT '[]';

CREATE TABLE app_private."BookingReceipt" (
 "id" uuid PRIMARY KEY, "bookingId" uuid NOT NULL REFERENCES app_private."TourBooking"(id),
 "agentId" uuid REFERENCES app_private."BusinessPartner"(id), "payer" varchar(20) NOT NULL,
 "basis" varchar(20) NOT NULL, "received" decimal(14,2) NOT NULL,
 "net" decimal(14,2) NOT NULL, "margin" decimal(14,2) NOT NULL,
 "refunded" decimal(14,2) NOT NULL DEFAULT 0, "receivedOn" date NOT NULL,
 "reference" varchar(300) NOT NULL, "recordedBy" uuid NOT NULL,
 "createdAt" timestamptz NOT NULL DEFAULT now(),
 CHECK ("received" > 0 AND "net" > 0 AND "margin" >= 0 AND "received" = "net" + "margin"),
 CHECK ("refunded" >= 0 AND "refunded" <= "margin")
);
CREATE INDEX "BookingReceipt_bookingId_idx" ON app_private."BookingReceipt"("bookingId");
CREATE INDEX "BookingReceipt_agentId_idx" ON app_private."BookingReceipt"("agentId");
CREATE TABLE app_private."AgentMarginOffset" (
 "id" uuid PRIMARY KEY, "receiptId" uuid NOT NULL REFERENCES app_private."BookingReceipt"(id),
 "billId" uuid REFERENCES app_private."AgentBill"(id),
 "bookingId" uuid REFERENCES app_private."TourBooking"(id),
 "amount" decimal(14,2) NOT NULL CHECK ("amount" > 0), "recordedBy" uuid NOT NULL,
 "createdAt" timestamptz NOT NULL DEFAULT now(), UNIQUE ("receiptId","billId"), CHECK (("billId" IS NULL) <> ("bookingId" IS NULL))
);
ALTER TABLE app_private."BookingReceipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private."AgentMarginOffset" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."BookingReceipt",app_private."AgentMarginOffset" FROM PUBLIC,anon,authenticated;

CREATE TABLE app_private."BookingCommissionClaim" (
 "bookingId" uuid PRIMARY KEY REFERENCES app_private."TourBooking"(id),
 "recordId" uuid NOT NULL UNIQUE REFERENCES app_private."FinancePersonnelRecord"(id),
 "createdAt" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app_private."BookingCommissionClaim" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."BookingCommissionClaim" FROM PUBLIC,anon,authenticated;

CREATE TABLE app_private."PersonalLineDelivery" (
 "id" uuid PRIMARY KEY, "eventId" uuid NOT NULL REFERENCES app_private."AuditEvent"(id),
 "userId" uuid NOT NULL REFERENCES app_private."UserProfile"(id), "mode" varchar(20) NOT NULL,
 "recipient" varchar(33) NOT NULL, "status" varchar(20) NOT NULL,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL,
 UNIQUE ("eventId","userId","mode")
);
ALTER TABLE app_private."PersonalLineDelivery" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."PersonalLineDelivery" FROM PUBLIC,anon,authenticated;

CREATE TABLE app_private."AgentRefundClaim" (
 "receiptId" uuid PRIMARY KEY REFERENCES app_private."BookingReceipt"(id),
 "recordId" uuid NOT NULL UNIQUE REFERENCES app_private."FinancePersonnelRecord"(id)
);
ALTER TABLE app_private."AgentRefundClaim" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."AgentRefundClaim" FROM PUBLIC,anon,authenticated;
