-- CreateTable
CREATE TABLE "notification_channel" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "onIncidentCreated" BOOLEAN NOT NULL DEFAULT true,
    "onIncidentResolved" BOOLEAN NOT NULL DEFAULT true,
    "onIncidentUpdated" BOOLEAN NOT NULL DEFAULT true,
    "onMonitorDown" BOOLEAN NOT NULL DEFAULT true,
    "onMonitorRecovered" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_channel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_channel_organizationId_idx" ON "notification_channel"("organizationId");

-- AddForeignKey
ALTER TABLE "notification_channel" ADD CONSTRAINT "notification_channel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
