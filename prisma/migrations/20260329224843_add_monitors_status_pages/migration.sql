-- CreateTable
CREATE TABLE "monitor" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "interval" INTEGER NOT NULL DEFAULT 60,
    "timeout" INTEGER NOT NULL DEFAULT 10,
    "url" TEXT,
    "method" TEXT DEFAULT 'GET',
    "headers" JSONB,
    "body" TEXT,
    "host" TEXT,
    "port" INTEGER,
    "rules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitor_check" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latency" INTEGER NOT NULL,
    "statusCode" INTEGER,
    "message" TEXT,
    "region" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitor_check_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_page" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "customDomain" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "brandColor" TEXT DEFAULT '#000000',
    "headerText" TEXT,
    "footerText" TEXT,
    "customCss" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "status_page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_page_monitor" (
    "id" TEXT NOT NULL,
    "statusPageId" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "displayName" TEXT,

    CONSTRAINT "status_page_monitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'investigating',
    "severity" TEXT NOT NULL DEFAULT 'minor',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_update" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_update_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monitor_organizationId_idx" ON "monitor"("organizationId");

-- CreateIndex
CREATE INDEX "monitor_active_idx" ON "monitor"("active");

-- CreateIndex
CREATE INDEX "monitor_check_monitorId_checkedAt_idx" ON "monitor_check"("monitorId", "checkedAt");

-- CreateIndex
CREATE INDEX "status_page_organizationId_idx" ON "status_page"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "status_page_slug_key" ON "status_page"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "status_page_customDomain_key" ON "status_page"("customDomain");

-- CreateIndex
CREATE INDEX "status_page_monitor_statusPageId_idx" ON "status_page_monitor"("statusPageId");

-- CreateIndex
CREATE UNIQUE INDEX "status_page_monitor_statusPageId_monitorId_key" ON "status_page_monitor"("statusPageId", "monitorId");

-- CreateIndex
CREATE INDEX "incident_monitorId_idx" ON "incident"("monitorId");

-- CreateIndex
CREATE INDEX "incident_status_idx" ON "incident"("status");

-- CreateIndex
CREATE INDEX "incident_update_incidentId_idx" ON "incident_update"("incidentId");

-- AddForeignKey
ALTER TABLE "monitor" ADD CONSTRAINT "monitor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitor_check" ADD CONSTRAINT "monitor_check_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_page" ADD CONSTRAINT "status_page_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_page_monitor" ADD CONSTRAINT "status_page_monitor_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "status_page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_page_monitor" ADD CONSTRAINT "status_page_monitor_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident" ADD CONSTRAINT "incident_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_update" ADD CONSTRAINT "incident_update_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
