BEGIN;
SET LOCAL search_path TO app_private;
ALTER TABLE "TourBooking"
 ADD COLUMN "agentId" UUID,
 ADD COLUMN "agentName" VARCHAR(200),
 ADD COLUMN "agentPhone" VARCHAR(32),
 ADD COLUMN "agentReference" VARCHAR(100),
 ADD COLUMN "contactPhone" VARCHAR(32),
 ADD COLUMN "hotel" VARCHAR(200),
 ADD COLUMN "room" VARCHAR(100),
 ADD COLUMN "pickupPoint" VARCHAR(200),
 ADD COLUMN "dropoffPoint" VARCHAR(200),
 ADD COLUMN "allergies" VARCHAR(2000),
 ADD COLUMN "assistance" VARCHAR(2000),
 ADD COLUMN "requestNotes" VARCHAR(2000),
 ADD COLUMN "paymentTerms" VARCHAR(30) NOT NULL DEFAULT 'UNSET',
 ADD COLUMN "afterServiceReason" VARCHAR(1000),
 ADD CONSTRAINT "TourBooking_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "BusinessPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 ADD CONSTRAINT "booking_payment_terms" CHECK ("paymentTerms" IN ('UNSET','PAID','COUNTER','AGENT_CREDIT','AFTER_SERVICE') AND ("paymentTerms"<>'AFTER_SERVICE' OR ("afterServiceReason" IS NOT NULL AND length(trim("afterServiceReason"))>0)) AND ("paymentTerms"<>'AGENT_CREDIT' OR "agentId" IS NOT NULL));
CREATE INDEX "TourBooking_agentId_idx" ON "TourBooking"("agentId");
ALTER TABLE "BookingComponent" ADD COLUMN "dispatchDirection" VARCHAR(20) NOT NULL DEFAULT 'BOTH', ADD CONSTRAINT "booking_dispatch_direction" CHECK ("dispatchDirection" IN ('OUTBOUND','RETURN','BOTH'));
CREATE TABLE "DispatchRun" (
 "id" UUID PRIMARY KEY,
 "version" INTEGER NOT NULL DEFAULT 1,
 "code" VARCHAR(40) NOT NULL,
 "name" VARCHAR(200) NOT NULL,
 "kind" VARCHAR(20) NOT NULL,
 "direction" VARCHAR(20) NOT NULL,
 "period" VARCHAR(20) NOT NULL,
 "capacity" INTEGER NOT NULL,
 "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
 "slotId" UUID NOT NULL,
 "requestHash" CHAR(64) NOT NULL,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(6) NOT NULL,
 CONSTRAINT "DispatchRun_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ServiceSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "dispatch_run_domain" CHECK ("version">0 AND "capacity">0 AND "kind" IN ('BOAT','VEHICLE') AND "direction" IN ('OUTBOUND','RETURN') AND "period" IN ('AM','PM','CUSTOM') AND "status" IN ('OPEN','CLOSED'))
);
CREATE UNIQUE INDEX "DispatchRun_code_key" ON "DispatchRun"("code");
CREATE UNIQUE INDEX "DispatchRun_slotId_key" ON "DispatchRun"("slotId");
CREATE INDEX "DispatchRun_kind_status_idx" ON "DispatchRun"("kind","status");
CREATE TABLE "DispatchStaff" (
 "id" UUID PRIMARY KEY,
 "runId" UUID NOT NULL,
 "userId" UUID NOT NULL,
 "role" VARCHAR(50) NOT NULL,
 CONSTRAINT "DispatchStaff_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DispatchRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "DispatchStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "dispatch_staff_role" CHECK ("role" IN ('GUIDE','HEAD_GUIDE','ASSISTANT_TOUR_GUIDE','CAPTAIN','HEAD_CAPTAIN','ASSISTANT_CAPTAIN','DRIVER','HEAD_DRIVER'))
);
CREATE UNIQUE INDEX "DispatchStaff_runId_userId_key" ON "DispatchStaff"("runId","userId");
CREATE INDEX "DispatchStaff_userId_idx" ON "DispatchStaff"("userId");
CREATE TABLE "DispatchAssignment" (
 "id" UUID PRIMARY KEY,
 "runId" UUID NOT NULL,
 "bookingLineId" UUID NOT NULL,
 "adults" INTEGER NOT NULL,
 "children" INTEGER NOT NULL,
 "pickupAt" TIMESTAMPTZ(6),
 "dropoffPoint" VARCHAR(200),
 "notes" VARCHAR(1000),
 "actualAdults" INTEGER,
 "actualChildren" INTEGER,
 "changeReason" VARCHAR(1000),
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(6) NOT NULL,
 CONSTRAINT "DispatchAssignment_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DispatchRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "DispatchAssignment_bookingLineId_fkey" FOREIGN KEY ("bookingLineId") REFERENCES "BookingComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "dispatch_assignment_domain" CHECK ("adults">=0 AND "children">=0 AND "adults"+"children">0 AND (("actualAdults" IS NULL AND "actualChildren" IS NULL) OR ("actualAdults" IS NOT NULL AND "actualChildren" IS NOT NULL AND "actualAdults">=0 AND "actualChildren">=0 AND "actualAdults"<="adults" AND "actualChildren"<="children")) AND (("actualAdults" IS NULL OR ("actualAdults"="adults" AND "actualChildren"="children")) OR ("changeReason" IS NOT NULL AND length(trim("changeReason"))>0)))
);
CREATE UNIQUE INDEX "DispatchAssignment_runId_bookingLineId_key" ON "DispatchAssignment"("runId","bookingLineId");
CREATE INDEX "DispatchAssignment_bookingLineId_idx" ON "DispatchAssignment"("bookingLineId");
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['DispatchRun','DispatchStaff','DispatchAssignment'] LOOP
  EXECUTE format('ALTER TABLE app_private.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON app_private.%I FROM PUBLIC, anon, authenticated',t);
 END LOOP;
END $$;
COMMIT;
