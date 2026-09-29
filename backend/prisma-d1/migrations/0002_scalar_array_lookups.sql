CREATE TRIGGER IF NOT EXISTS "BusinessPartner_allowedPaymentTerms_insert"
AFTER INSERT ON "BusinessPartner"
BEGIN
  INSERT OR IGNORE INTO "D1BusinessPartnerPaymentTerm" ("ownerId","value")
  SELECT NEW."id", CAST(value AS TEXT) FROM json_each(NEW."allowedPaymentTerms");
END;

CREATE TRIGGER IF NOT EXISTS "BusinessPartner_allowedPaymentTerms_update"
AFTER UPDATE OF "allowedPaymentTerms" ON "BusinessPartner"
BEGIN
  DELETE FROM "D1BusinessPartnerPaymentTerm" WHERE "ownerId"=OLD."id";
  INSERT OR IGNORE INTO "D1BusinessPartnerPaymentTerm" ("ownerId","value")
  SELECT NEW."id", CAST(value AS TEXT) FROM json_each(NEW."allowedPaymentTerms");
END;

CREATE TRIGGER IF NOT EXISTS "BusinessPartner_allowedPaymentTerms_delete"
AFTER DELETE ON "BusinessPartner"
BEGIN
  DELETE FROM "D1BusinessPartnerPaymentTerm" WHERE "ownerId"=OLD."id";
END;

CREATE TRIGGER IF NOT EXISTS "BusinessPartner_roles_insert"
AFTER INSERT ON "BusinessPartner"
BEGIN
  INSERT OR IGNORE INTO "D1BusinessPartnerRole" ("ownerId","value")
  SELECT NEW."id", CAST(value AS TEXT) FROM json_each(NEW."roles");
END;

CREATE TRIGGER IF NOT EXISTS "BusinessPartner_roles_update"
AFTER UPDATE OF "roles" ON "BusinessPartner"
BEGIN
  DELETE FROM "D1BusinessPartnerRole" WHERE "ownerId"=OLD."id";
  INSERT OR IGNORE INTO "D1BusinessPartnerRole" ("ownerId","value")
  SELECT NEW."id", CAST(value AS TEXT) FROM json_each(NEW."roles");
END;

CREATE TRIGGER IF NOT EXISTS "BusinessPartner_roles_delete"
AFTER DELETE ON "BusinessPartner"
BEGIN
  DELETE FROM "D1BusinessPartnerRole" WHERE "ownerId"=OLD."id";
END;

CREATE TRIGGER IF NOT EXISTS "FleetVehicle_purposes_insert"
AFTER INSERT ON "FleetVehicle"
BEGIN
  INSERT OR IGNORE INTO "D1FleetVehiclePurpose" ("ownerId","value")
  SELECT NEW."id", CAST(value AS TEXT) FROM json_each(NEW."purposes");
END;

CREATE TRIGGER IF NOT EXISTS "FleetVehicle_purposes_update"
AFTER UPDATE OF "purposes" ON "FleetVehicle"
BEGIN
  DELETE FROM "D1FleetVehiclePurpose" WHERE "ownerId"=OLD."id";
  INSERT OR IGNORE INTO "D1FleetVehiclePurpose" ("ownerId","value")
  SELECT NEW."id", CAST(value AS TEXT) FROM json_each(NEW."purposes");
END;

CREATE TRIGGER IF NOT EXISTS "FleetVehicle_purposes_delete"
AFTER DELETE ON "FleetVehicle"
BEGIN
  DELETE FROM "D1FleetVehiclePurpose" WHERE "ownerId"=OLD."id";
END;

CREATE TRIGGER IF NOT EXISTS "TourBooking_specialRequirements_insert"
AFTER INSERT ON "TourBooking"
BEGIN
  INSERT OR IGNORE INTO "D1TourBookingSpecialRequirement" ("ownerId","value")
  SELECT NEW."id", CAST(value AS TEXT) FROM json_each(NEW."specialRequirements");
END;

CREATE TRIGGER IF NOT EXISTS "TourBooking_specialRequirements_update"
AFTER UPDATE OF "specialRequirements" ON "TourBooking"
BEGIN
  DELETE FROM "D1TourBookingSpecialRequirement" WHERE "ownerId"=OLD."id";
  INSERT OR IGNORE INTO "D1TourBookingSpecialRequirement" ("ownerId","value")
  SELECT NEW."id", CAST(value AS TEXT) FROM json_each(NEW."specialRequirements");
END;

CREATE TRIGGER IF NOT EXISTS "TourBooking_specialRequirements_delete"
AFTER DELETE ON "TourBooking"
BEGIN
  DELETE FROM "D1TourBookingSpecialRequirement" WHERE "ownerId"=OLD."id";
END;

CREATE TRIGGER IF NOT EXISTS "WarehouseResponsibility_deputyUserIds_insert"
AFTER INSERT ON "WarehouseResponsibility"
BEGIN
  INSERT OR IGNORE INTO "D1WarehouseResponsibilityDeputy" ("ownerId","value")
  SELECT NEW."storeId", CAST(value AS TEXT) FROM json_each(NEW."deputyUserIds");
END;

CREATE TRIGGER IF NOT EXISTS "WarehouseResponsibility_deputyUserIds_update"
AFTER UPDATE OF "deputyUserIds" ON "WarehouseResponsibility"
BEGIN
  DELETE FROM "D1WarehouseResponsibilityDeputy" WHERE "ownerId"=OLD."storeId";
  INSERT OR IGNORE INTO "D1WarehouseResponsibilityDeputy" ("ownerId","value")
  SELECT NEW."storeId", CAST(value AS TEXT) FROM json_each(NEW."deputyUserIds");
END;

CREATE TRIGGER IF NOT EXISTS "WarehouseResponsibility_deputyUserIds_delete"
AFTER DELETE ON "WarehouseResponsibility"
BEGIN
  DELETE FROM "D1WarehouseResponsibilityDeputy" WHERE "ownerId"=OLD."storeId";
END;

CREATE TRIGGER IF NOT EXISTS "CapacityPool_resourceIds_insert"
AFTER INSERT ON "CapacityPool"
BEGIN
  INSERT OR IGNORE INTO "D1CapacityPoolResource" ("ownerId","value")
  SELECT NEW."id", CAST(value AS TEXT) FROM json_each(NEW."resourceIds");
END;

CREATE TRIGGER IF NOT EXISTS "CapacityPool_resourceIds_update"
AFTER UPDATE OF "resourceIds" ON "CapacityPool"
BEGIN
  DELETE FROM "D1CapacityPoolResource" WHERE "ownerId"=OLD."id";
  INSERT OR IGNORE INTO "D1CapacityPoolResource" ("ownerId","value")
  SELECT NEW."id", CAST(value AS TEXT) FROM json_each(NEW."resourceIds");
END;

CREATE TRIGGER IF NOT EXISTS "CapacityPool_resourceIds_delete"
AFTER DELETE ON "CapacityPool"
BEGIN
  DELETE FROM "D1CapacityPoolResource" WHERE "ownerId"=OLD."id";
END;
