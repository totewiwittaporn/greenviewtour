BEGIN;
CREATE TABLE app_private."OperationDailySnapshot" (
 "id" UUID PRIMARY KEY,
 "serviceDate" DATE NOT NULL,
 "kind" VARCHAR(20) NOT NULL CHECK ("kind" IN ('CLOSE','SUMMARY')),
 "revision" INTEGER NOT NULL CHECK ("revision" > 0),
 "contentHash" CHAR(64) NOT NULL,
 "runs" JSONB NOT NULL,
 "actorId" UUID NOT NULL,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE ("serviceDate","kind","revision")
);
CREATE TABLE app_private."OperationNotificationOutbox" (
 "id" UUID PRIMARY KEY,
 "snapshotId" UUID NOT NULL UNIQUE REFERENCES app_private."OperationDailySnapshot"("id") ON DELETE RESTRICT,
 "serviceDate" DATE NOT NULL,
 "revision" INTEGER NOT NULL CHECK ("revision" > 0),
 "status" VARCHAR(20) NOT NULL DEFAULT 'PREPARED' CHECK ("status" IN ('PREPARED','SENDING','SUPERSEDED','SENT','FAILED','EXPIRED')),
 "retryKey" UUID NOT NULL UNIQUE,
 "payload" JSONB NOT NULL,
 "attempts" INTEGER NOT NULL DEFAULT 0 CHECK ("attempts" >= 0),
 "firstAttemptAt" TIMESTAMPTZ(6),
 "lastAttemptAt" TIMESTAMPTZ(6),
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE app_private."OperationDailySnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private."OperationNotificationOutbox" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."OperationDailySnapshot", app_private."OperationNotificationOutbox" FROM PUBLIC, anon, authenticated;
COMMIT;
