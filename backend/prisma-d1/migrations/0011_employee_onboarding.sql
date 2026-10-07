-- Existing employees and credentials are unchanged. Pending invitations need a new email.
ALTER TABLE "UserProfile" ADD COLUMN "firstName" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "lastName" TEXT;
CREATE TABLE "EmployeeOnboarding" (
 "invitationId" TEXT NOT NULL PRIMARY KEY REFERENCES "Invitation"("id") ON DELETE CASCADE,
 "userId" TEXT REFERENCES "AuthUser"("id") ON DELETE RESTRICT,
 "emailVerifiedAt" DATETIME, "profileCompletedAt" DATETIME, "passwordSetAt" DATETIME,
 "completedAt" DATETIME, "emailSentAt" DATETIME,
 "firstName" TEXT, "lastName" TEXT, "address" TEXT, "primaryPhone" TEXT,
 "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "EmployeeOnboarding_userId_key" ON "EmployeeOnboarding"("userId");
CREATE TRIGGER "D1Revision_EmployeeOnboarding_insert" AFTER INSERT ON "EmployeeOnboarding" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_EmployeeOnboarding_update" AFTER UPDATE ON "EmployeeOnboarding" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_EmployeeOnboarding_delete" AFTER DELETE ON "EmployeeOnboarding" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
