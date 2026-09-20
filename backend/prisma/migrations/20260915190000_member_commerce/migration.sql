SET LOCAL search_path TO app_private, pg_catalog;
-- AlterTable
ALTER TABLE "TourProgram" ADD COLUMN     "description" VARCHAR(5000),
ADD COLUMN     "exclusions" VARCHAR(2000),
ADD COLUMN     "fees" VARCHAR(2000),
ADD COLUMN     "highlights" VARCHAR(3000),
ADD COLUMN     "imageUrls" VARCHAR(5000),
ADD COLUMN     "inclusions" VARCHAR(2000),
ADD COLUMN     "meals" VARCHAR(2000),
ADD COLUMN     "preparationNotes" VARCHAR(2000),
ADD COLUMN     "publicStatus" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "slug" VARCHAR(100),
ADD COLUMN     "tourType" VARCHAR(30);

-- CreateTable
CREATE TABLE "TourSeason" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "tourId" UUID NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "onlineStartsOn" DATE NOT NULL,
    "onlineEndsOn" DATE NOT NULL,
    "bookingStartsOn" DATE NOT NULL,
    "bookingEndsOn" DATE NOT NULL,
    "cutoffDays" INTEGER NOT NULL DEFAULT 1,
    "closedDates" VARCHAR(2000),

    CONSTRAINT "TourSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourPromotion" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "tourId" UUID NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "serviceStartsOn" DATE NOT NULL,
    "serviceEndsOn" DATE NOT NULL,
    "adultPrice" DECIMAL(10,2),
    "childPrice" DECIMAL(10,2),
    "quota" INTEGER,
    "quotaUnit" VARCHAR(20) NOT NULL,
    "terms" VARCHAR(2000),

    CONSTRAINT "TourPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsitePopup" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "imageUrl" VARCHAR(2048) NOT NULL,
    "imageAlt" VARCHAR(300) NOT NULL,
    "mobileImageUrl" VARCHAR(2048),
    "title" VARCHAR(200),
    "linkUrl" VARCHAR(2048),
    "buttonLabel" VARCHAR(100),
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "frequency" VARCHAR(20) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WebsitePopup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "authUserId" UUID,
    "displayName" VARCHAR(200) NOT NULL,
    "email" VARCHAR(254),
    "phone" VARCHAR(32),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerRequest" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "customerId" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "promotionId" UUID,
    "serviceDate" DATE NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'REQUESTED',
    "requestHash" VARCHAR(64) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "details" JSONB NOT NULL,
    "bookingId" UUID,
    "staffNote" VARCHAR(1000),

    CONSTRAINT "CustomerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteImage" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filename" VARCHAR(200) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "content" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "uploadedBy" UUID NOT NULL,

    CONSTRAINT "WebsiteImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TourSeason_code_key" ON "TourSeason"("code");

-- CreateIndex
CREATE INDEX "TourSeason_tourId_status_idx" ON "TourSeason"("tourId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TourPromotion_code_key" ON "TourPromotion"("code");

-- CreateIndex
CREATE INDEX "TourPromotion_tourId_status_idx" ON "TourPromotion"("tourId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WebsitePopup_code_key" ON "WebsitePopup"("code");

-- CreateIndex
CREATE INDEX "WebsitePopup_status_startsOn_endsOn_idx" ON "WebsitePopup"("status", "startsOn", "endsOn");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_authUserId_key" ON "CustomerProfile"("authUserId");

-- CreateIndex
CREATE INDEX "CustomerProfile_status_displayName_idx" ON "CustomerProfile"("status", "displayName");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerRequest_bookingId_key" ON "CustomerRequest"("bookingId");

-- CreateIndex
CREATE INDEX "CustomerRequest_customerId_createdAt_idx" ON "CustomerRequest"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerRequest_promotionId_status_idx" ON "CustomerRequest"("promotionId", "status");

-- CreateIndex
CREATE INDEX "CustomerRequest_status_createdAt_idx" ON "CustomerRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TourProgram_slug_key" ON "TourProgram"("slug");

-- AddForeignKey
ALTER TABLE "TourSeason" ADD CONSTRAINT "TourSeason_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourPromotion" ADD CONSTRAINT "TourPromotion_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "TourPromotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "TourBooking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE app_private."TourSeason" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private."TourPromotion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private."WebsitePopup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private."CustomerProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private."CustomerRequest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."TourSeason",app_private."TourPromotion",app_private."WebsitePopup",app_private."CustomerProfile",app_private."CustomerRequest" FROM PUBLIC,anon,authenticated;
ALTER TABLE app_private."CustomerRequest" ADD CONSTRAINT "CustomerRequest_counts_check" CHECK (adults>0 AND children>=0 AND adults+children<=100);

ALTER TABLE app_private."EvidenceAttachment" DROP CONSTRAINT "EvidenceAttachment_targetKind_check";
ALTER TABLE app_private."EvidenceAttachment" ADD CONSTRAINT "EvidenceAttachment_targetKind_check" CHECK ("targetKind" IN ('BOOKING','PERSONNEL_FINANCE','AGENT_BILL','AGENT_PAYMENT','CUSTOMER_REQUEST'));

ALTER TABLE app_private."WebsiteImage" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."WebsiteImage" FROM PUBLIC,anon,authenticated;
