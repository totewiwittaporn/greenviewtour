SET LOCAL search_path TO app_private, pg_catalog;

ALTER TABLE "TourProgram"
  ADD COLUMN "homeFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "homeFeaturedOrder" INTEGER,
  ADD COLUMN "homeBadge" VARCHAR(30);

ALTER TABLE "TourProgramContent"
  ADD COLUMN "suitableFor" VARCHAR(1500),
  ADD COLUMN "meetingPoint" VARCHAR(1000),
  ADD COLUMN "weatherNotes" VARCHAR(2000);

ALTER TABLE "TourProgram"
  ADD CONSTRAINT "TourProgram_homeFeaturedOrder_check" CHECK ("homeFeaturedOrder" IS NULL OR ("homeFeaturedOrder" >= 1 AND "homeFeaturedOrder" <= 99)),
  ADD CONSTRAINT "TourProgram_homeBadge_check" CHECK ("homeBadge" IS NULL OR "homeBadge" IN ('BEST_SELLER','RECOMMENDED','SIGNATURE'));
