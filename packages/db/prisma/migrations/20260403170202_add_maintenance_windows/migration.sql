-- AlterTable
ALTER TABLE "notification_channel" ADD COLUMN     "onMaintenanceCompleted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "onMaintenanceScheduled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "onMaintenanceStarted" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "maintenance_window" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_window_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_window_monitor" (
    "id" TEXT NOT NULL,
    "maintenanceWindowId" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,

    CONSTRAINT "maintenance_window_monitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "maintenance_window_organizationId_idx" ON "maintenance_window"("organizationId");

-- CreateIndex
CREATE INDEX "maintenance_window_status_idx" ON "maintenance_window"("status");

-- CreateIndex
CREATE INDEX "maintenance_window_status_scheduledStart_idx" ON "maintenance_window"("status", "scheduledStart");

-- CreateIndex
CREATE INDEX "maintenance_window_monitor_monitorId_idx" ON "maintenance_window_monitor"("monitorId");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_window_monitor_maintenanceWindowId_monitorId_key" ON "maintenance_window_monitor"("maintenanceWindowId", "monitorId");

-- AddForeignKey
ALTER TABLE "maintenance_window" ADD CONSTRAINT "maintenance_window_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_window_monitor" ADD CONSTRAINT "maintenance_window_monitor_maintenanceWindowId_fkey" FOREIGN KEY ("maintenanceWindowId") REFERENCES "maintenance_window"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_window_monitor" ADD CONSTRAINT "maintenance_window_monitor_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
