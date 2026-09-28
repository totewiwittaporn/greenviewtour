SET LOCAL search_path TO app_private, pg_catalog;

ALTER TABLE "TourProgram"
  ADD COLUMN "partnerSourceUrl" VARCHAR(2048),
  ADD COLUMN "partnerTermsVerifiedAt" DATE,
  ADD COLUMN "partnerContentVerifiedAt" DATE;

CREATE TABLE "TourProgramContent" (
  "id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  "tourId" UUID NOT NULL,
  "locale" VARCHAR(5) NOT NULL,
  "name" VARCHAR(200),
  "summary" VARCHAR(1000),
  "introduction" VARCHAR(5000),
  "longDescription" VARCHAR(20000),
  "departureTimes" VARCHAR(1000),
  "childPolicy" VARCHAR(2000),
  "cancellationTerms" VARCHAR(3000),
  "bookingCutoff" VARCHAR(1000),
  "meals" VARCHAR(3000),
  "fees" VARCHAR(3000),
  "inclusions" VARCHAR(4000),
  "exclusions" VARCHAR(4000),
  "preparationNotes" VARCHAR(4000),
  "specialConditions" VARCHAR(5000),
  "seoTitle" VARCHAR(120),
  "metaDescription" VARCHAR(320),
  "ogTitle" VARCHAR(120),
  "ogDescription" VARCHAR(320),
  "contentReviewedAt" DATE,
  CONSTRAINT "TourProgramContent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TourHighlight" (
  "id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  "tourId" UUID NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  "titleTh" VARCHAR(300),
  "titleEn" VARCHAR(300),
  "descriptionTh" VARCHAR(1000),
  "descriptionEn" VARCHAR(1000),
  CONSTRAINT "TourHighlight_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TourItineraryStep" (
  "id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  "tourId" UUID NOT NULL,
  "day" INTEGER NOT NULL DEFAULT 1,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "timeLabel" VARCHAR(100),
  "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  "titleTh" VARCHAR(300),
  "titleEn" VARCHAR(300),
  "descriptionTh" VARCHAR(2000),
  "descriptionEn" VARCHAR(2000),
  "locationTh" VARCHAR(300),
  "locationEn" VARCHAR(300),
  CONSTRAINT "TourItineraryStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TourFaq" (
  "id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  "tourId" UUID NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  "questionTh" VARCHAR(500),
  "answerTh" VARCHAR(5000),
  "questionEn" VARCHAR(500),
  "answerEn" VARCHAR(5000),
  CONSTRAINT "TourFaq_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TourMedia" (
  "id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  "tourId" UUID NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "kind" VARCHAR(20) NOT NULL DEFAULT 'GALLERY',
  "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  "url" VARCHAR(2048) NOT NULL,
  "altTh" VARCHAR(300),
  "altEn" VARCHAR(300),
  "captionTh" VARCHAR(500),
  "captionEn" VARCHAR(500),
  CONSTRAINT "TourMedia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TourProgramContent_tourId_locale_key" ON "TourProgramContent"("tourId","locale");
CREATE INDEX "TourProgramContent_tourId_idx" ON "TourProgramContent"("tourId");
CREATE INDEX "TourHighlight_tourId_status_sortOrder_idx" ON "TourHighlight"("tourId","status","sortOrder");
CREATE INDEX "TourItineraryStep_tourId_status_day_sortOrder_idx" ON "TourItineraryStep"("tourId","status","day","sortOrder");
CREATE INDEX "TourFaq_tourId_status_sortOrder_idx" ON "TourFaq"("tourId","status","sortOrder");
CREATE INDEX "TourMedia_tourId_status_sortOrder_idx" ON "TourMedia"("tourId","status","sortOrder");

ALTER TABLE "TourProgramContent" ADD CONSTRAINT "TourProgramContent_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TourHighlight" ADD CONSTRAINT "TourHighlight_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TourItineraryStep" ADD CONSTRAINT "TourItineraryStep_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TourFaq" ADD CONSTRAINT "TourFaq_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TourMedia" ADD CONSTRAINT "TourMedia_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TourProgramContent" ADD CONSTRAINT "TourProgramContent_locale_check" CHECK ("locale" IN ('th','en'));
ALTER TABLE "TourHighlight" ADD CONSTRAINT "TourHighlight_status_check" CHECK ("status" IN ('ACTIVE','INACTIVE'));
ALTER TABLE "TourItineraryStep" ADD CONSTRAINT "TourItineraryStep_status_check" CHECK ("status" IN ('ACTIVE','INACTIVE'));
ALTER TABLE "TourItineraryStep" ADD CONSTRAINT "TourItineraryStep_day_check" CHECK ("day">=1 AND "day"<=366);
ALTER TABLE "TourFaq" ADD CONSTRAINT "TourFaq_status_check" CHECK ("status" IN ('ACTIVE','INACTIVE'));
ALTER TABLE "TourMedia" ADD CONSTRAINT "TourMedia_status_check" CHECK ("status" IN ('ACTIVE','INACTIVE'));
ALTER TABLE "TourMedia" ADD CONSTRAINT "TourMedia_kind_check" CHECK ("kind" IN ('HERO','GALLERY'));

ALTER TABLE "TourProgramContent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TourHighlight" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TourItineraryStep" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TourFaq" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TourMedia" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."TourProgramContent",app_private."TourHighlight",app_private."TourItineraryStep",app_private."TourFaq",app_private."TourMedia" FROM PUBLIC,anon,authenticated;
