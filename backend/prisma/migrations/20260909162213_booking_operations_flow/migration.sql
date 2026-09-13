BEGIN;
-- Additive Booking intake and downstream preparation migration. Existing prices and stock are preserved.
ALTER TABLE app_private."TourProgram" ADD COLUMN "journeyMode" VARCHAR(30) NOT NULL DEFAULT 'FIXED', ADD COLUMN "durationDays" INTEGER DEFAULT 1;
-- Infer only a single consistent duration from existing dated trips; ambiguous/unconfigured programs require review.
UPDATE app_private."TourProgram" p SET "durationDays" = (SELECT CASE WHEN count(DISTINCT ((t."endsAt" AT TIME ZONE 'Asia/Bangkok')::date-(t."startsAt" AT TIME ZONE 'Asia/Bangkok')::date+1))=1 THEN min((t."endsAt" AT TIME ZONE 'Asia/Bangkok')::date-(t."startsAt" AT TIME ZONE 'Asia/Bangkok')::date+1) ELSE NULL END FROM app_private."OperationTrip" t WHERE t."tourId"=p.id);
ALTER TABLE app_private."TourProgram" ADD CONSTRAINT "TourProgram_journey_check" CHECK ("journeyMode" IN ('FIXED','OPEN_RETURN','OUTBOUND_ONLY','RETURN_ONLY') AND ("durationDays" IS NULL OR "durationDays" BETWEEN 1 AND 366));
ALTER TABLE app_private."BusinessPartner" ADD COLUMN "allowedPaymentTerms" TEXT[] NOT NULL DEFAULT ARRAY['PREPAID','PAID','COUNTER','AGENT_CREDIT'], ADD COLUMN "defaultPaymentTerms" VARCHAR(30) NOT NULL DEFAULT 'COUNTER';
ALTER TABLE app_private."ProgramComponent" ADD COLUMN "removalCredit" DECIMAL(10,2), ADD CONSTRAINT "ProgramComponent_credit_check" CHECK ("removalCredit" IS NULL OR "removalCredit">=0);
ALTER TABLE app_private."TourBooking" ADD COLUMN "outboundDate" DATE, ADD COLUMN "returnDate" DATE, ADD COLUMN "returnStatus" VARCHAR(20) NOT NULL DEFAULT 'OUR', ADD COLUMN "createdById" UUID, ADD COLUMN "hotelId" UUID, ADD COLUMN "channelId" UUID, ADD COLUMN "allergyStatus" VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN', ADD COLUMN "specialRequirements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE app_private."TourBooking" b SET "outboundDate"=(t."startsAt" AT TIME ZONE 'Asia/Bangkok')::date,"returnDate"=(t."endsAt" AT TIME ZONE 'Asia/Bangkok')::date,"allergyStatus"=CASE WHEN nullif(trim(b.allergies),'') IS NOT NULL THEN 'HAS' ELSE 'UNKNOWN' END FROM app_private."OperationTrip" t WHERE b."tripId"=t.id;
CREATE INDEX "TourBooking_outboundDate_status_idx" ON app_private."TourBooking"("outboundDate",status);
CREATE INDEX "TourBooking_returnDate_status_idx" ON app_private."TourBooking"("returnDate",status);
ALTER TABLE app_private."TourBooking" ADD CONSTRAINT "TourBooking_dates_check" CHECK (("outboundDate" IS NULL OR "returnDate" IS NULL OR "returnDate">="outboundDate") AND "returnStatus" IN ('OUR','PENDING','OTHER','NONE') AND "allergyStatus" IN ('UNKNOWN','NONE','HAS'));
ALTER TABLE app_private."TourBooking" ADD CONSTRAINT "TourBooking_hotel_fk" FOREIGN KEY ("hotelId") REFERENCES app_private."PickupLocation"(id) ON DELETE RESTRICT, ADD CONSTRAINT "TourBooking_channel_fk" FOREIGN KEY ("channelId") REFERENCES app_private."SalesChannel"(id) ON DELETE RESTRICT;
ALTER TABLE app_private."StockIssue" ADD COLUMN "runId" UUID REFERENCES app_private."DispatchRun"(id) ON DELETE RESTRICT;
CREATE INDEX "StockIssue_runId_idx" ON app_private."StockIssue"("runId");
CREATE TABLE app_private."BookingSequence" (year INTEGER PRIMARY KEY,value INTEGER NOT NULL DEFAULT 0 CHECK(value>=0));
INSERT INTO app_private."BookingSequence"(year,value) SELECT substring(code from 4 for 4)::integer,max(substring(code from 9)::integer) FROM app_private."TourBooking" WHERE code ~ '^BK-[0-9]{4}-[0-9]{1,9}$' GROUP BY substring(code from 4 for 4)::integer;
CREATE TABLE app_private."AgentAgreement" (id UUID PRIMARY KEY,version INTEGER NOT NULL DEFAULT 1,code VARCHAR(40) NOT NULL,name VARCHAR(200) NOT NULL,"agentId" UUID NOT NULL REFERENCES app_private."BusinessPartner"(id) ON DELETE RESTRICT,"startsOn" DATE NOT NULL,"endsOn" DATE NOT NULL,"signedOn" DATE,"evidenceUrl" VARCHAR(2048),status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',"createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),CHECK("endsOn">="startsOn"));
CREATE UNIQUE INDEX "AgentAgreement_code_key" ON app_private."AgentAgreement"(code);
CREATE INDEX "AgentAgreement_agentId_startsOn_endsOn_idx" ON app_private."AgentAgreement"("agentId","startsOn","endsOn");
ALTER TABLE app_private."AgentTourPrice" ADD COLUMN "agreementId" UUID REFERENCES app_private."AgentAgreement"(id) ON DELETE RESTRICT;
ALTER TABLE app_private."AgentTourPrice" DROP CONSTRAINT "AgentTourPrice_agentId_tourId_key";
CREATE UNIQUE INDEX "AgentTourPrice_agentId_tourId_agreementId_key" ON app_private."AgentTourPrice"("agentId","tourId","agreementId");
CREATE UNIQUE INDEX "AgentTourPrice_legacy_key" ON app_private."AgentTourPrice"("agentId","tourId") WHERE "agreementId" IS NULL;
ALTER TABLE app_private."BookingSequence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private."AgentAgreement" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."BookingSequence",app_private."AgentAgreement" FROM PUBLIC,anon,authenticated;

ALTER TABLE app_private."ProgramComponent" DROP CONSTRAINT "component_domain";
ALTER TABLE app_private."ProgramComponent" ADD CONSTRAINT "component_domain" CHECK (quantity>0 AND day>0 AND selection IN ('INCLUDED','REQUIRED','OPTIONAL','EXCLUDED') AND basis IN ('PER_PERSON','PER_BOOKING','PER_PERSON_NIGHT','PER_ADULT','PER_CHILD','PER_ROOM_NIGHT') AND status IN ('ACTIVE','INACTIVE'));
ALTER TABLE app_private."TourBooking" DROP CONSTRAINT "booking_payment_terms";
ALTER TABLE app_private."TourBooking" ADD CONSTRAINT "booking_payment_terms" CHECK ("paymentTerms" IN ('UNSET','PREPAID','PAID','COUNTER','AGENT_CREDIT','AFTER_SERVICE') AND ("paymentTerms"<>'AFTER_SERVICE' OR ("afterServiceReason" IS NOT NULL AND length(trim("afterServiceReason"))>0)) AND ("paymentTerms"<>'AGENT_CREDIT' OR "agentId" IS NOT NULL));
COMMIT;
