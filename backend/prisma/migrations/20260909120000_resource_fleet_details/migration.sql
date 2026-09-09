BEGIN;
ALTER TABLE app_private."OperationResource"
 ADD COLUMN "ownership" VARCHAR(30),
 ADD COLUMN "mealPeriod" VARCHAR(30),
 ADD COLUMN "accommodationType" VARCHAR(30),
 ADD COLUMN "occupancy" INTEGER,
 ADD COLUMN "serviceMode" VARCHAR(30),
 ADD COLUMN "verificationStatus" VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED',
 ADD CONSTRAINT "resource_details_domain" CHECK (
  ("ownership" IS NULL OR "ownership" IN ('GREENVIEW','PARK','PARTNER')) AND
  ("mealPeriod" IS NULL OR ("category"='MEAL' AND "mealPeriod" IN ('BREAKFAST','LUNCH','DINNER'))) AND
  ("accommodationType" IS NULL OR ("category"='ACCOMMODATION' AND "accommodationType" IN ('STANDARD_TENT','AC_TENT','BUNGALOW'))) AND
  ("occupancy" IS NULL OR ("category"='ACCOMMODATION' AND "occupancy" BETWEEN 1 AND 9999)) AND
  ("serviceMode" IS NULL OR ("category" IN ('TOUR_BOAT','LONGTAIL_BOAT') AND "serviceMode" IN ('JOIN','CHARTER'))) AND
  "verificationStatus" IN ('UNVERIFIED','VERIFIED')
 );
ALTER TABLE app_private."FleetVehicle"
 ADD COLUMN "engineCount" INTEGER,
 ADD COLUMN "totalCapacity" INTEGER,
 ADD COLUMN "expectedCrew" INTEGER,
 ADD COLUMN "purposes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 ADD COLUMN "hireCost" DECIMAL(10,2),
 ADD COLUMN "commissionType" VARCHAR(30),
 ADD COLUMN "commissionValue" DECIMAL(10,2),
 ADD CONSTRAINT "fleet_details_domain" CHECK (
  ("engineCount" IS NULL OR ("kind"='SPEEDBOAT' AND "engineCount" IN (2,3,4))) AND
  ("expectedCrew" IS NULL OR "expectedCrew" BETWEEN 0 AND 9999) AND
  ("totalCapacity" IS NULL OR ("totalCapacity" BETWEEN 1 AND 9999 AND "totalCapacity">="capacity"+COALESCE("expectedCrew",0))) AND
  "purposes" <@ ARRAY['PASSENGER_TRANSFER','PURCHASING','CARGO']::TEXT[] AND
  ("hireCost" IS NULL OR ("ownership"='PARTNER' AND "hireCost">=0)) AND
  (("commissionType" IS NULL AND "commissionValue" IS NULL) OR
   ("ownership"='PARTNER' AND "commissionType" IS NOT NULL AND "commissionValue" IS NOT NULL AND "commissionValue">=0 AND
    ("commissionType"='FIXED' OR ("commissionType"='PERCENT' AND "commissionValue"<=100))))
 );
COMMIT;
