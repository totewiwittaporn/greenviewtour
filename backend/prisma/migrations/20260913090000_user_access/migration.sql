BEGIN;
ALTER TABLE app_private."UserProfile" ADD COLUMN "accessVersion" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE app_private."UserPermissionOverride" (
 "id" UUID PRIMARY KEY, "userId" UUID NOT NULL REFERENCES app_private."UserProfile"(id) ON DELETE CASCADE,
 "permissionCode" VARCHAR(100) NOT NULL, "effect" VARCHAR(10) NOT NULL CHECK (effect IN ('ALLOW','DENY')),
 "scopeId" UUID, "startsAt" TIMESTAMPTZ(6), "expiresAt" TIMESTAMPTZ(6),
 CHECK ("expiresAt" IS NULL OR "startsAt" IS NULL OR "expiresAt">"startsAt")
);
CREATE INDEX "UserPermissionOverride_userId_idx" ON app_private."UserPermissionOverride"("userId");
ALTER TABLE app_private."UserPermissionOverride" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."UserPermissionOverride" FROM anon, authenticated;
INSERT INTO app_private."Role"(code,name) VALUES ('SALES','Sales'),('HOUSEKEEPING','Housekeeping'),('HEAD_HOUSEKEEPING','Head Housekeeping');
INSERT INTO app_private."RolePermission"("roleCode","permissionCode") VALUES ('SALES','profile.read'),('HOUSEKEEPING','profile.read'),('HEAD_HOUSEKEEPING','profile.read'),('HEAD_HOUSEKEEPING','users.read'),('HEAD_HOUSEKEEPING','users.profile.edit');
ALTER TABLE app_private."UserProfile" DROP CONSTRAINT "UserProfile_department_check";
ALTER TABLE app_private."UserProfile" ADD CONSTRAINT "UserProfile_department_check" CHECK (department IS NULL OR department IN ('MANAGEMENT','BOOKING','ACCOUNT','GUIDE','CAPTAIN','DRIVER','SALES','HOUSEKEEPING'));
ALTER TABLE app_private."Invitation" DROP CONSTRAINT "Invitation_department_check";
ALTER TABLE app_private."Invitation" ADD CONSTRAINT "Invitation_department_check" CHECK (department IS NULL OR department IN ('MANAGEMENT','BOOKING','ACCOUNT','GUIDE','CAPTAIN','DRIVER','SALES','HOUSEKEEPING'));
COMMIT;
