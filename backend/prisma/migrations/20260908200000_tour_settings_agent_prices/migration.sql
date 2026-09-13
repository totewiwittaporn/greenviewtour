BEGIN;
SET LOCAL search_path = app_private;
CREATE TABLE "SalesChannel" (
 "id" UUID PRIMARY KEY,
 "version" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ NOT NULL,
 "code" VARCHAR(40) NOT NULL UNIQUE,
 "name" VARCHAR(200) NOT NULL,
 "status" VARCHAR(50) NOT NULL CHECK ("status" IN ('ACTIVE','INACTIVE')),
 "kind" VARCHAR(50) NOT NULL CHECK ("kind" IN ('DIRECT','AGENT'))
);
ALTER TABLE "SalesChannel" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "SalesChannel" FROM PUBLIC, anon, authenticated;
CREATE INDEX "SalesChannel_status_idx" ON "SalesChannel" ("status");
CREATE TABLE "CompanySettings" (
 "id" UUID PRIMARY KEY,
 "version" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ NOT NULL,
 "name" VARCHAR(200) NOT NULL,
 "legalName" VARCHAR(200),
 "taxId" VARCHAR(30),
 "address" VARCHAR(1000),
 "phone" VARCHAR(32),
 "email" VARCHAR(254)
);
ALTER TABLE "CompanySettings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "CompanySettings" FROM PUBLIC, anon, authenticated;
CREATE TABLE "BusinessPartner" (
 "id" UUID PRIMARY KEY,
 "version" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ NOT NULL,
 "code" VARCHAR(40) NOT NULL UNIQUE,
 "name" VARCHAR(200) NOT NULL,
 "status" VARCHAR(50) NOT NULL CHECK ("status" IN ('ACTIVE','INACTIVE')),
 "roles" TEXT[] NOT NULL,
 "contactName" VARCHAR(200),
 "phone" VARCHAR(32),
 "email" VARCHAR(254),
 "address" VARCHAR(1000),
 "association" VARCHAR(200),
 "paymentTerms" VARCHAR(1000),
 CHECK (cardinality("roles") > 0 AND "roles" <@ ARRAY['TOUR_OPERATOR','SALES_AGENT','TRANSPORT_PROVIDER']::TEXT[])
);
ALTER TABLE "BusinessPartner" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "BusinessPartner" FROM PUBLIC, anon, authenticated;
CREATE INDEX "BusinessPartner_status_idx" ON "BusinessPartner" ("status");
CREATE TABLE "TourProgram" (
 "id" UUID PRIMARY KEY,
 "version" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ NOT NULL,
 "code" VARCHAR(40) NOT NULL UNIQUE,
 "name" VARCHAR(200) NOT NULL,
 "status" VARCHAR(50) NOT NULL CHECK ("status" IN ('ACTIVE','INACTIVE')),
 "ownership" VARCHAR(50) NOT NULL CHECK ("ownership" IN ('GREENVIEW','PARTNER')),
 "operatorId" UUID,
 "route" VARCHAR(2000),
 "departureTimes" VARCHAR(300),
 "childPolicy" VARCHAR(1000),
 "confirmationMode" VARCHAR(50) NOT NULL CHECK ("confirmationMode" IN ('REQUEST','INSTANT')),
 "cancellationTerms" VARCHAR(2000),
 "bookingCutoff" VARCHAR(300),
 "adultPrice" NUMERIC(10,2) CHECK ("adultPrice" >= 0),
 "childPrice" NUMERIC(10,2) CHECK ("childPrice" >= 0),
 "supplierPricing" VARCHAR(50) NOT NULL CHECK ("supplierPricing" IN ('NOT_SET','NET','COMMISSION')),
 "supplierAdultNet" NUMERIC(10,2) CHECK ("supplierAdultNet" >= 0),
 "supplierChildNet" NUMERIC(10,2) CHECK ("supplierChildNet" >= 0),
 "supplierAdultCommission" NUMERIC(10,2) CHECK ("supplierAdultCommission" >= 0),
 "supplierChildCommission" NUMERIC(10,2) CHECK ("supplierChildCommission" >= 0),
 CHECK (("ownership" = 'GREENVIEW' AND "operatorId" IS NULL) OR ("ownership" = 'PARTNER' AND "operatorId" IS NOT NULL))
);
ALTER TABLE "TourProgram" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "TourProgram" FROM PUBLIC, anon, authenticated;
CREATE INDEX "TourProgram_status_idx" ON "TourProgram" ("status");
CREATE TABLE "AgentTourPrice" (
 "id" UUID PRIMARY KEY,
 "version" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ NOT NULL,
 "agentId" UUID NOT NULL,
 "tourId" UUID NOT NULL,
 "adultPrice" NUMERIC(10,2) CHECK ("adultPrice" >= 0),
 "childPrice" NUMERIC(10,2) CHECK ("childPrice" >= 0),
 "status" VARCHAR(50) NOT NULL CHECK ("status" IN ('ACTIVE','INACTIVE')),
 UNIQUE ("agentId", "tourId"),
 CHECK ("adultPrice" IS NOT NULL OR "childPrice" IS NOT NULL)
);
ALTER TABLE "AgentTourPrice" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "AgentTourPrice" FROM PUBLIC, anon, authenticated;
CREATE INDEX "AgentTourPrice_status_idx" ON "AgentTourPrice" ("status");
CREATE TABLE "PickupLocation" (
 "id" UUID PRIMARY KEY,
 "version" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ NOT NULL,
 "code" VARCHAR(40) NOT NULL UNIQUE,
 "name" VARCHAR(200) NOT NULL,
 "status" VARCHAR(50) NOT NULL CHECK ("status" IN ('ACTIVE','INACTIVE')),
 "kind" VARCHAR(50) NOT NULL CHECK ("kind" IN ('HOTEL','PICKUP_POINT','PIER','AIRPORT')),
 "zone" VARCHAR(200),
 "address" VARCHAR(1000),
 "latitude" VARCHAR(30),
 "longitude" VARCHAR(30),
 "pickupNotes" VARCHAR(1000)
);
ALTER TABLE "PickupLocation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "PickupLocation" FROM PUBLIC, anon, authenticated;
CREATE INDEX "PickupLocation_status_idx" ON "PickupLocation" ("status");
CREATE TABLE "FleetVehicle" (
 "id" UUID PRIMARY KEY,
 "version" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ NOT NULL,
 "code" VARCHAR(40) NOT NULL UNIQUE,
 "name" VARCHAR(200) NOT NULL,
 "status" VARCHAR(50) NOT NULL CHECK ("status" IN ('ACTIVE','INACTIVE')),
 "kind" VARCHAR(50) NOT NULL CHECK ("kind" IN ('VAN','PICKUP_TRUCK','SPEEDBOAT','LONGTAIL_BOAT','CAR','BUS','OTHER')),
 "capacity" INTEGER NOT NULL CHECK ("capacity" BETWEEN 1 AND 9999),
 "ownership" VARCHAR(50) NOT NULL CHECK ("ownership" IN ('GREENVIEW','PARTNER')),
 "providerId" UUID,
 "registration" VARCHAR(100),
 "notes" VARCHAR(1000),
 CHECK (("ownership" = 'GREENVIEW' AND "providerId" IS NULL) OR ("ownership" = 'PARTNER' AND "providerId" IS NOT NULL))
);
ALTER TABLE "FleetVehicle" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "FleetVehicle" FROM PUBLIC, anon, authenticated;
CREATE INDEX "FleetVehicle_status_idx" ON "FleetVehicle" ("status");
ALTER TABLE "TourProgram" ADD CONSTRAINT "TourProgram_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "BusinessPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "TourProgram_operatorId_idx" ON "TourProgram" ("operatorId");
ALTER TABLE "AgentTourPrice" ADD CONSTRAINT "AgentTourPrice_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "BusinessPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgentTourPrice" ADD CONSTRAINT "AgentTourPrice_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "AgentTourPrice_tourId_idx" ON "AgentTourPrice" ("tourId");
ALTER TABLE "FleetVehicle" ADD CONSTRAINT "FleetVehicle_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "BusinessPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "FleetVehicle_providerId_idx" ON "FleetVehicle" ("providerId");
CREATE UNIQUE INDEX "CompanySettings_singleton" ON "CompanySettings" ((true));
COMMIT;
