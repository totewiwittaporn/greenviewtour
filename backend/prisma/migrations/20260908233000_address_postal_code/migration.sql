BEGIN;
ALTER TABLE app_private."CompanySettings" ADD COLUMN "postalCode" VARCHAR(5);
ALTER TABLE app_private."BusinessPartner" ADD COLUMN "postalCode" VARCHAR(5);
ALTER TABLE app_private."PickupLocation" ADD COLUMN "postalCode" VARCHAR(5);
ALTER TABLE app_private."UserProfile" ADD COLUMN "postalCode" VARCHAR(5);
COMMIT;
