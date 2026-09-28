SET LOCAL search_path TO app_private, pg_catalog;
-- CreateTable
CREATE TABLE "GuideAssignment" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "bookingId" UUID NOT NULL,
    "guideId" UUID NOT NULL,
    "startsAt" TIMESTAMPTZ(6) NOT NULL,
    "endsAt" TIMESTAMPTZ(6) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    "notes" VARCHAR(2000),
    "requestHash" VARCHAR(64) NOT NULL,

    CONSTRAINT "GuideAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuideAssignment_guideId_status_startsAt_idx" ON "GuideAssignment"("guideId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "GuideAssignment_bookingId_idx" ON "GuideAssignment"("bookingId");

-- AddForeignKey
ALTER TABLE "GuideAssignment" ADD CONSTRAINT "GuideAssignment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "TourBooking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideAssignment" ADD CONSTRAINT "GuideAssignment_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GuideAssignment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "GuideAssignment" FROM anon, authenticated, PUBLIC;
ALTER TABLE "GuideAssignment" ADD CONSTRAINT "GuideAssignment_status_check" CHECK (status IN ('PLANNED','COMPLETED','CANCELLED'));
ALTER TABLE "GuideAssignment" ADD CONSTRAINT "GuideAssignment_time_check" CHECK ("endsAt" > "startsAt");
