-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "subscriptionProductId" TEXT;

-- CreateTable
CREATE TABLE "polar_usage_event" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "eventName" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "polarExternalId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "reportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "polar_usage_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "polar_usage_event_polarExternalId_key" ON "polar_usage_event"("polarExternalId");

-- CreateIndex
CREATE INDEX "polar_usage_event_organizationId_periodStart_idx" ON "polar_usage_event"("organizationId", "periodStart");

-- CreateIndex
CREATE INDEX "polar_usage_event_subscriptionId_eventName_idx" ON "polar_usage_event"("subscriptionId", "eventName");

-- AddForeignKey
ALTER TABLE "polar_usage_event" ADD CONSTRAINT "polar_usage_event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
