-- Preserve in-progress legacy address text; request structured fields before activation.
ALTER TABLE "EmployeeOnboarding" ADD COLUMN "addressDetails" JSON;
