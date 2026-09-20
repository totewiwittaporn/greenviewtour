CREATE TABLE "app_private"."EvidenceAttachment" (
 "id" UUID PRIMARY KEY, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "targetKind" VARCHAR(32) NOT NULL CHECK ("targetKind" IN ('BOOKING','PERSONNEL_FINANCE')),
 "targetId" UUID NOT NULL, "uploadedBy" UUID NOT NULL,
 "filename" VARCHAR(200) NOT NULL, "mimeType" VARCHAR(100) NOT NULL,
 "size" INTEGER NOT NULL CHECK ("size" > 0 AND "size" <= 5242880),
 "sha256" VARCHAR(64) NOT NULL, "content" BYTEA NOT NULL,
 "note" VARCHAR(1000) NOT NULL, "documentNumber" VARCHAR(100) NOT NULL,
 "category" VARCHAR(30) NOT NULL, "requestHash" VARCHAR(64) NOT NULL,
 CONSTRAINT "EvidenceAttachment_content_size_check" CHECK (octet_length("content") = "size")
);
CREATE INDEX "EvidenceAttachment_targetKind_targetId_createdAt_idx" ON "app_private"."EvidenceAttachment"("targetKind","targetId","createdAt");
ALTER TABLE "app_private"."EvidenceAttachment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "app_private"."EvidenceAttachment" FROM PUBLIC, anon, authenticated;
