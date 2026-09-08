ALTER TABLE app_private."UserProfile"
  ADD COLUMN "address" VARCHAR(1000),
  ADD COLUMN "primaryPhone" VARCHAR(32),
  ADD COLUMN "emergencyPhone" VARCHAR(32),
  ADD COLUMN "lineId" VARCHAR(100);
