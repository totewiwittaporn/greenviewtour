-- Local closeout: extend the existing single company record; preserve private details.
ALTER TABLE "CompanySettings" ADD COLUMN "lineId" TEXT;
ALTER TABLE "CompanySettings" ADD COLUMN "instagramUrl" TEXT;
-- Owner-approved public contact details, October 1 2026. Email is not registered yet.
UPDATE "CompanySettings"
SET "phone" = '+66954266847', "email" = NULL,
    "lineId" = '@greenviewtour', "instagramUrl" = 'https://www.instagram.com/greenviewtour/',
    "version" = "version" + 1, "updatedAt" = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
