-- CreateIndex
CREATE INDEX "monitor_regions_idx" ON "monitor" USING GIN ("regions" jsonb_path_ops);

-- CreateIndex
CREATE INDEX "monitor_check_checkedAt_idx" ON "monitor_check"("checkedAt");
