-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "nickname" TEXT,
    "department" TEXT,
    "address" TEXT,
    "primaryPhone" TEXT,
    "emergencyPhone" TEXT,
    "lineId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "accessVersion" INTEGER NOT NULL DEFAULT 1,
    "province" TEXT,
    "district" TEXT,
    "subdistrict" TEXT,
    "postalCode" TEXT,
    "houseNumber" TEXT,
    "moo" TEXT,
    "villageName" TEXT,
    "mapUrl" TEXT,
    "latitude" TEXT,
    "longitude" TEXT
);

-- CreateTable
CREATE TABLE "Role" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "UserPermissionOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "permissionCode" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "scopeId" TEXT,
    "startsAt" DATETIME,
    "expiresAt" DATETIME,
    CONSTRAINT "UserPermissionOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Permission" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'SELF',

    PRIMARY KEY ("userId", "roleCode", "scope"),
    CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserRole_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "Role" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleCode" TEXT NOT NULL,
    "permissionCode" TEXT NOT NULL,

    PRIMARY KEY ("roleCode", "permissionCode"),
    CONSTRAINT "RolePermission_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "Role" ("code") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RolePermission_permissionCode_fkey" FOREIGN KEY ("permissionCode") REFERENCES "Permission" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "department" TEXT,
    "acceptedAt" DATETIME,
    "revokedAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME
);

-- CreateTable
CREATE TABLE "InvitationRole" (
    "invitationId" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'SELF',

    PRIMARY KEY ("invitationId", "roleCode", "scope"),
    CONSTRAINT "InvitationRole_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvitationRole_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "Role" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "SalesChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "kind" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "bankName" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "paymentInstructions" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "taxId" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "province" TEXT,
    "district" TEXT,
    "subdistrict" TEXT,
    "postalCode" TEXT,
    "houseNumber" TEXT,
    "moo" TEXT,
    "villageName" TEXT,
    "mapUrl" TEXT,
    "latitude" TEXT,
    "longitude" TEXT
);

-- CreateTable
CREATE TABLE "BusinessPartner" (
    "billingMode" TEXT,
    "billingCycleCount" INTEGER,
    "billingCycleUnit" TEXT,
    "billingCycleAnchor" DATETIME,
    "creditCount" INTEGER,
    "creditUnit" TEXT,
    "creditAnchor" TEXT,
    "shortName" TEXT,
    "bookingCommissionEligible" BOOLEAN NOT NULL DEFAULT false,
    "allowedPaymentTerms" JSONB NOT NULL DEFAULT ["PREPAID","PAID","COUNTER","AGENT_CREDIT"],
    "defaultPaymentTerms" TEXT NOT NULL DEFAULT 'COUNTER',
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "roles" JSONB NOT NULL DEFAULT [],
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "association" TEXT,
    "paymentTerms" TEXT,
    "province" TEXT,
    "district" TEXT,
    "subdistrict" TEXT,
    "postalCode" TEXT,
    "houseNumber" TEXT,
    "moo" TEXT,
    "villageName" TEXT,
    "mapUrl" TEXT,
    "latitude" TEXT,
    "longitude" TEXT
);

-- CreateTable
CREATE TABLE "TourProgram" (
    "printCode" TEXT,
    "bookingCommissionEligible" BOOLEAN NOT NULL DEFAULT false,
    "bookingAdultCommission" DECIMAL,
    "bookingChildCommission" DECIMAL,
    "publicStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "homeFeatured" BOOLEAN NOT NULL DEFAULT false,
    "homeFeaturedOrder" INTEGER,
    "homeBadge" TEXT,
    "slug" TEXT,
    "tourType" TEXT,
    "description" TEXT,
    "highlights" TEXT,
    "imageUrls" TEXT,
    "meals" TEXT,
    "fees" TEXT,
    "inclusions" TEXT,
    "exclusions" TEXT,
    "preparationNotes" TEXT,
    "partnerSourceUrl" TEXT,
    "partnerTermsVerifiedAt" DATETIME,
    "partnerContentVerifiedAt" DATETIME,
    "journeyMode" TEXT NOT NULL DEFAULT 'FIXED',
    "durationDays" INTEGER DEFAULT 1,
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "ownership" TEXT NOT NULL,
    "operatorId" TEXT,
    "route" TEXT,
    "departureTimes" TEXT,
    "childPolicy" TEXT,
    "confirmationMode" TEXT NOT NULL,
    "cancellationTerms" TEXT,
    "bookingCutoff" TEXT,
    "adultPrice" DECIMAL,
    "childPrice" DECIMAL,
    "supplierPricing" TEXT NOT NULL,
    "supplierAdultNet" DECIMAL,
    "supplierChildNet" DECIMAL,
    "supplierAdultCommission" DECIMAL,
    "supplierChildCommission" DECIMAL,
    CONSTRAINT "TourProgram_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "BusinessPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TourProgramContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "tourId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT,
    "summary" TEXT,
    "introduction" TEXT,
    "longDescription" TEXT,
    "departureTimes" TEXT,
    "childPolicy" TEXT,
    "cancellationTerms" TEXT,
    "bookingCutoff" TEXT,
    "meals" TEXT,
    "fees" TEXT,
    "inclusions" TEXT,
    "exclusions" TEXT,
    "preparationNotes" TEXT,
    "specialConditions" TEXT,
    "suitableFor" TEXT,
    "meetingPoint" TEXT,
    "weatherNotes" TEXT,
    "seoTitle" TEXT,
    "metaDescription" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "contentReviewedAt" DATETIME,
    CONSTRAINT "TourProgramContent_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TourHighlight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "tourId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "titleTh" TEXT,
    "titleEn" TEXT,
    "descriptionTh" TEXT,
    "descriptionEn" TEXT,
    CONSTRAINT "TourHighlight_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TourItineraryStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "tourId" TEXT NOT NULL,
    "day" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "timeLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "titleTh" TEXT,
    "titleEn" TEXT,
    "descriptionTh" TEXT,
    "descriptionEn" TEXT,
    "locationTh" TEXT,
    "locationEn" TEXT,
    CONSTRAINT "TourItineraryStep_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TourFaq" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "tourId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "questionTh" TEXT,
    "answerTh" TEXT,
    "questionEn" TEXT,
    "answerEn" TEXT,
    CONSTRAINT "TourFaq_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TourMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "tourId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "kind" TEXT NOT NULL DEFAULT 'GALLERY',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "url" TEXT NOT NULL,
    "altTh" TEXT,
    "altEn" TEXT,
    "captionTh" TEXT,
    "captionEn" TEXT,
    CONSTRAINT "TourMedia_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentTourPrice" (
    "agreementId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "agentId" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "adultPrice" DECIMAL,
    "childPrice" DECIMAL,
    "status" TEXT NOT NULL,
    CONSTRAINT "AgentTourPrice_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "AgentAgreement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AgentTourPrice_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "BusinessPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AgentTourPrice_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PickupLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "zone" TEXT,
    "address" TEXT,
    "latitude" TEXT,
    "longitude" TEXT,
    "pickupNotes" TEXT,
    "province" TEXT,
    "district" TEXT,
    "subdistrict" TEXT,
    "postalCode" TEXT,
    "houseNumber" TEXT,
    "moo" TEXT,
    "villageName" TEXT,
    "mapUrl" TEXT
);

-- CreateTable
CREATE TABLE "FleetVehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "engineCount" INTEGER,
    "totalCapacity" INTEGER,
    "expectedCrew" INTEGER,
    "purposes" JSONB NOT NULL DEFAULT [],
    "hireCost" DECIMAL,
    "commissionType" TEXT,
    "commissionValue" DECIMAL,
    "ownership" TEXT NOT NULL,
    "providerId" TEXT,
    "registration" TEXT,
    "notes" TEXT,
    CONSTRAINT "FleetVehicle_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "BusinessPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OperationResource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "baseUnit" TEXT NOT NULL,
    "ownership" TEXT,
    "mealPeriod" TEXT,
    "accommodationType" TEXT,
    "occupancy" INTEGER,
    "serviceMode" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "packSize" INTEGER,
    "caseSize" INTEGER,
    "size" TEXT,
    "providerId" TEXT,
    "origin" TEXT,
    "destination" TEXT,
    "salePrice" DECIMAL,
    "costPrice" DECIMAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OperationResource_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "BusinessPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProgramComponent" (
    "removalCredit" DECIMAL,
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tourId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "selection" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "usagePoint" TEXT NOT NULL,
    "day" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProgramComponent_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProgramComponent_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "OperationResource" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceSlot_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "OperationResource" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceSlot_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "FleetVehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OperationTrip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tourId" TEXT,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OperationTrip_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TourBooking" (
    "assigneeId" TEXT,
    "commissionSnapshot" JSONB,
    "outboundDate" DATETIME,
    "returnDate" DATETIME,
    "returnStatus" TEXT NOT NULL DEFAULT 'OUR',
    "createdById" TEXT,
    "hotelId" TEXT,
    "channelId" TEXT,
    "allergyStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "specialRequirements" JSONB NOT NULL DEFAULT [],
    "agentId" TEXT,
    "agentName" TEXT,
    "agentPhone" TEXT,
    "agentReference" TEXT,
    "contactPhone" TEXT,
    "hotel" TEXT,
    "room" TEXT,
    "pickupPoint" TEXT,
    "dropoffPoint" TEXT,
    "allergies" TEXT,
    "assistance" TEXT,
    "requestNotes" TEXT,
    "paymentTerms" TEXT NOT NULL DEFAULT 'UNSET',
    "afterServiceReason" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "adultPrice" DECIMAL,
    "childPrice" DECIMAL,
    "programSnapshot" JSONB NOT NULL,
    "requestHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TourBooking_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "BusinessPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TourBooking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "OperationTrip" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BookingComponent" (
    "dispatchDirection" TEXT NOT NULL DEFAULT 'BOTH',
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "slotId" TEXT,
    "sourceId" TEXT,
    "quantity" INTEGER NOT NULL,
    "issuedQty" INTEGER NOT NULL DEFAULT 0,
    "selected" BOOLEAN NOT NULL,
    "included" BOOLEAN NOT NULL,
    "usagePoint" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "unitPrice" DECIMAL,
    CONSTRAINT "BookingComponent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "TourBooking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BookingComponent_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "OperationResource" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BookingComponent_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ServiceSlot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BookingComponent_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "StockLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "receivedOn" DATETIME NOT NULL,
    "expiresOn" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockLot_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "OperationResource" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "StockBalance_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "StockLot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockBalance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockIssue" (
    "runId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotId" TEXT NOT NULL,
    "bookingLineId" TEXT,
    "sourceId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "custodian" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "settledQty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockIssue_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "StockLot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockIssue_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "StockLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockIssue_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "StockLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockIssue_bookingLineId_fkey" FOREIGN KEY ("bookingLineId") REFERENCES "BookingComponent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestHash" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "enteredQuantity" INTEGER NOT NULL,
    "enteredUnit" TEXT NOT NULL,
    "factor" INTEGER NOT NULL,
    "details" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OperationCommand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestHash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DispatchRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "slotId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DispatchRun_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ServiceSlot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DispatchStaff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    CONSTRAINT "DispatchStaff_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DispatchRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DispatchStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DispatchAssignment" (
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "cancellationReason" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "bookingLineId" TEXT NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL,
    "pickupAt" DATETIME,
    "dropoffPoint" TEXT,
    "notes" TEXT,
    "actualAdults" INTEGER,
    "actualChildren" INTEGER,
    "changeReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DispatchAssignment_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DispatchRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DispatchAssignment_bookingLineId_fkey" FOREIGN KEY ("bookingLineId") REFERENCES "BookingComponent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OperationDailySnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceDate" DATETIME NOT NULL,
    "kind" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "runs" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OperationNotificationOutbox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "serviceDate" DATETIME NOT NULL,
    "revision" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PREPARED',
    "retryKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "firstAttemptAt" DATETIME,
    "lastAttemptAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OperationNotificationOutbox_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "OperationDailySnapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentAsset" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "mimeType" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AgentAgreement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "startsOn" DATETIME NOT NULL,
    "endsOn" DATETIME NOT NULL,
    "signedOn" DATETIME,
    "evidenceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentAgreement_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "BusinessPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BookingSequence" (
    "year" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "value" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "CompanyWorkRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "parentId" TEXT,
    "dueOn" DATETIME,
    "assigneeId" TEXT,
    "storeId" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "completedById" TEXT,
    "commandHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WarehouseResponsibility" (
    "storeId" TEXT NOT NULL PRIMARY KEY,
    "primaryUserId" TEXT NOT NULL,
    "deputyUserIds" JSONB NOT NULL DEFAULT [],
    "version" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "supplierId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "lines" JSONB NOT NULL,
    "total" DECIMAL NOT NULL,
    "receivedTotal" DECIMAL NOT NULL DEFAULT 0,
    "requestId" TEXT,
    "reason" TEXT NOT NULL,
    "quotationUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "commandHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CompanyWorkCommand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestHash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FinancePersonnelRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "payment" JSONB,
    "clearance" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FinancePersonnelCommand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EvidenceAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetKind" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "AgentBill" (
    "billingPolicySnapshot" JSONB,
    "originalDueOn" DATETIME,
    "promisedOn" DATETIME,
    "rescheduleHistory" JSONB NOT NULL DEFAULT [],
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "total" DECIMAL NOT NULL,
    "paid" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dueOn" DATETIME NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AgentBillLine" (
    "bookingId" TEXT NOT NULL PRIMARY KEY,
    "billId" TEXT NOT NULL,
    CONSTRAINT "AgentBillLine_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "TourBooking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AgentBillLine_billId_fkey" FOREIGN KEY ("billId") REFERENCES "AgentBill" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "receivedOn" DATETIME NOT NULL,
    "reference" TEXT NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentPayment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "AgentBill" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TourSeason" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "startsOn" DATETIME NOT NULL,
    "endsOn" DATETIME NOT NULL,
    "onlineStartsOn" DATETIME NOT NULL,
    "onlineEndsOn" DATETIME NOT NULL,
    "bookingStartsOn" DATETIME NOT NULL,
    "bookingEndsOn" DATETIME NOT NULL,
    "cutoffDays" INTEGER NOT NULL DEFAULT 1,
    "closedDates" TEXT,
    CONSTRAINT "TourSeason_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TourPromotion" (
    "holdHours" INTEGER,
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "startsOn" DATETIME NOT NULL,
    "endsOn" DATETIME NOT NULL,
    "serviceStartsOn" DATETIME NOT NULL,
    "serviceEndsOn" DATETIME NOT NULL,
    "adultPrice" DECIMAL,
    "childPrice" DECIMAL,
    "quota" INTEGER,
    "quotaUnit" TEXT NOT NULL,
    "terms" TEXT,
    CONSTRAINT "TourPromotion_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebsitePopup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageAlt" TEXT NOT NULL,
    "mobileImageUrl" TEXT,
    "title" TEXT,
    "linkUrl" TEXT,
    "buttonLabel" TEXT,
    "startsOn" DATETIME NOT NULL,
    "endsOn" DATETIME NOT NULL,
    "frequency" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "authUserId" TEXT,
    "displayName" TEXT NOT NULL,
    "nickname" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "lineId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CustomerRequest" (
    "holdUntil" DATETIME,
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerId" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "promotionId" TEXT,
    "serviceDate" DATETIME NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requestHash" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "details" JSONB NOT NULL,
    "bookingId" TEXT,
    "staffNote" TEXT,
    CONSTRAINT "CustomerRequest_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "TourProgram" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CustomerRequest_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "TourPromotion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CustomerRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "TourBooking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CustomerRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebsiteImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "GuideAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "bookingId" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "requestHash" TEXT NOT NULL,
    CONSTRAINT "GuideAssignment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "TourBooking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GuideAssignment_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "UserProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BookingAttendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "serviceDate" DATETIME NOT NULL,
    "direction" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "adults" INTEGER NOT NULL DEFAULT 0,
    "children" INTEGER NOT NULL DEFAULT 0,
    "noShowAdults" INTEGER NOT NULL DEFAULT 0,
    "noShowChildren" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "financeStatus" TEXT NOT NULL DEFAULT 'NONE',
    "financeReason" TEXT,
    "financeReviewedBy" TEXT,
    "changes" JSONB NOT NULL DEFAULT [],
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BookingAttendance_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "TourBooking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceDayClose" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceDate" DATETIME NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'CLOSED',
    "snapshot" JSONB NOT NULL,
    "reason" TEXT,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CapacityPool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "serviceDate" DATETIME NOT NULL,
    "direction" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "resourceIds" JSONB NOT NULL DEFAULT [],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "holdMinutes" INTEGER NOT NULL,
    "overnightLoadTenths" INTEGER NOT NULL DEFAULT 12,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CapacityOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "poolId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "CapacityOffer_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "CapacityPool" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CapacityOffer_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "FleetVehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CapacityHold" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "poolId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "passengers" INTEGER NOT NULL,
    "exclusive" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CapacityHold_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "CapacityPool" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CapacityHold_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CustomerRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BookingReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "agentId" TEXT,
    "payer" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "received" DECIMAL NOT NULL,
    "net" DECIMAL NOT NULL,
    "margin" DECIMAL NOT NULL,
    "refunded" DECIMAL NOT NULL DEFAULT 0,
    "receivedOn" DATETIME NOT NULL,
    "reference" TEXT NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AgentMarginOffset" (
    "bookingId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptId" TEXT NOT NULL,
    "billId" TEXT,
    "amount" DECIMAL NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BookingCommissionClaim" (
    "bookingId" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PersonalLineDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AgentRefundClaim" (
    "receiptId" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "D1BusinessPartnerPaymentTerm" (
    "ownerId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    PRIMARY KEY ("ownerId", "value")
);

-- CreateTable
CREATE TABLE "D1BusinessPartnerRole" (
    "ownerId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    PRIMARY KEY ("ownerId", "value")
);

-- CreateTable
CREATE TABLE "D1FleetVehiclePurpose" (
    "ownerId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    PRIMARY KEY ("ownerId", "value")
);

-- CreateTable
CREATE TABLE "D1TourBookingSpecialRequirement" (
    "ownerId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    PRIMARY KEY ("ownerId", "value")
);

-- CreateTable
CREATE TABLE "D1WarehouseResponsibilityDeputy" (
    "ownerId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    PRIMARY KEY ("ownerId", "value")
);

-- CreateTable
CREATE TABLE "D1CapacityPoolResource" (
    "ownerId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    PRIMARY KEY ("ownerId", "value")
);

-- CreateTable
CREATE TABLE "D1JsonProjection" (
    "source" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "textValue" TEXT NOT NULL,

    PRIMARY KEY ("source", "ownerId")
);

-- CreateIndex
CREATE INDEX "UserPermissionOverride_userId_idx" ON "UserPermissionOverride"("userId");

-- CreateIndex
CREATE INDEX "UserRole_roleCode_idx" ON "UserRole"("roleCode");

-- CreateIndex
CREATE INDEX "RolePermission_permissionCode_idx" ON "RolePermission"("permissionCode");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_email_key" ON "Invitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "InvitationRole_roleCode_idx" ON "InvitationRole"("roleCode");

-- CreateIndex
CREATE INDEX "AuditEvent_targetId_createdAt_idx" ON "AuditEvent"("targetId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SalesChannel_code_key" ON "SalesChannel"("code");

-- CreateIndex
CREATE INDEX "SalesChannel_status_idx" ON "SalesChannel"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessPartner_code_key" ON "BusinessPartner"("code");

-- CreateIndex
CREATE INDEX "BusinessPartner_status_idx" ON "BusinessPartner"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TourProgram_slug_key" ON "TourProgram"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TourProgram_code_key" ON "TourProgram"("code");

-- CreateIndex
CREATE INDEX "TourProgram_operatorId_idx" ON "TourProgram"("operatorId");

-- CreateIndex
CREATE INDEX "TourProgram_status_idx" ON "TourProgram"("status");

-- CreateIndex
CREATE INDEX "TourProgramContent_tourId_idx" ON "TourProgramContent"("tourId");

-- CreateIndex
CREATE UNIQUE INDEX "TourProgramContent_tourId_locale_key" ON "TourProgramContent"("tourId", "locale");

-- CreateIndex
CREATE INDEX "TourHighlight_tourId_status_sortOrder_idx" ON "TourHighlight"("tourId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "TourItineraryStep_tourId_status_day_sortOrder_idx" ON "TourItineraryStep"("tourId", "status", "day", "sortOrder");

-- CreateIndex
CREATE INDEX "TourFaq_tourId_status_sortOrder_idx" ON "TourFaq"("tourId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "TourMedia_tourId_status_sortOrder_idx" ON "TourMedia"("tourId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "AgentTourPrice_tourId_idx" ON "AgentTourPrice"("tourId");

-- CreateIndex
CREATE INDEX "AgentTourPrice_status_idx" ON "AgentTourPrice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AgentTourPrice_agentId_tourId_agreementId_key" ON "AgentTourPrice"("agentId", "tourId", "agreementId");

-- CreateIndex
CREATE UNIQUE INDEX "PickupLocation_code_key" ON "PickupLocation"("code");

-- CreateIndex
CREATE INDEX "PickupLocation_status_idx" ON "PickupLocation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FleetVehicle_code_key" ON "FleetVehicle"("code");

-- CreateIndex
CREATE INDEX "FleetVehicle_providerId_idx" ON "FleetVehicle"("providerId");

-- CreateIndex
CREATE INDEX "FleetVehicle_status_idx" ON "FleetVehicle"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OperationResource_code_key" ON "OperationResource"("code");

-- CreateIndex
CREATE INDEX "OperationResource_kind_status_idx" ON "OperationResource"("kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StockLocation_code_key" ON "StockLocation"("code");

-- CreateIndex
CREATE INDEX "ProgramComponent_tourId_status_idx" ON "ProgramComponent"("tourId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceSlot_code_key" ON "ServiceSlot"("code");

-- CreateIndex
CREATE INDEX "ServiceSlot_resourceId_startsAt_endsAt_idx" ON "ServiceSlot"("resourceId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "ServiceSlot_vehicleId_startsAt_endsAt_idx" ON "ServiceSlot"("vehicleId", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "OperationTrip_code_key" ON "OperationTrip"("code");

-- CreateIndex
CREATE INDEX "OperationTrip_startsAt_endsAt_idx" ON "OperationTrip"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "TourBooking_code_key" ON "TourBooking"("code");

-- CreateIndex
CREATE INDEX "TourBooking_assigneeId_idx" ON "TourBooking"("assigneeId");

-- CreateIndex
CREATE INDEX "TourBooking_outboundDate_status_idx" ON "TourBooking"("outboundDate", "status");

-- CreateIndex
CREATE INDEX "TourBooking_returnDate_status_idx" ON "TourBooking"("returnDate", "status");

-- CreateIndex
CREATE INDEX "TourBooking_agentId_idx" ON "TourBooking"("agentId");

-- CreateIndex
CREATE INDEX "TourBooking_tripId_status_idx" ON "TourBooking"("tripId", "status");

-- CreateIndex
CREATE INDEX "BookingComponent_resourceId_sourceId_idx" ON "BookingComponent"("resourceId", "sourceId");

-- CreateIndex
CREATE INDEX "BookingComponent_slotId_idx" ON "BookingComponent"("slotId");

-- CreateIndex
CREATE INDEX "BookingComponent_bookingId_idx" ON "BookingComponent"("bookingId");

-- CreateIndex
CREATE INDEX "StockLot_resourceId_expiresOn_idx" ON "StockLot"("resourceId", "expiresOn");

-- CreateIndex
CREATE INDEX "StockBalance_locationId_condition_idx" ON "StockBalance"("locationId", "condition");

-- CreateIndex
CREATE UNIQUE INDEX "StockBalance_lotId_locationId_condition_key" ON "StockBalance"("lotId", "locationId", "condition");

-- CreateIndex
CREATE INDEX "StockIssue_runId_idx" ON "StockIssue"("runId");

-- CreateIndex
CREATE INDEX "StockIssue_bookingLineId_idx" ON "StockIssue"("bookingLineId");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchRun_code_key" ON "DispatchRun"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchRun_slotId_key" ON "DispatchRun"("slotId");

-- CreateIndex
CREATE INDEX "DispatchRun_kind_status_idx" ON "DispatchRun"("kind", "status");

-- CreateIndex
CREATE INDEX "DispatchStaff_userId_idx" ON "DispatchStaff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchStaff_runId_userId_key" ON "DispatchStaff"("runId", "userId");

-- CreateIndex
CREATE INDEX "DispatchAssignment_bookingLineId_idx" ON "DispatchAssignment"("bookingLineId");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchAssignment_runId_bookingLineId_key" ON "DispatchAssignment"("runId", "bookingLineId");

-- CreateIndex
CREATE UNIQUE INDEX "OperationDailySnapshot_serviceDate_kind_revision_key" ON "OperationDailySnapshot"("serviceDate", "kind", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "OperationNotificationOutbox_snapshotId_key" ON "OperationNotificationOutbox"("snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "OperationNotificationOutbox_retryKey_key" ON "OperationNotificationOutbox"("retryKey");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentAsset_objectKey_key" ON "DocumentAsset"("objectKey");

-- CreateIndex
CREATE UNIQUE INDEX "AgentAgreement_code_key" ON "AgentAgreement"("code");

-- CreateIndex
CREATE INDEX "AgentAgreement_agentId_startsOn_endsOn_idx" ON "AgentAgreement"("agentId", "startsOn", "endsOn");

-- CreateIndex
CREATE INDEX "CompanyWorkRecord_kind_status_dueOn_idx" ON "CompanyWorkRecord"("kind", "status", "dueOn");

-- CreateIndex
CREATE INDEX "CompanyWorkRecord_assigneeId_kind_idx" ON "CompanyWorkRecord"("assigneeId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyWorkRecord_parentId_dueOn_key" ON "CompanyWorkRecord"("parentId", "dueOn");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_createdAt_idx" ON "PurchaseOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FinancePersonnelRecord_kind_status_idx" ON "FinancePersonnelRecord"("kind", "status");

-- CreateIndex
CREATE INDEX "FinancePersonnelRecord_employeeId_idx" ON "FinancePersonnelRecord"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceAttachment_objectKey_key" ON "EvidenceAttachment"("objectKey");

-- CreateIndex
CREATE INDEX "EvidenceAttachment_targetKind_targetId_createdAt_idx" ON "EvidenceAttachment"("targetKind", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentBill_agentId_status_idx" ON "AgentBill"("agentId", "status");

-- CreateIndex
CREATE INDEX "AgentBillLine_billId_idx" ON "AgentBillLine"("billId");

-- CreateIndex
CREATE INDEX "AgentPayment_billId_createdAt_idx" ON "AgentPayment"("billId", "createdAt");

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
CREATE UNIQUE INDEX "WebsiteImage_objectKey_key" ON "WebsiteImage"("objectKey");

-- CreateIndex
CREATE INDEX "GuideAssignment_guideId_status_startsAt_idx" ON "GuideAssignment"("guideId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "GuideAssignment_bookingId_idx" ON "GuideAssignment"("bookingId");

-- CreateIndex
CREATE INDEX "BookingAttendance_serviceDate_direction_idx" ON "BookingAttendance"("serviceDate", "direction");

-- CreateIndex
CREATE INDEX "BookingAttendance_financeStatus_idx" ON "BookingAttendance"("financeStatus");

-- CreateIndex
CREATE UNIQUE INDEX "BookingAttendance_bookingId_serviceDate_direction_key" ON "BookingAttendance"("bookingId", "serviceDate", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDayClose_serviceDate_key" ON "ServiceDayClose"("serviceDate");

-- CreateIndex
CREATE UNIQUE INDEX "CapacityPool_code_key" ON "CapacityPool"("code");

-- CreateIndex
CREATE INDEX "CapacityPool_serviceDate_direction_status_idx" ON "CapacityPool"("serviceDate", "direction", "status");

-- CreateIndex
CREATE INDEX "CapacityOffer_vehicleId_idx" ON "CapacityOffer"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "CapacityOffer_poolId_vehicleId_key" ON "CapacityOffer"("poolId", "vehicleId");

-- CreateIndex
CREATE INDEX "CapacityHold_poolId_expiresAt_idx" ON "CapacityHold"("poolId", "expiresAt");

-- CreateIndex
CREATE INDEX "CapacityHold_requestId_idx" ON "CapacityHold"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "CapacityHold_poolId_requestId_key" ON "CapacityHold"("poolId", "requestId");

-- CreateIndex
CREATE INDEX "BookingReceipt_bookingId_idx" ON "BookingReceipt"("bookingId");

-- CreateIndex
CREATE INDEX "BookingReceipt_agentId_idx" ON "BookingReceipt"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentMarginOffset_receiptId_billId_key" ON "AgentMarginOffset"("receiptId", "billId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingCommissionClaim_recordId_key" ON "BookingCommissionClaim"("recordId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalLineDelivery_eventId_userId_mode_key" ON "PersonalLineDelivery"("eventId", "userId", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "AgentRefundClaim_recordId_key" ON "AgentRefundClaim"("recordId");

-- CreateIndex
CREATE INDEX "D1BusinessPartnerPaymentTerm_value_ownerId_idx" ON "D1BusinessPartnerPaymentTerm"("value", "ownerId");

-- CreateIndex
CREATE INDEX "D1BusinessPartnerRole_value_ownerId_idx" ON "D1BusinessPartnerRole"("value", "ownerId");

-- CreateIndex
CREATE INDEX "D1FleetVehiclePurpose_value_ownerId_idx" ON "D1FleetVehiclePurpose"("value", "ownerId");

-- CreateIndex
CREATE INDEX "D1TourBookingSpecialRequirement_value_ownerId_idx" ON "D1TourBookingSpecialRequirement"("value", "ownerId");

-- CreateIndex
CREATE INDEX "D1WarehouseResponsibilityDeputy_value_ownerId_idx" ON "D1WarehouseResponsibilityDeputy"("value", "ownerId");

-- CreateIndex
CREATE INDEX "D1CapacityPoolResource_value_ownerId_idx" ON "D1CapacityPoolResource"("value", "ownerId");

-- CreateIndex
CREATE INDEX "D1JsonProjection_source_textValue_ownerId_idx" ON "D1JsonProjection"("source", "textValue", "ownerId");

