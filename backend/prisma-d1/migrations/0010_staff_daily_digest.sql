-- Additive Local outbox. Does not schedule work or send any message.
CREATE TABLE "StaffDailyDigest" (
 "id" TEXT NOT NULL PRIMARY KEY, "retryKey" TEXT NOT NULL, "sourceId" TEXT REFERENCES "StaffDailyDigest"("id") ON DELETE RESTRICT,
 "userId" TEXT NOT NULL REFERENCES "UserProfile"("id") ON DELETE RESTRICT,
 "serviceDate" DATETIME NOT NULL, "channelKey" TEXT NOT NULL, "mode" TEXT NOT NULL,
 "revision" INTEGER NOT NULL, "contentHash" TEXT NOT NULL, "bindingVersion" INTEGER NOT NULL,
 "payload" JSONB NOT NULL, "status" TEXT NOT NULL, "attempts" INTEGER NOT NULL DEFAULT 0,
 "firstAttemptAt" DATETIME, "lastAttemptAt" DATETIME,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
 CHECK("mode" IN ('simulation','live')),
 CHECK("status" IN ('PREPARED','SENDING','SIMULATED','ACCEPTED','FAILED','SUPERSEDED','EXPIRED','BLOCKED')),
 CHECK("attempts">=0 AND "attempts"<=5)
);
CREATE UNIQUE INDEX "StaffDailyDigest_retryKey_key" ON "StaffDailyDigest"("retryKey");
CREATE UNIQUE INDEX "StaffDailyDigest_serviceDate_userId_mode_channelKey_revision_key" ON "StaffDailyDigest"("serviceDate","userId","mode","channelKey","revision");
CREATE INDEX "StaffDailyDigest_serviceDate_status_idx" ON "StaffDailyDigest"("serviceDate","status");
CREATE TRIGGER "D1Revision_StaffDailyDigest_insert" AFTER INSERT ON "StaffDailyDigest" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_StaffDailyDigest_update" AFTER UPDATE ON "StaffDailyDigest" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_StaffDailyDigest_delete" AFTER DELETE ON "StaffDailyDigest" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
