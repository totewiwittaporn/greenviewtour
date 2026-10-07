-- Preserve source identity metadata: missing creation timestamps remain NULL.
-- This is a directory projection, not a credentials/session store.
CREATE TABLE "D1Identity_next" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "email" TEXT NOT NULL COLLATE NOCASE,
 "email_confirmed_at" DATETIME,
 "created_at" DATETIME,
 "last_sign_in_at" DATETIME,
 "provider" TEXT NOT NULL DEFAULT 'supabase-source'
);
INSERT INTO "D1Identity_next" ("id","email","email_confirmed_at","created_at","last_sign_in_at","provider")
SELECT "id","email","email_confirmed_at","created_at","last_sign_in_at","provider" FROM "D1Identity";
DROP TABLE "D1Identity";
ALTER TABLE "D1Identity_next" RENAME TO "D1Identity";
CREATE UNIQUE INDEX "D1Identity_email_key" ON "D1Identity"("email");
CREATE TRIGGER "D1Revision_D1Identity_insert" AFTER INSERT ON "D1Identity" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_D1Identity_update" AFTER UPDATE ON "D1Identity" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
CREATE TRIGGER "D1Revision_D1Identity_delete" AFTER DELETE ON "D1Identity" BEGIN UPDATE "D1TxnRevision" SET "version"="version"+1 WHERE "id"=1; END;
