-- Additive Local-tested migration. Apply in a transaction; restore backup to roll back.
PRAGMA defer_foreign_keys=ON;
CREATE TABLE "TourBooking_undated" (
    "assigneeId" TEXT,
    "commissionSnapshot" JSONB,
    "outboundDate" DATETIME,
    "returnDate" DATETIME,
    "returnStatus" TEXT NOT NULL DEFAULT 'OUR',
    "createdById" TEXT,
    "hotelId" TEXT,
    "channelId" TEXT,
    "allergyStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "specialRequirements" JSONB NOT NULL DEFAULT [],
    "agentId" TEXT,
    "agentName" TEXT,
    "agentPhone" TEXT,
    "agentReference" TEXT,
    "contactPhone" TEXT,
    "hotel" TEXT,
    "room" TEXT,
    "pickupPoint" TEXT,
    "dropoffPoint" TEXT,
    "allergies" TEXT,
    "assistance" TEXT,
    "requestNotes" TEXT,
    "paymentTerms" TEXT NOT NULL DEFAULT 'UNSET',
    "afterServiceReason" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tripId" TEXT,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "adultPrice" DECIMAL,
    "childPrice" DECIMAL,
    "programSnapshot" JSONB NOT NULL,
    "requestHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TourBooking_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "BusinessPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TourBooking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "OperationTrip" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
,
    CONSTRAINT "TourBooking_date_state" CHECK ("tripId" IS NOT NULL OR ("status" IN ('DRAFT','CANCELLED') AND "outboundDate" IS NULL AND "returnDate" IS NULL))
);
INSERT INTO "TourBooking_undated" ("assigneeId","commissionSnapshot","outboundDate","returnDate","returnStatus","createdById","hotelId","channelId","allergyStatus","specialRequirements","agentId","agentName","agentPhone","agentReference","contactPhone","hotel","room","pickupPoint","dropoffPoint","allergies","assistance","requestNotes","paymentTerms","afterServiceReason","id","version","code","name","tripId","adults","children","status","adultPrice","childPrice","programSnapshot","requestHash","createdAt","updatedAt") SELECT "assigneeId","commissionSnapshot","outboundDate","returnDate","returnStatus","createdById","hotelId","channelId","allergyStatus","specialRequirements","agentId","agentName","agentPhone","agentReference","contactPhone","hotel","room","pickupPoint","dropoffPoint","allergies","assistance","requestNotes","paymentTerms","afterServiceReason","id","version","code","name","tripId","adults","children","status","adultPrice","childPrice","programSnapshot","requestHash","createdAt","updatedAt" FROM "TourBooking";
DROP TABLE "TourBooking";
ALTER TABLE "TourBooking_undated" RENAME TO "TourBooking";
CREATE UNIQUE INDEX "TourBooking_code_key" ON "TourBooking"("code");
CREATE INDEX "TourBooking_assigneeId_idx" ON "TourBooking"("assigneeId");
CREATE INDEX "TourBooking_outboundDate_status_idx" ON "TourBooking"("outboundDate", "status");
CREATE INDEX "TourBooking_returnDate_status_idx" ON "TourBooking"("returnDate", "status");
CREATE INDEX "TourBooking_agentId_idx" ON "TourBooking"("agentId");
CREATE INDEX "TourBooking_tripId_status_idx" ON "TourBooking"("tripId", "status");
CREATE TRIGGER "TourBooking_specialRequirements_insert"
AFTER INSERT ON "TourBooking"
BEGIN
  INSERT OR IGNORE INTO "D1TourBookingSpecialRequirement" ("ownerId","value")
  SELECT NEW."id", CAST(value AS TEXT) FROM json_each(NEW."specialRequirements");
END;
CREATE TRIGGER "TourBooking_specialRequirements_update"
AFTER UPDATE OF "specialRequirements" ON "TourBooking"
BEGIN
  DELETE FROM "D1TourBookingSpecialRequirement" WHERE "ownerId"=OLD."id";
  INSERT OR IGNORE INTO "D1TourBookingSpecialRequirement" ("ownerId","value")
  SELECT NEW."id", CAST(value AS TEXT) FROM json_each(NEW."specialRequirements");
END;
CREATE TRIGGER "TourBooking_specialRequirements_delete"
AFTER DELETE ON "TourBooking"
BEGIN
  DELETE FROM "D1TourBookingSpecialRequirement" WHERE "ownerId"=OLD."id";
END;
CREATE TRIGGER "D1Revision_TourBooking_insert" AFTER INSERT ON "TourBooking" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_TourBooking_update" AFTER UPDATE ON "TourBooking" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_TourBooking_delete" AFTER DELETE ON "TourBooking" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
PRAGMA defer_foreign_keys=OFF;
