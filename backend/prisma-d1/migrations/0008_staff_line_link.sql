CREATE TABLE "StaffLineBinding" (
 "id" TEXT NOT NULL PRIMARY KEY, "channelKey" TEXT NOT NULL,
 "userId" TEXT NOT NULL REFERENCES "UserProfile"("id") ON DELETE CASCADE,
 "lineUserId" TEXT, "displayName" TEXT, "status" TEXT NOT NULL,
 "version" INTEGER NOT NULL DEFAULT 1, "linkedAt" DATETIME, "unlinkedAt" DATETIME,
 "sourceEventAt" DATETIME, "updatedAt" DATETIME NOT NULL,
 CHECK("status" IN ('LINKED','UNLINKED','BLOCKED','SUSPENDED'))
);
CREATE UNIQUE INDEX "StaffLineBinding_channelKey_userId_key" ON "StaffLineBinding"("channelKey","userId");
CREATE UNIQUE INDEX "StaffLineBinding_channelKey_lineUserId_key" ON "StaffLineBinding"("channelKey","lineUserId");
CREATE TABLE "StaffLineRequest" (
 "id" TEXT NOT NULL PRIMARY KEY, "channelKey" TEXT NOT NULL, "sourceEventId" TEXT NOT NULL,
 "lineUserId" TEXT NOT NULL, "displayName" TEXT, "tokenHash" TEXT NOT NULL, "sealedTicket" TEXT,
 "userId" TEXT REFERENCES "UserProfile"("id") ON DELETE CASCADE,
 "webSessionId" TEXT, "nonceHash" TEXT, "status" TEXT NOT NULL,
 "expiresAt" DATETIME NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" DATETIME NOT NULL,
 CHECK("status" IN ('ISSUED','PENDING','LINKED','FAILED','CANCELLED','EXPIRED','CONFLICT'))
);
CREATE UNIQUE INDEX "StaffLineRequest_nonceHash_key" ON "StaffLineRequest"("nonceHash");
CREATE UNIQUE INDEX "StaffLineRequest_channelKey_sourceEventId_key" ON "StaffLineRequest"("channelKey","sourceEventId");
CREATE INDEX "StaffLineRequest_channelKey_userId_status_idx" ON "StaffLineRequest"("channelKey","userId","status");
CREATE INDEX "StaffLineRequest_expiresAt_idx" ON "StaffLineRequest"("expiresAt");
CREATE TABLE "StaffLineEvent" (
 "id" TEXT NOT NULL PRIMARY KEY, "channelKey" TEXT NOT NULL, "payloadHash" TEXT NOT NULL,
 "status" TEXT NOT NULL, "outcome" TEXT, "updatedAt" DATETIME NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK("status" IN ('PROCESSING','DONE','RETRY'))
);

CREATE TRIGGER "D1Revision_StaffLineBinding_insert" AFTER INSERT ON "StaffLineBinding" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_StaffLineBinding_update" AFTER UPDATE ON "StaffLineBinding" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_StaffLineBinding_delete" AFTER DELETE ON "StaffLineBinding" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_StaffLineRequest_insert" AFTER INSERT ON "StaffLineRequest" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_StaffLineRequest_update" AFTER UPDATE ON "StaffLineRequest" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_StaffLineRequest_delete" AFTER DELETE ON "StaffLineRequest" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_StaffLineEvent_insert" AFTER INSERT ON "StaffLineEvent" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_StaffLineEvent_update" AFTER UPDATE ON "StaffLineEvent" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_StaffLineEvent_delete" AFTER DELETE ON "StaffLineEvent" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "StaffLine_suspend_profile" AFTER UPDATE OF "status" ON "UserProfile" WHEN NEW."status"<>'ACTIVE' BEGIN
 UPDATE "StaffLineBinding" SET "status"='SUSPENDED', "version"="version"+1 WHERE "userId"=NEW."id" AND "status"<>'UNLINKED';
 UPDATE "StaffLineRequest" SET "status"='CANCELLED', "sealedTicket"=NULL WHERE "userId"=NEW."id" AND "status" IN ('ISSUED','PENDING');
END;
