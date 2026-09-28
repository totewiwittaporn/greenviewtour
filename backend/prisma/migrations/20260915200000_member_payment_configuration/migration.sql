SET LOCAL search_path TO app_private, pg_catalog;
-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN     "bankAccountName" VARCHAR(200),
ADD COLUMN     "bankAccountNumber" VARCHAR(100),
ADD COLUMN     "bankName" VARCHAR(200),
ADD COLUMN     "paymentInstructions" VARCHAR(1000);

-- AlterTable
ALTER TABLE "TourPromotion" ADD COLUMN     "holdHours" INTEGER;

-- AlterTable
ALTER TABLE "CustomerRequest" ADD COLUMN     "holdUntil" TIMESTAMPTZ(6);
