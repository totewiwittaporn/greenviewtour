ALTER TABLE app_private."BusinessPartner" ADD COLUMN "bookingCommissionEligible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE app_private."TourProgram" ADD COLUMN "bookingCommissionEligible" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "bookingAdultCommission" DECIMAL(10,2), ADD COLUMN "bookingChildCommission" DECIMAL(10,2);
ALTER TABLE app_private."TourBooking" ADD COLUMN "commissionSnapshot" JSONB;
ALTER TABLE app_private."TourProgram" ADD CONSTRAINT "TourProgram_bookingCommission_nonnegative" CHECK (("bookingAdultCommission" IS NULL OR "bookingAdultCommission" >= 0) AND ("bookingChildCommission" IS NULL OR "bookingChildCommission" >= 0));
