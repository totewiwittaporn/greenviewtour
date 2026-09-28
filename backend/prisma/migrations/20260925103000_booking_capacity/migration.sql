-- Additive only: no business rows, grants, fleet assumptions or reservation backfill.
CREATE TABLE "app_private"."CapacityPool" (
 "id" UUID PRIMARY KEY, "version" INTEGER NOT NULL DEFAULT 1,
 "code" VARCHAR(40) NOT NULL UNIQUE, "name" VARCHAR(200) NOT NULL,
 "kind" VARCHAR(20) NOT NULL CHECK ("kind" IN ('BOAT','VEHICLE')),
 "serviceDate" DATE NOT NULL, "direction" VARCHAR(20) NOT NULL CHECK ("direction" IN ('OUTBOUND','RETURN')),
 "startsAt" TIMESTAMPTZ(6) NOT NULL, "endsAt" TIMESTAMPTZ(6) NOT NULL,
 "resourceIds" UUID[] NOT NULL, "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE','INACTIVE')),
 "holdMinutes" INTEGER NOT NULL CHECK ("holdMinutes" BETWEEN 1 AND 1440),
 "overnightLoadTenths" INTEGER NOT NULL DEFAULT 12 CHECK ("overnightLoadTenths" BETWEEN 10 AND 100),
 "notes" VARCHAR(1000), "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ(6) NOT NULL,
 CHECK ("endsAt" > "startsAt"), CHECK (cardinality("resourceIds") BETWEEN 1 AND 100)
);
CREATE INDEX "CapacityPool_serviceDate_direction_status_idx" ON "app_private"."CapacityPool"("serviceDate","direction","status");
CREATE INDEX "CapacityPool_resourceIds_idx" ON "app_private"."CapacityPool" USING GIN ("resourceIds");
CREATE TABLE "app_private"."CapacityOffer" (
 "id" UUID PRIMARY KEY, "poolId" UUID NOT NULL REFERENCES "app_private"."CapacityPool"("id") ON DELETE RESTRICT,
 "vehicleId" UUID NOT NULL REFERENCES "app_private"."FleetVehicle"("id") ON DELETE RESTRICT,
 "capacity" INTEGER NOT NULL CHECK ("capacity" > 0), "status" VARCHAR(20) NOT NULL CHECK ("status" IN ('READY','PROPOSED','UNAVAILABLE')),
 UNIQUE ("poolId","vehicleId")
);
CREATE INDEX "CapacityOffer_vehicleId_idx" ON "app_private"."CapacityOffer"("vehicleId");
CREATE TABLE "app_private"."CapacityHold" (
 "id" UUID PRIMARY KEY, "poolId" UUID NOT NULL REFERENCES "app_private"."CapacityPool"("id") ON DELETE RESTRICT,
 "requestId" UUID NOT NULL REFERENCES "app_private"."CustomerRequest"("id") ON DELETE RESTRICT,
 "passengers" INTEGER NOT NULL CHECK ("passengers" > 0), "exclusive" BOOLEAN NOT NULL DEFAULT false,
 "expiresAt" TIMESTAMPTZ(6) NOT NULL, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(), UNIQUE ("poolId","requestId")
);
CREATE INDEX "CapacityHold_poolId_expiresAt_idx" ON "app_private"."CapacityHold"("poolId","expiresAt");
CREATE INDEX "CapacityHold_requestId_idx" ON "app_private"."CapacityHold"("requestId");
ALTER TABLE "app_private"."CapacityPool" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_private"."CapacityOffer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_private"."CapacityHold" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "app_private"."CapacityPool", "app_private"."CapacityOffer", "app_private"."CapacityHold" FROM anon, authenticated;
