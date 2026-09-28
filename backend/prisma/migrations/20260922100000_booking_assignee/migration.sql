ALTER TABLE "app_private"."TourBooking" ADD COLUMN "assigneeId" UUID;
CREATE INDEX "TourBooking_assigneeId_idx" ON "app_private"."TourBooking"("assigneeId");
