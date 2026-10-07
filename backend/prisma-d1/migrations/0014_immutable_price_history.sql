-- Price history guards. Validated with Local synthetic migration and restore tests.
-- Reuse AuditEvent for immutable price revisions and confirmation decisions.
-- Legacy observations are not backdated or claimed as reconstructed history.
CREATE UNIQUE INDEX IF NOT EXISTS "AuditEvent_rate_revision_unique"
 ON "AuditEvent"("targetId",json_extract("details",'$.version'))
 WHERE "action"='settings.rates.revision';
CREATE UNIQUE INDEX IF NOT EXISTS "AuditEvent_price_confirmation_unique"
 ON "AuditEvent"("targetId",json_extract("details",'$.bookingVersion'))
 WHERE "action"='operations.booking.price.confirmed';
CREATE UNIQUE INDEX IF NOT EXISTS "AuditEvent_price_confirmation_command_unique"
 ON "AuditEvent"(json_extract("details",'$.commandId'))
 WHERE "action"='operations.booking.price.confirmed';
CREATE TRIGGER IF NOT EXISTS "AuditEvent_price_history_no_update" BEFORE UPDATE ON "AuditEvent"
 WHEN OLD."action" IN ('settings.rates.revision','operations.booking.price.confirmed')
 OR NEW."action" IN ('settings.rates.revision','operations.booking.price.confirmed')
 BEGIN SELECT RAISE(ABORT,'PRICE_HISTORY_IMMUTABLE'); END;
CREATE TRIGGER IF NOT EXISTS "AuditEvent_price_history_no_delete" BEFORE DELETE ON "AuditEvent"
 WHEN OLD."action" IN ('settings.rates.revision','operations.booking.price.confirmed')
 BEGIN SELECT RAISE(ABORT,'PRICE_HISTORY_IMMUTABLE'); END;
