import type { Monitor } from "@unstatus/db";
import { exec } from "child_process";

export async function checkPing(monitor: Monitor) {
  const start = performance.now();
  const host = monitor.host!;
  const timeout = monitor.timeout;

  return new Promise<{
    status: string;
    latency: number;
    statusCode: null;
    message: string | null;
    responseHeaders: null;
    responseBody: null;
  }>((resolve) => {
    exec(
      `ping -c 1 -W ${timeout} ${host}`,
      { timeout: (timeout + 1) * 1000 },
      (error, stdout) => {
        if (error) {
          resolve({
            status: "down",
            latency: Math.round(performance.now() - start),
            statusCode: null,
            message: error.message.split("\n")[0] ?? "Ping failed",
            responseHeaders: null,
            responseBody: null,
          });
          return;
        }

        // Parse round-trip time from ping output (e.g., "time=12.3 ms")
        const match = stdout.match(/time[=<]([\d.]+)\s*ms/);
        const latency = match ? Math.round(parseFloat(match[1])) : Math.round(performance.now() - start);

        resolve({
          status: "up",
          latency,
          statusCode: null,
          message: null,
          responseHeaders: null,
          responseBody: null,
        });
      },
    );
  });
}
