import { runChecks } from "./runner.js";
import { runMonitorPerfMaintenance } from "./db/maintenance.js";
import { runExternalServiceChecks, runExternalServiceMaintenance } from "./external-service-runner.js";
import { processMaintenanceWindows } from "./maintenance.js";
import { runPolarUsageReconciliation } from "./polar-usage.js";

type SchedulerState = {
  name: string;
  intervalMs: number;
  timeoutMs: number;
  running: boolean;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastDurationMs: number | null;
  lastError: string | null;
  lastResult: string | null;
};

const schedulerStates = new Map<string, SchedulerState>();

function getSchedulerState(name: string, intervalMs: number, timeoutMs: number): SchedulerState {
  const existing = schedulerStates.get(name);
  if (existing) return existing;

  const state: SchedulerState = {
    name,
    intervalMs,
    timeoutMs,
    running: false,
    lastStartedAt: null,
    lastFinishedAt: null,
    lastDurationMs: null,
    lastError: null,
    lastResult: null,
  };

  schedulerStates.set(name, state);
  return state;
}

function formatError(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function formatResult(result: unknown) {
  if (result == null) return null;
  if (typeof result === "string") return result;
  if (typeof result === "number" || typeof result === "boolean") return String(result);

  try {
    return JSON.stringify(result);
  } catch {
    return "[unserializable result]";
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, name: string) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${name} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function startGuardedLoop(
  name: string,
  fn: () => Promise<unknown>,
  intervalMs: number,
  timeoutMs: number,
) {
  const state = getSchedulerState(name, intervalMs, timeoutMs);

  const run = async () => {
    const startedAt = Date.now();
    state.running = true;
    state.lastStartedAt = new Date(startedAt).toISOString();
    state.lastError = null;

    let shouldExit = false;

    try {
      const result = await withTimeout(fn(), timeoutMs, name);
      state.lastResult = formatResult(result);
    } catch (error) {
      state.lastError = formatError(error);
      console.error(`${name} failed:`, error);

      if (state.lastError.includes("timed out")) {
        shouldExit = true;
      }
    } finally {
      state.running = false;
      state.lastFinishedAt = new Date().toISOString();
      state.lastDurationMs = Date.now() - startedAt;
    }

    if (shouldExit) {
      console.error(`${name} appears stuck. Exiting so the platform can restart the worker.`);
      process.exit(1);
    }

    setTimeout(run, intervalMs);
  };

  setTimeout(run, 0);
}

export function getSchedulerHealth() {
  const schedulers = Array.from(schedulerStates.values()).map((state) => {
    const stalled = state.running && state.lastStartedAt != null
      && Date.now() - new Date(state.lastStartedAt).getTime() > state.timeoutMs;

    return {
      ...state,
      stalled,
    };
  });

  const unhealthy = schedulers.some((state) => state.stalled);

  return {
    status: unhealthy ? "degraded" : "ok",
    schedulers,
  };
}

export function startSchedulers() {
  const pollInterval = Number(process.env.POLL_INTERVAL ?? 10) * 1000;
  const monitorTimeout = Number(process.env.MONITOR_RUN_TIMEOUT_SEC ?? 900) * 1000;
  startGuardedLoop("monitor-checks", runChecks, pollInterval, monitorTimeout);
  console.log(`Worker polling every ${pollInterval / 1000}s (timeout ${monitorTimeout / 1000}s)`);

  const maintInterval = 6 * 60 * 60 * 1000;
  const maintenanceTimeout = Number(process.env.MAINTENANCE_RUN_TIMEOUT_SEC ?? 300) * 1000;
  runMonitorPerfMaintenance().catch((e) => console.error("Perf maintenance failed:", e));
  startGuardedLoop("perf-maintenance", async () => {
    await runMonitorPerfMaintenance();
    await runExternalServiceMaintenance();
  }, maintInterval, maintenanceTimeout);

  const maintenanceWindowInterval = 30_000;
  const maintenanceWindowTimeout = Number(process.env.MAINTENANCE_WINDOW_TIMEOUT_SEC ?? 120) * 1000;
  startGuardedLoop("maintenance-windows", processMaintenanceWindows, maintenanceWindowInterval, maintenanceWindowTimeout);
  console.log(
    `Maintenance window polling every ${maintenanceWindowInterval / 1000}s (timeout ${maintenanceWindowTimeout / 1000}s)`,
  );

  const extPollInterval = Number(process.env.EXT_POLL_INTERVAL ?? 60) * 1000;
  const extTimeout = Number(process.env.EXTERNAL_RUN_TIMEOUT_SEC ?? 180) * 1000;
  startGuardedLoop("external-services", runExternalServiceChecks, extPollInterval, extTimeout);
  console.log(`External service polling every ${extPollInterval / 1000}s (timeout ${extTimeout / 1000}s)`);

  const polarUsageInterval = Number(process.env.POLAR_USAGE_SYNC_INTERVAL_SEC ?? 21600) * 1000;
  const polarUsageTimeout = Number(process.env.POLAR_USAGE_SYNC_TIMEOUT_SEC ?? 300) * 1000;
  startGuardedLoop("polar-usage", runPolarUsageReconciliation, polarUsageInterval, polarUsageTimeout);
  console.log(`Polar usage sync every ${polarUsageInterval / 1000}s (timeout ${polarUsageTimeout / 1000}s)`);
}
