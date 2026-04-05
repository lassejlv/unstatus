import { runChecks } from "./runner.js";
import { runMonitorPerfMaintenance } from "./db/maintenance.js";
import { runExternalServiceChecks, runExternalServiceMaintenance } from "./external-service-runner.js";
import { processMaintenanceWindows } from "./maintenance.js";

function guardedInterval(name: string, fn: () => Promise<void>, ms: number) {
  let running = false;
  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await fn();
    } catch (e) {
      console.error(`${name} failed:`, e);
    } finally {
      running = false;
    }
  }, ms);
}

export function startSchedulers() {
  const pollInterval = Number(process.env.POLL_INTERVAL ?? 10) * 1000;
  guardedInterval("monitor-checks", runChecks, pollInterval);
  console.log(`Worker polling every ${pollInterval / 1000}s`);

  const maintInterval = 6 * 60 * 60 * 1000;
  runMonitorPerfMaintenance().catch((e) => console.error("Perf maintenance failed:", e));
  guardedInterval("perf-maintenance", async () => {
    await runMonitorPerfMaintenance();
    await runExternalServiceMaintenance();
  }, maintInterval);

  guardedInterval("maintenance-windows", processMaintenanceWindows, 30_000);
  console.log("Maintenance window polling every 30s");

  const extPollInterval = Number(process.env.EXT_POLL_INTERVAL ?? 60) * 1000;
  guardedInterval("external-services", runExternalServiceChecks, extPollInterval);
  console.log(`External service polling every ${extPollInterval / 1000}s`);
}
