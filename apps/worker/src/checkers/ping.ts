import type { Monitor } from "@unstatus/db";
import { connect, type Socket } from "net";

const RETRY_DELAY_MS = 1500;

/**
 * Ping check using TCP connect (SYN) to port 80 or 443.
 * ICMP ping is blocked in most container environments (Railway, Docker, etc.),
 * so we measure TCP connection handshake time instead — this is what most
 * uptime monitoring services do.
 */
async function performPing(monitor: Monitor) {
  const start = performance.now();
  const rawHost = (monitor.host ?? monitor.url ?? "").replace(/^https?:\/\//, "").replace(/[:/].*$/, "").trim();
  const timeout = monitor.timeout * 1000;

  // Try 443 first (most services use HTTPS), fall back to 80
  const port = 443;

  return new Promise<{
    status: string;
    latency: number;
    statusCode: null;
    message: string | null;
    responseHeaders: null;
    responseBody: null;
  }>((resolve) => {
    if (!rawHost) {
      resolve({
        status: "down",
        latency: 0,
        statusCode: null,
        message: "No host configured",
        responseHeaders: null,
        responseBody: null,
      });
      return;
    }

    let settled = false;
    const finish = (status: string, message: string | null) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      clearTimeout(timer);
      resolve({
        status,
        latency: Math.round(performance.now() - start),
        statusCode: null,
        message,
        responseHeaders: null,
        responseBody: null,
      });
    };

    const socket: Socket = connect({ host: rawHost, port, timeout }, () => {
      finish("up", null);
    });

    const timer = setTimeout(() => {
      finish("down", "Connection timed out");
    }, timeout);

    socket.on("error", (err: Error) => {
      const msg = err.message;
      // Connection was established then reset — host is reachable
      if (msg.includes("ECONNRESET")) {
        finish("up", null);
        return;
      }
      if (msg.includes("ECONNREFUSED")) {
        // Port refused but host is reachable — try port 80
        socket.destroy();
        if (port === 443 && !settled) {
          const socket2: Socket = connect({ host: rawHost, port: 80, timeout }, () => {
            finish("up", null);
          });
          socket2.on("error", (err2: Error) => {
            if (err2.message.includes("ECONNRESET")) {
              finish("up", null);
            } else {
              finish("down", formatPingError(err2));
            }
          });
          return;
        }
      }
      finish("down", formatPingError(err));
    });
  });
}

export async function checkPing(monitor: Monitor) {
  const first = await performPing(monitor);
  if (first.status !== "down") return first;

  // Retry once to avoid false positives
  await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  return performPing(monitor);
}

function formatPingError(err: Error): string {
  const msg = err.message;
  if (msg.includes("ENOTFOUND") || msg.includes("getaddrinfo")) return `DNS resolution failed`;
  if (msg.includes("ECONNREFUSED")) return "Host refused connection";
  if (msg.includes("ETIMEDOUT")) return "Connection timed out";
  if (msg.includes("EHOSTUNREACH")) return "Host unreachable";
  if (msg.includes("ENETUNREACH")) return "Network unreachable";
  return msg;
}
