-- CreateTable
CREATE TABLE "AuthUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sourceCreatedAt" DATETIME,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "bannedUntil" DATETIME
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuthAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuthVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WebSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "authSessionId" TEXT,
    "verificationId" TEXT,
    "purpose" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WebSession_authSessionId_fkey" FOREIGN KEY ("authSessionId") REFERENCES "AuthSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WebSession_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "AuthVerification" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LocalMail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthUser_email_key" ON "AuthUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_token_key" ON "AuthSession"("token");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AuthAccount_userId_idx" ON "AuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_providerId_accountId_key" ON "AuthAccount"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthVerification_identifier_key" ON "AuthVerification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "WebSession_verificationId_key" ON "WebSession"("verificationId");

-- CreateIndex
CREATE INDEX "WebSession_userId_idx" ON "WebSession"("userId");

-- CreateIndex
CREATE INDEX "WebSession_authSessionId_idx" ON "WebSession"("authSessionId");

-- CreateIndex
CREATE INDEX "LocalMail_createdAt_idx" ON "LocalMail"("createdAt");


-- Durable throttling does not change the business optimistic revision.
CREATE TABLE "AuthRate"("key" TEXT PRIMARY KEY NOT NULL,"window" INTEGER NOT NULL,"hits" INTEGER NOT NULL);
CREATE TRIGGER "AuthUser_directory_insert" AFTER INSERT ON "AuthUser" BEGIN
 INSERT INTO D1Identity(id,email,email_confirmed_at,created_at,last_sign_in_at,provider)
 VALUES(NEW.id,NEW.email,CASE WHEN NEW.emailVerified=1 THEN NEW.updatedAt ELSE NULL END,COALESCE(NEW.sourceCreatedAt,NEW.createdAt),NULL,'better-auth')
 ON CONFLICT(id) DO UPDATE SET email=excluded.email,email_confirmed_at=CASE WHEN NEW.emailVerified=1 THEN COALESCE(D1Identity.email_confirmed_at,excluded.email_confirmed_at) ELSE NULL END,provider='better-auth';
END;
CREATE TRIGGER "AuthUser_directory_update" AFTER UPDATE ON "AuthUser" BEGIN
 UPDATE D1Identity SET email=NEW.email,email_confirmed_at=CASE WHEN NEW.emailVerified=1 THEN COALESCE(email_confirmed_at,NEW.updatedAt) ELSE NULL END,provider='better-auth' WHERE id=NEW.id;
END;
CREATE TRIGGER "AuthUser_revoke_disabled" AFTER UPDATE OF disabled,bannedUntil ON "AuthUser" WHEN NEW.disabled=1 OR NEW.bannedUntil IS NOT NULL BEGIN
 DELETE FROM WebSession WHERE userId=NEW.id;
 DELETE FROM AuthSession WHERE userId=NEW.id;
END;
CREATE TRIGGER "Staff_revoke_inactive" AFTER UPDATE OF status ON "UserProfile" WHEN NEW.status<>'ACTIVE' BEGIN
 DELETE FROM WebSession WHERE userId=NEW.id;
 DELETE FROM AuthSession WHERE userId=NEW.id;
END;
CREATE TRIGGER "Customer_revoke_inactive" AFTER UPDATE OF status ON "CustomerProfile" WHEN NEW.status<>'ACTIVE' BEGIN
 DELETE FROM WebSession WHERE userId=NEW.authUserId;
 DELETE FROM AuthSession WHERE userId=NEW.authUserId;
END;
CREATE TRIGGER "D1Revision_AuthUser_insert" AFTER INSERT ON "AuthUser" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_AuthUser_update" AFTER UPDATE ON "AuthUser" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_AuthUser_delete" AFTER DELETE ON "AuthUser" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_AuthSession_insert" AFTER INSERT ON "AuthSession" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_AuthSession_update" AFTER UPDATE ON "AuthSession" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_AuthSession_delete" AFTER DELETE ON "AuthSession" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_AuthAccount_insert" AFTER INSERT ON "AuthAccount" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_AuthAccount_update" AFTER UPDATE ON "AuthAccount" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_AuthAccount_delete" AFTER DELETE ON "AuthAccount" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_AuthVerification_insert" AFTER INSERT ON "AuthVerification" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_AuthVerification_update" AFTER UPDATE ON "AuthVerification" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_AuthVerification_delete" AFTER DELETE ON "AuthVerification" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_WebSession_insert" AFTER INSERT ON "WebSession" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_WebSession_update" AFTER UPDATE ON "WebSession" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_WebSession_delete" AFTER DELETE ON "WebSession" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_LocalMail_insert" AFTER INSERT ON "LocalMail" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_LocalMail_update" AFTER UPDATE ON "LocalMail" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_LocalMail_delete" AFTER DELETE ON "LocalMail" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
