-- AlterTable
ALTER TABLE "status_page" ADD COLUMN     "showDependencies" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "external_service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "website" TEXT,
    "logoUrl" TEXT,
    "category" TEXT NOT NULL,
    "statusPageUrl" TEXT,
    "statusPageApiUrl" TEXT,
    "parserType" TEXT NOT NULL DEFAULT 'atlassian',
    "parserConfig" JSONB,
    "pollInterval" INTEGER NOT NULL DEFAULT 300,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "currentStatus" TEXT,
    "currentDescription" TEXT,
    "lastFetchedAt" TIMESTAMP(3),
    "lastFetchError" TEXT,
    "nextFetchAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_service_component" (
    "id" TEXT NOT NULL,
    "externalServiceId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "groupName" TEXT,
    "currentStatus" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_service_component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_service_status" (
    "id" TEXT NOT NULL,
    "externalServiceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "incidentName" TEXT,
    "componentStatuses" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_service_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitor_dependency" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "externalServiceId" TEXT NOT NULL,
    "externalComponentId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitor_dependency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "external_service_slug_key" ON "external_service"("slug");

-- CreateIndex
CREATE INDEX "external_service_category_idx" ON "external_service"("category");

-- CreateIndex
CREATE INDEX "external_service_active_nextFetchAt_idx" ON "external_service"("active", "nextFetchAt");

-- CreateIndex
CREATE INDEX "external_service_component_externalServiceId_idx" ON "external_service_component"("externalServiceId");

-- CreateIndex
CREATE UNIQUE INDEX "external_service_component_externalServiceId_externalId_key" ON "external_service_component"("externalServiceId", "externalId");

-- CreateIndex
CREATE INDEX "external_service_status_externalServiceId_checkedAt_idx" ON "external_service_status"("externalServiceId", "checkedAt");

-- CreateIndex
CREATE INDEX "monitor_dependency_monitorId_idx" ON "monitor_dependency"("monitorId");

-- CreateIndex
CREATE INDEX "monitor_dependency_externalServiceId_idx" ON "monitor_dependency"("externalServiceId");

-- CreateIndex
CREATE UNIQUE INDEX "monitor_dependency_monitorId_externalServiceId_externalComp_key" ON "monitor_dependency"("monitorId", "externalServiceId", "externalComponentId");

-- AddForeignKey
ALTER TABLE "external_service_component" ADD CONSTRAINT "external_service_component_externalServiceId_fkey" FOREIGN KEY ("externalServiceId") REFERENCES "external_service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_service_status" ADD CONSTRAINT "external_service_status_externalServiceId_fkey" FOREIGN KEY ("externalServiceId") REFERENCES "external_service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitor_dependency" ADD CONSTRAINT "monitor_dependency_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitor_dependency" ADD CONSTRAINT "monitor_dependency_externalServiceId_fkey" FOREIGN KEY ("externalServiceId") REFERENCES "external_service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitor_dependency" ADD CONSTRAINT "monitor_dependency_externalComponentId_fkey" FOREIGN KEY ("externalComponentId") REFERENCES "external_service_component"("id") ON DELETE SET NULL ON UPDATE CASCADE;
