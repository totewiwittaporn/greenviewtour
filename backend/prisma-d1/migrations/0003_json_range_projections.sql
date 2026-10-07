CREATE TRIGGER IF NOT EXISTS "FinancePersonnelRecord_payload_dueOn_insert"
AFTER INSERT ON "FinancePersonnelRecord"
BEGIN
  INSERT OR REPLACE INTO "D1JsonProjection" ("source","ownerId","textValue")
  SELECT 'FinancePersonnelRecord.payload.dueOn', NEW."id", CAST(json_extract(NEW."payload", '$.dueOn') AS TEXT)
  WHERE json_type(NEW."payload", '$.dueOn') IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS "FinancePersonnelRecord_payload_dueOn_update"
AFTER UPDATE OF "payload" ON "FinancePersonnelRecord"
BEGIN
  DELETE FROM "D1JsonProjection" WHERE "source"='FinancePersonnelRecord.payload.dueOn' AND "ownerId"=OLD."id";
  INSERT OR REPLACE INTO "D1JsonProjection" ("source","ownerId","textValue")
  SELECT 'FinancePersonnelRecord.payload.dueOn', NEW."id", CAST(json_extract(NEW."payload", '$.dueOn') AS TEXT)
  WHERE json_type(NEW."payload", '$.dueOn') IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS "FinancePersonnelRecord_payload_dueOn_delete"
AFTER DELETE ON "FinancePersonnelRecord"
BEGIN
  DELETE FROM "D1JsonProjection" WHERE "source"='FinancePersonnelRecord.payload.dueOn' AND "ownerId"=OLD."id";
END;

CREATE TRIGGER IF NOT EXISTS "FinancePersonnelRecord_payment_paidOn_insert"
AFTER INSERT ON "FinancePersonnelRecord"
BEGIN
  INSERT OR REPLACE INTO "D1JsonProjection" ("source","ownerId","textValue")
  SELECT 'FinancePersonnelRecord.payment.paidOn', NEW."id", CAST(json_extract(NEW."payment", '$.paidOn') AS TEXT)
  WHERE json_type(NEW."payment", '$.paidOn') IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS "FinancePersonnelRecord_payment_paidOn_update"
AFTER UPDATE OF "payment" ON "FinancePersonnelRecord"
BEGIN
  DELETE FROM "D1JsonProjection" WHERE "source"='FinancePersonnelRecord.payment.paidOn' AND "ownerId"=OLD."id";
  INSERT OR REPLACE INTO "D1JsonProjection" ("source","ownerId","textValue")
  SELECT 'FinancePersonnelRecord.payment.paidOn', NEW."id", CAST(json_extract(NEW."payment", '$.paidOn') AS TEXT)
  WHERE json_type(NEW."payment", '$.paidOn') IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS "FinancePersonnelRecord_payment_paidOn_delete"
AFTER DELETE ON "FinancePersonnelRecord"
BEGIN
  DELETE FROM "D1JsonProjection" WHERE "source"='FinancePersonnelRecord.payment.paidOn' AND "ownerId"=OLD."id";
END;

CREATE TRIGGER IF NOT EXISTS "CustomerRequest_snapshot_payment_receivedOn_insert"
AFTER INSERT ON "CustomerRequest"
BEGIN
  INSERT OR REPLACE INTO "D1JsonProjection" ("source","ownerId","textValue")
  SELECT 'CustomerRequest.snapshot.payment.receivedOn', NEW."id", CAST(json_extract(NEW."snapshot", '$.payment.receivedOn') AS TEXT)
  WHERE json_type(NEW."snapshot", '$.payment.receivedOn') IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS "CustomerRequest_snapshot_payment_receivedOn_update"
AFTER UPDATE OF "snapshot" ON "CustomerRequest"
BEGIN
  DELETE FROM "D1JsonProjection" WHERE "source"='CustomerRequest.snapshot.payment.receivedOn' AND "ownerId"=OLD."id";
  INSERT OR REPLACE INTO "D1JsonProjection" ("source","ownerId","textValue")
  SELECT 'CustomerRequest.snapshot.payment.receivedOn', NEW."id", CAST(json_extract(NEW."snapshot", '$.payment.receivedOn') AS TEXT)
  WHERE json_type(NEW."snapshot", '$.payment.receivedOn') IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS "CustomerRequest_snapshot_payment_receivedOn_delete"
AFTER DELETE ON "CustomerRequest"
BEGIN
  DELETE FROM "D1JsonProjection" WHERE "source"='CustomerRequest.snapshot.payment.receivedOn' AND "ownerId"=OLD."id";
END;

CREATE TRIGGER IF NOT EXISTS "OperationDailySnapshot_runs_arrayLength_insert"
AFTER INSERT ON "OperationDailySnapshot"
BEGIN
  INSERT OR REPLACE INTO "D1JsonProjection" ("source","ownerId","textValue")
  SELECT 'OperationDailySnapshot.runs.length', NEW."id", CAST(json_array_length(NEW."runs") AS TEXT)
  WHERE NEW."runs" IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS "OperationDailySnapshot_runs_arrayLength_update"
AFTER UPDATE OF "runs" ON "OperationDailySnapshot"
BEGIN
  DELETE FROM "D1JsonProjection" WHERE "source"='OperationDailySnapshot.runs.length' AND "ownerId"=OLD."id";
  INSERT OR REPLACE INTO "D1JsonProjection" ("source","ownerId","textValue")
  SELECT 'OperationDailySnapshot.runs.length', NEW."id", CAST(json_array_length(NEW."runs") AS TEXT)
  WHERE NEW."runs" IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS "OperationDailySnapshot_runs_arrayLength_delete"
AFTER DELETE ON "OperationDailySnapshot"
BEGIN
  DELETE FROM "D1JsonProjection" WHERE "source"='OperationDailySnapshot.runs.length' AND "ownerId"=OLD."id";
END;
