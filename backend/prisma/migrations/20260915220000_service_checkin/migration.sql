ALTER TABLE app_private."DispatchAssignment" ADD COLUMN "status" VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED', ADD COLUMN "cancellationReason" VARCHAR(1000);
CREATE TABLE app_private."BookingAttendance" (
 "id" UUID PRIMARY KEY, "bookingId" UUID NOT NULL REFERENCES app_private."TourBooking"("id") ON DELETE RESTRICT,
 "serviceDate" DATE NOT NULL, "direction" VARCHAR(20) NOT NULL CHECK ("direction" IN ('OUTBOUND','RETURN')),
 "version" INTEGER NOT NULL DEFAULT 1,
 "adults" INTEGER NOT NULL DEFAULT 0 CHECK ("adults">=0), "children" INTEGER NOT NULL DEFAULT 0 CHECK ("children">=0),
 "noShowAdults" INTEGER NOT NULL DEFAULT 0 CHECK ("noShowAdults">=0), "noShowChildren" INTEGER NOT NULL DEFAULT 0 CHECK ("noShowChildren">=0),
 "reason" VARCHAR(1000), "financeStatus" VARCHAR(30) NOT NULL DEFAULT 'NONE', "financeReason" VARCHAR(1000), "financeReviewedBy" UUID,
 "changes" JSONB NOT NULL DEFAULT '[]', "updatedBy" UUID NOT NULL,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL,
 UNIQUE ("bookingId","serviceDate","direction")
);
CREATE INDEX "BookingAttendance_serviceDate_direction_idx" ON app_private."BookingAttendance"("serviceDate","direction");
CREATE INDEX "BookingAttendance_financeStatus_idx" ON app_private."BookingAttendance"("financeStatus");
CREATE TABLE app_private."ServiceDayClose" (
 "id" UUID PRIMARY KEY, "serviceDate" DATE NOT NULL UNIQUE, "version" INTEGER NOT NULL DEFAULT 1,
 "status" VARCHAR(20) NOT NULL DEFAULT 'CLOSED', "snapshot" JSONB NOT NULL, "reason" VARCHAR(1000), "updatedBy" UUID NOT NULL,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL
);
ALTER TABLE app_private."BookingAttendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private."ServiceDayClose" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."BookingAttendance", app_private."ServiceDayClose" FROM PUBLIC, anon, authenticated;
