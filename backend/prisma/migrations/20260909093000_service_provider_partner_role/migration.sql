BEGIN;
-- Expand business-partner classification only; account permissions are unchanged.
DO $$ DECLARE constraint_name text; found_count integer; BEGIN
 SELECT count(*),min(conname::text) INTO found_count,constraint_name
 FROM pg_constraint WHERE conrelid='app_private."BusinessPartner"'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%roles%';
 IF found_count <> 1 THEN RAISE EXCEPTION 'Expected exactly one BusinessPartner roles check'; END IF;
 EXECUTE format('ALTER TABLE app_private."BusinessPartner" DROP CONSTRAINT %I',constraint_name);
END $$;
ALTER TABLE app_private."BusinessPartner" ADD CONSTRAINT "BusinessPartner_roles_check"
 CHECK (cardinality("roles") > 0 AND "roles" <@ ARRAY['TOUR_OPERATOR','SALES_AGENT','TRANSPORT_PROVIDER','SERVICE_PROVIDER']::TEXT[]);
COMMIT;
