BEGIN;
ALTER TABLE app_private."UserProfile" ADD COLUMN "department" VARCHAR(30);
ALTER TABLE app_private."UserProfile" ADD CONSTRAINT "UserProfile_department_check" CHECK (department IS NULL OR department IN ('MANAGEMENT','BOOKING','ACCOUNT','GUIDE','CAPTAIN','DRIVER'));
INSERT INTO app_private."Permission" (code,description) VALUES ('users.profile.edit','Edit account profile within delegated department');
INSERT INTO app_private."RolePermission" ("roleCode","permissionCode") SELECT code,'users.profile.edit' FROM app_private."Role" WHERE code IN ('ADMIN_MANAGER','MANAGER','HEAD_BOOKING','HEAD_GUIDE','HEAD_CAPTAIN','HEAD_DRIVER');
INSERT INTO app_private."RolePermission" ("roleCode","permissionCode") SELECT code,'users.read' FROM app_private."Role" WHERE code IN ('HEAD_BOOKING','HEAD_GUIDE','HEAD_CAPTAIN','HEAD_DRIVER');
COMMIT;
