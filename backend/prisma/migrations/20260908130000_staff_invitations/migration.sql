ALTER TABLE app_private."Invitation" ADD COLUMN "department" VARCHAR(30), ADD COLUMN "acceptedAt" TIMESTAMPTZ(6), ADD COLUMN "revokedAt" TIMESTAMPTZ(6);
ALTER TABLE app_private."Invitation" ADD CONSTRAINT "Invitation_department_check" CHECK (department IS NULL OR department IN ('MANAGEMENT','BOOKING','ACCOUNT','GUIDE','CAPTAIN','DRIVER'));
