BEGIN;
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "app_private";
SET LOCAL search_path = app_private;

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "AccessScope" AS ENUM ('SELF', 'COMPANY');

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" UUID NOT NULL,
    "displayName" VARCHAR(100) NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Permission" (
    "code" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" UUID NOT NULL,
    "roleCode" VARCHAR(50) NOT NULL,
    "scope" "AccessScope" NOT NULL DEFAULT 'SELF',

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleCode","scope")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleCode" VARCHAR(50) NOT NULL,
    "permissionCode" VARCHAR(100) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleCode","permissionCode")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "displayName" VARCHAR(100) NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "consumedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationRole" (
    "invitationId" UUID NOT NULL,
    "roleCode" VARCHAR(50) NOT NULL,
    "scope" "AccessScope" NOT NULL DEFAULT 'SELF',

    CONSTRAINT "InvitationRole_pkey" PRIMARY KEY ("invitationId","roleCode","scope")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(100) NOT NULL,
    "targetId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB NOT NULL,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserRole_roleCode_idx" ON "UserRole"("roleCode");

-- CreateIndex
CREATE INDEX "RolePermission_permissionCode_idx" ON "RolePermission"("permissionCode");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_email_key" ON "Invitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "InvitationRole_roleCode_idx" ON "InvitationRole"("roleCode");

-- CreateIndex
CREATE INDEX "AuditEvent_targetId_createdAt_idx" ON "AuditEvent"("targetId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "Role"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "Role"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionCode_fkey" FOREIGN KEY ("permissionCode") REFERENCES "Permission"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationRole" ADD CONSTRAINT "InvitationRole_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationRole" ADD CONSTRAINT "InvitationRole_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "Role"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Auth owns credentials; application profiles reference identities without managing auth schema.
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_auth_user_fkey" FOREIGN KEY ("id") REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE "UserProfile" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "UserProfile" FROM PUBLIC, anon, authenticated;
ALTER TABLE "Role" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "Role" FROM PUBLIC, anon, authenticated;
ALTER TABLE "Permission" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "Permission" FROM PUBLIC, anon, authenticated;
ALTER TABLE "UserRole" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "UserRole" FROM PUBLIC, anon, authenticated;
ALTER TABLE "RolePermission" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "RolePermission" FROM PUBLIC, anon, authenticated;
ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "Invitation" FROM PUBLIC, anon, authenticated;
ALTER TABLE "InvitationRole" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "InvitationRole" FROM PUBLIC, anon, authenticated;
ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "AuditEvent" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
INSERT INTO "Role" (code,name) VALUES ('ADMIN_MANAGER','Admin Manager');
INSERT INTO "Role" (code,name) VALUES ('MANAGER','Manager');
INSERT INTO "Role" (code,name) VALUES ('BOOKING','Booking');
INSERT INTO "Role" (code,name) VALUES ('ACCOUNT','Account');
INSERT INTO "Role" (code,name) VALUES ('GUIDE','Guide');
INSERT INTO "Role" (code,name) VALUES ('ASSISTANT_TOUR_GUIDE','Assistant tour guide');
INSERT INTO "Role" (code,name) VALUES ('CAPTAIN','Captain');
INSERT INTO "Role" (code,name) VALUES ('ASSISTANT_CAPTAIN','Assistant Captain');
INSERT INTO "Role" (code,name) VALUES ('DRIVER','Driver');
INSERT INTO "Role" (code,name) VALUES ('HEAD_BOOKING','Head Booking');
INSERT INTO "Role" (code,name) VALUES ('HEAD_GUIDE','Head Guide');
INSERT INTO "Role" (code,name) VALUES ('HEAD_CAPTAIN','Head Captain');
INSERT INTO "Role" (code,name) VALUES ('HEAD_DRIVER','Head Driver');
INSERT INTO "Permission" (code,description) VALUES ('profile.read','Read own account');
INSERT INTO "Permission" (code,description) VALUES ('users.read','Read company user directory');
INSERT INTO "Permission" (code,description) VALUES ('users.invite','Invite ordinary staff');
INSERT INTO "Permission" (code,description) VALUES ('users.roles','Assign ordinary roles');
INSERT INTO "Permission" (code,description) VALUES ('users.suspend','Suspend ordinary staff');
INSERT INTO "Permission" (code,description) VALUES ('managers.manage','Manage Manager accounts');
INSERT INTO "Permission" (code,description) VALUES ('administrators.manage','Manage Admin Manager grants');
INSERT INTO "Permission" (code,description) VALUES ('audit.read','Read account audit events');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('ADMIN_MANAGER','profile.read');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('ADMIN_MANAGER','users.read');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('ADMIN_MANAGER','users.invite');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('ADMIN_MANAGER','users.roles');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('ADMIN_MANAGER','users.suspend');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('ADMIN_MANAGER','managers.manage');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('ADMIN_MANAGER','administrators.manage');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('ADMIN_MANAGER','audit.read');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('MANAGER','profile.read');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('MANAGER','users.read');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('MANAGER','users.invite');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('MANAGER','users.roles');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('MANAGER','users.suspend');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('MANAGER','audit.read');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('BOOKING','profile.read');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('ACCOUNT','profile.read');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('GUIDE','profile.read');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('ASSISTANT_TOUR_GUIDE','profile.read');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('CAPTAIN','profile.read');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('ASSISTANT_CAPTAIN','profile.read');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('DRIVER','profile.read');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('HEAD_BOOKING','profile.read');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('HEAD_GUIDE','profile.read');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('HEAD_CAPTAIN','profile.read');
INSERT INTO "RolePermission" ("roleCode","permissionCode") VALUES ('HEAD_DRIVER','profile.read');
COMMIT;
