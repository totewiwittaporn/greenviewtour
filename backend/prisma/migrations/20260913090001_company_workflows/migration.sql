BEGIN;
-- CreateTable
CREATE TABLE app_private."CompanyWorkRecord" (
    "id" UUID NOT NULL,
    "kind" VARCHAR(30) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "parentId" UUID,
    "dueOn" DATE,
    "assigneeId" UUID,
    "storeId" UUID,
    "createdById" UUID NOT NULL,
    "approvedById" UUID,
    "completedById" UUID,
    "commandHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CompanyWorkRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE app_private."WarehouseResponsibility" (
    "storeId" UUID NOT NULL,
    "primaryUserId" UUID NOT NULL,
    "deputyUserIds" UUID[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL,
    "updatedById" UUID NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "WarehouseResponsibility_pkey" PRIMARY KEY ("storeId")
);

-- CreateTable
CREATE TABLE app_private."PurchaseOrder" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "supplierId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "lines" JSONB NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "receivedTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "requestId" UUID,
    "reason" VARCHAR(2000) NOT NULL,
    "quotationUrl" VARCHAR(2048),
    "createdById" UUID NOT NULL,
    "approvedById" UUID,
    "commandHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE app_private."CompanyWorkCommand" (
    "id" UUID NOT NULL,
    "requestHash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "actorId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyWorkCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE app_private."FinancePersonnelRecord" (
    "id" UUID NOT NULL,
    "kind" VARCHAR(30) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "employeeId" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" UUID NOT NULL,
    "approvedBy" UUID,
    "payment" JSONB,
    "clearance" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "FinancePersonnelRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE app_private."FinancePersonnelCommand" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "requestHash" VARCHAR(64) NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancePersonnelCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyWorkRecord_kind_status_dueOn_idx" ON app_private."CompanyWorkRecord"("kind", "status", "dueOn");

-- CreateIndex
CREATE INDEX "CompanyWorkRecord_assigneeId_kind_idx" ON app_private."CompanyWorkRecord"("assigneeId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyWorkRecord_parentId_dueOn_key" ON app_private."CompanyWorkRecord"("parentId", "dueOn");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_createdAt_idx" ON app_private."PurchaseOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FinancePersonnelRecord_kind_status_idx" ON app_private."FinancePersonnelRecord"("kind", "status");

-- CreateIndex
CREATE INDEX "FinancePersonnelRecord_employeeId_idx" ON app_private."FinancePersonnelRecord"("employeeId");

ALTER TABLE app_private."CompanyWorkRecord" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."CompanyWorkRecord" FROM anon, authenticated;
ALTER TABLE app_private."WarehouseResponsibility" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."WarehouseResponsibility" FROM anon, authenticated;
ALTER TABLE app_private."PurchaseOrder" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."PurchaseOrder" FROM anon, authenticated;
ALTER TABLE app_private."CompanyWorkCommand" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."CompanyWorkCommand" FROM anon, authenticated;
ALTER TABLE app_private."FinancePersonnelRecord" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."FinancePersonnelRecord" FROM anon, authenticated;
ALTER TABLE app_private."FinancePersonnelCommand" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private."FinancePersonnelCommand" FROM anon, authenticated;
ALTER TABLE app_private."CompanyWorkRecord" ADD CONSTRAINT "CompanyWorkRecord_createdById_fk" FOREIGN KEY ("createdById") REFERENCES app_private."UserProfile"("id") ON DELETE RESTRICT;
ALTER TABLE app_private."CompanyWorkRecord" ADD CONSTRAINT "CompanyWorkRecord_approvedById_fk" FOREIGN KEY ("approvedById") REFERENCES app_private."UserProfile"("id") ON DELETE RESTRICT;
ALTER TABLE app_private."CompanyWorkRecord" ADD CONSTRAINT "CompanyWorkRecord_completedById_fk" FOREIGN KEY ("completedById") REFERENCES app_private."UserProfile"("id") ON DELETE RESTRICT;
ALTER TABLE app_private."CompanyWorkRecord" ADD CONSTRAINT "CompanyWorkRecord_assigneeId_fk" FOREIGN KEY ("assigneeId") REFERENCES app_private."UserProfile"("id") ON DELETE RESTRICT;
ALTER TABLE app_private."CompanyWorkRecord" ADD CONSTRAINT "CompanyWorkRecord_storeId_fk" FOREIGN KEY ("storeId") REFERENCES app_private."StockLocation"("id") ON DELETE RESTRICT;
ALTER TABLE app_private."CompanyWorkRecord" ADD CONSTRAINT "CompanyWorkRecord_parentId_fk" FOREIGN KEY ("parentId") REFERENCES app_private."CompanyWorkRecord"("id") ON DELETE RESTRICT;
ALTER TABLE app_private."WarehouseResponsibility" ADD CONSTRAINT "WarehouseResponsibility_storeId_fk" FOREIGN KEY ("storeId") REFERENCES app_private."StockLocation"("id") ON DELETE RESTRICT;
ALTER TABLE app_private."WarehouseResponsibility" ADD CONSTRAINT "WarehouseResponsibility_primaryUserId_fk" FOREIGN KEY ("primaryUserId") REFERENCES app_private."UserProfile"("id") ON DELETE RESTRICT;
ALTER TABLE app_private."WarehouseResponsibility" ADD CONSTRAINT "WarehouseResponsibility_updatedById_fk" FOREIGN KEY ("updatedById") REFERENCES app_private."UserProfile"("id") ON DELETE RESTRICT;
ALTER TABLE app_private."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fk" FOREIGN KEY ("supplierId") REFERENCES app_private."BusinessPartner"("id") ON DELETE RESTRICT;
ALTER TABLE app_private."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_storeId_fk" FOREIGN KEY ("storeId") REFERENCES app_private."StockLocation"("id") ON DELETE RESTRICT;
ALTER TABLE app_private."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_requestId_fk" FOREIGN KEY ("requestId") REFERENCES app_private."CompanyWorkRecord"("id") ON DELETE RESTRICT;
ALTER TABLE app_private."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_fk" FOREIGN KEY ("createdById") REFERENCES app_private."UserProfile"("id") ON DELETE RESTRICT;
ALTER TABLE app_private."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_approvedById_fk" FOREIGN KEY ("approvedById") REFERENCES app_private."UserProfile"("id") ON DELETE RESTRICT;
ALTER TABLE app_private."CompanyWorkCommand" ADD CONSTRAINT "CompanyWorkCommand_actorId_fk" FOREIGN KEY ("actorId") REFERENCES app_private."UserProfile"("id") ON DELETE RESTRICT;
ALTER TABLE app_private."FinancePersonnelRecord" ADD CONSTRAINT "FinancePersonnelRecord_employeeId_fk" FOREIGN KEY ("employeeId") REFERENCES app_private."UserProfile"("id") ON DELETE RESTRICT;
ALTER TABLE app_private."FinancePersonnelRecord" ADD CONSTRAINT "FinancePersonnelRecord_createdBy_fk" FOREIGN KEY ("createdBy") REFERENCES app_private."UserProfile"("id") ON DELETE RESTRICT;
ALTER TABLE app_private."FinancePersonnelRecord" ADD CONSTRAINT "FinancePersonnelRecord_approvedBy_fk" FOREIGN KEY ("approvedBy") REFERENCES app_private."UserProfile"("id") ON DELETE RESTRICT;
ALTER TABLE app_private."FinancePersonnelCommand" ADD CONSTRAINT "FinancePersonnelCommand_actorId_fk" FOREIGN KEY ("actorId") REFERENCES app_private."UserProfile"("id") ON DELETE RESTRICT;
ALTER TABLE app_private."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_amount_check" CHECK (total >= 0 AND "receivedTotal" >= 0 AND "receivedTotal" <= total);
COMMIT;
