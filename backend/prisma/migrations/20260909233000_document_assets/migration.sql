CREATE TABLE app_private."DocumentAsset" (
 "key" VARCHAR(80) PRIMARY KEY,
 "mimeType" VARCHAR(40) NOT NULL CHECK ("mimeType" = 'image/png'),
 "content" BYTEA NOT NULL CHECK (octet_length("content") <= 262144),
 "sha256" CHAR(64) NOT NULL,
 "sourceUrl" VARCHAR(2048) NOT NULL,
 "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE app_private."DocumentAsset" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."DocumentAsset" FROM PUBLIC, anon, authenticated;
