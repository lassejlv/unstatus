-- CreateTable
CREATE TABLE "incident_monitor" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,

    CONSTRAINT "incident_monitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incident_monitor_monitorId_idx" ON "incident_monitor"("monitorId");

-- CreateIndex
CREATE UNIQUE INDEX "incident_monitor_incidentId_monitorId_key" ON "incident_monitor"("incidentId", "monitorId");

-- AddForeignKey
ALTER TABLE "incident_monitor" ADD CONSTRAINT "incident_monitor_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_monitor" ADD CONSTRAINT "incident_monitor_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
