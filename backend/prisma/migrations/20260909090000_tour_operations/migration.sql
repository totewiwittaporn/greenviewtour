BEGIN;
SET LOCAL search_path TO app_private;
-- CreateTable
CREATE TABLE "OperationResource" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "kind" VARCHAR(30) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "baseUnit" VARCHAR(30) NOT NULL,
    "packSize" INTEGER,
    "caseSize" INTEGER,
    "size" VARCHAR(100),
    "providerId" UUID,
    "origin" VARCHAR(200),
    "destination" VARCHAR(200),
    "salePrice" DECIMAL(10,2),
    "costPrice" DECIMAL(10,2),
    "notes" VARCHAR(2000),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "OperationResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLocation" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "kind" VARCHAR(30) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "notes" VARCHAR(2000),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StockLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramComponent" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tourId" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "selection" VARCHAR(30) NOT NULL,
    "basis" VARCHAR(30) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "usagePoint" VARCHAR(30) NOT NULL,
    "day" INTEGER NOT NULL DEFAULT 1,
    "notes" VARCHAR(1000),
    "status" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ProgramComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceSlot" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "resourceId" UUID NOT NULL,
    "vehicleId" UUID,
    "startsAt" TIMESTAMPTZ(6) NOT NULL,
    "endsAt" TIMESTAMPTZ(6) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ServiceSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationTrip" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "tourId" UUID,
    "startsAt" TIMESTAMPTZ(6) NOT NULL,
    "endsAt" TIMESTAMPTZ(6) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    "notes" VARCHAR(2000),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "OperationTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourBooking" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "tripId" UUID NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "adultPrice" DECIMAL(10,2),
    "childPrice" DECIMAL(10,2),
    "programSnapshot" JSONB NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TourBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingComponent" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "slotId" UUID,
    "sourceId" UUID,
    "quantity" INTEGER NOT NULL,
    "issuedQty" INTEGER NOT NULL DEFAULT 0,
    "selected" BOOLEAN NOT NULL,
    "included" BOOLEAN NOT NULL,
    "usagePoint" VARCHAR(30) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "unitPrice" DECIMAL(10,2),

    CONSTRAINT "BookingComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLot" (
    "id" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "receivedOn" DATE NOT NULL,
    "expiresOn" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockBalance" (
    "id" UUID NOT NULL,
    "lotId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "condition" VARCHAR(30) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "StockBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockIssue" (
    "id" UUID NOT NULL,
    "lotId" UUID NOT NULL,
    "bookingLineId" UUID,
    "sourceId" UUID NOT NULL,
    "destinationId" UUID NOT NULL,
    "custodian" VARCHAR(200) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "settledQty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" UUID NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "kind" VARCHAR(30) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "enteredQuantity" INTEGER NOT NULL,
    "enteredUnit" VARCHAR(30) NOT NULL,
    "factor" INTEGER NOT NULL,
    "details" JSONB NOT NULL,
    "actorId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationCommand" (
    "id" UUID NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationResource_code_key" ON "OperationResource"("code");

-- CreateIndex
CREATE INDEX "OperationResource_kind_status_idx" ON "OperationResource"("kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StockLocation_code_key" ON "StockLocation"("code");

-- CreateIndex
CREATE INDEX "ProgramComponent_tourId_status_idx" ON "ProgramComponent"("tourId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceSlot_code_key" ON "ServiceSlot"("code");

-- CreateIndex
CREATE INDEX "ServiceSlot_resourceId_startsAt_endsAt_idx" ON "ServiceSlot"("resourceId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "ServiceSlot_vehicleId_startsAt_endsAt_idx" ON "ServiceSlot"("vehicleId", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "OperationTrip_code_key" ON "OperationTrip"("code");

-- CreateIndex
CREATE INDEX "OperationTrip_startsAt_endsAt_idx" ON "OperationTrip"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "TourBooking_code_key" ON "TourBooking"("code");

-- CreateIndex
CREATE INDEX "TourBooking_tripId_status_idx" ON "TourBooking"("tripId", "status");

-- CreateIndex
CREATE INDEX "BookingComponent_resourceId_sourceId_idx" ON "BookingComponent"("resourceId", "sourceId");

-- CreateIndex
CREATE INDEX "BookingComponent_slotId_idx" ON "BookingComponent"("slotId");

-- CreateIndex
CREATE INDEX "BookingComponent_bookingId_idx" ON "BookingComponent"("bookingId");

-- CreateIndex
CREATE INDEX "StockLot_resourceId_expiresOn_idx" ON "StockLot"("resourceId", "expiresOn");

-- CreateIndex
CREATE INDEX "StockBalance_locationId_condition_idx" ON "StockBalance"("locationId", "condition");

-- CreateIndex
CREATE UNIQUE INDEX "StockBalance_lotId_locationId_condition_key" ON "StockBalance"("lotId", "locationId", "condition");

-- CreateIndex
CREATE INDEX "StockIssue_bookingLineId_idx" ON "StockIssue"("bookingLineId");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- AddForeignKey
ALTER TABLE "OperationResource" ADD CONSTRAINT "OperationResource_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "BusinessPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramComponent" ADD CONSTRAINT "ProgramComponent_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramComponent" ADD CONSTRAINT "ProgramComponent_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "OperationResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSlot" ADD CONSTRAINT "ServiceSlot_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "OperationResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSlot" ADD CONSTRAINT "ServiceSlot_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "FleetVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationTrip" ADD CONSTRAINT "OperationTrip_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourBooking" ADD CONSTRAINT "TourBooking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "OperationTrip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingComponent" ADD CONSTRAINT "BookingComponent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "TourBooking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingComponent" ADD CONSTRAINT "BookingComponent_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "OperationResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingComponent" ADD CONSTRAINT "BookingComponent_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ServiceSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingComponent" ADD CONSTRAINT "BookingComponent_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "StockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLot" ADD CONSTRAINT "StockLot_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "OperationResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "StockLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIssue" ADD CONSTRAINT "StockIssue_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "StockLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIssue" ADD CONSTRAINT "StockIssue_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "StockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIssue" ADD CONSTRAINT "StockIssue_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "StockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIssue" ADD CONSTRAINT "StockIssue_bookingLineId_fkey" FOREIGN KEY ("bookingLineId") REFERENCES "BookingComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Invariants remain enforced even when a maintenance script bypasses application validation.
ALTER TABLE "OperationResource" ADD CONSTRAINT "resource_domain" CHECK (
 "kind" IN ('SERVICE','EQUIPMENT','CONSUMABLE') AND "status" IN ('ACTIVE','INACTIVE')
 AND ("packSize" IS NULL OR "packSize">0) AND ("caseSize" IS NULL OR "caseSize">0)
 AND ("salePrice" IS NULL OR "salePrice">=0) AND ("costPrice" IS NULL OR "costPrice">=0));
ALTER TABLE "StockLocation" ADD CONSTRAINT "stock_location_domain" CHECK ("status" IN ('ACTIVE','INACTIVE'));
ALTER TABLE "ProgramComponent" ADD CONSTRAINT "component_domain" CHECK ("quantity">0 AND "day">0 AND "selection" IN ('INCLUDED','REQUIRED','OPTIONAL','EXCLUDED') AND "basis" IN ('PER_PERSON','PER_BOOKING','PER_PERSON_NIGHT') AND "status" IN ('ACTIVE','INACTIVE'));
ALTER TABLE "ServiceSlot" ADD CONSTRAINT "slot_domain" CHECK ("endsAt">"startsAt" AND "capacity">0 AND "status" IN ('ACTIVE','INACTIVE'));
ALTER TABLE "OperationTrip" ADD CONSTRAINT "trip_domain" CHECK ("endsAt">"startsAt" AND "capacity">0 AND "status" IN ('OPEN','CLOSED','CANCELLED'));
ALTER TABLE "TourBooking" ADD CONSTRAINT "booking_domain" CHECK ("adults">=0 AND "children">=0 AND "adults"+"children">0 AND "status" IN ('DRAFT','CONFIRMED','COMPLETED','CANCELLED') AND ("adultPrice" IS NULL OR "adultPrice">=0) AND ("childPrice" IS NULL OR "childPrice">=0));
ALTER TABLE "BookingComponent" ADD CONSTRAINT "booking_component_domain" CHECK ("quantity">=0 AND (NOT "selected" OR "quantity">0) AND "issuedQty">=0 AND "issuedQty"<="quantity" AND ("unitPrice" IS NULL OR "unitPrice">=0));
ALTER TABLE "StockBalance" ADD CONSTRAINT "nonnegative_stock" CHECK ("quantity">=0 AND "condition" IN ('READY','CLEANING','DAMAGED'));
ALTER TABLE "StockIssue" ADD CONSTRAINT "issue_domain" CHECK ("quantity">0 AND "settledQty">=0 AND "settledQty"<="quantity");
ALTER TABLE "StockLot" ADD CONSTRAINT "lot_dates" CHECK ("expiresOn" IS NULL OR "expiresOn">="receivedOn");
ALTER TABLE "StockMovement" ADD CONSTRAINT "movement_units" CHECK ("factor">0 AND "enteredQuantity">=0 AND "enteredUnit" IN ('BASE','PACK','CASE'));

-- Server-only tables: browser Supabase roles cannot read contacts, prices or operational inventory.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['OperationResource','StockLocation','ProgramComponent','ServiceSlot','OperationTrip','TourBooking','BookingComponent','StockLot','StockBalance','StockIssue','StockMovement','OperationCommand'] LOOP
  EXECUTE format('ALTER TABLE app_private.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON app_private.%I FROM PUBLIC, anon, authenticated',t);
 END LOOP;
END $$;
COMMIT;
