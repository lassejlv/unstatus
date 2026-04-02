-- AlterTable
ALTER TABLE "monitor" ADD COLUMN     "lastLatency" INTEGER,
ADD COLUMN     "lastMessage" TEXT,
ADD COLUMN     "lastRegion" TEXT,
ADD COLUMN     "lastStatus" TEXT,
ADD COLUMN     "lastStatusCode" INTEGER,
ADD COLUMN     "nextCheckAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "monitor_check_hourly_rollup" (
    "monitorId" TEXT NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "totalChecks" INTEGER NOT NULL,
    "upChecks" INTEGER NOT NULL,
    "downChecks" INTEGER NOT NULL,
    "degradedChecks" INTEGER NOT NULL,
    "latencySum" INTEGER NOT NULL,

    CONSTRAINT "monitor_check_hourly_rollup_pkey" PRIMARY KEY ("monitorId","bucketStart")
);

-- CreateTable
CREATE TABLE "monitor_check_daily_rollup" (
    "monitorId" TEXT NOT NULL,
    "bucketDate" TIMESTAMP(3) NOT NULL,
    "totalChecks" INTEGER NOT NULL,
    "upChecks" INTEGER NOT NULL,
    "downChecks" INTEGER NOT NULL,
    "degradedChecks" INTEGER NOT NULL,
    "latencySum" INTEGER NOT NULL,

    CONSTRAINT "monitor_check_daily_rollup_pkey" PRIMARY KEY ("monitorId","bucketDate")
);

-- CreateIndex
CREATE INDEX "monitor_check_hourly_rollup_bucketStart_idx" ON "monitor_check_hourly_rollup"("bucketStart");

-- CreateIndex
CREATE INDEX "monitor_check_daily_rollup_bucketDate_idx" ON "monitor_check_daily_rollup"("bucketDate");

-- CreateIndex
CREATE INDEX "monitor_active_nextCheckAt_idx" ON "monitor"("active", "nextCheckAt");

-- AddForeignKey
ALTER TABLE "monitor_check_hourly_rollup" ADD CONSTRAINT "monitor_check_hourly_rollup_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitor_check_daily_rollup" ADD CONSTRAINT "monitor_check_daily_rollup_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
