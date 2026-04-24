import type { Monitor } from "@unstatus/db";
import { connect, type Socket } from "net";
import { assertPublicHostTarget } from "./egress.js";

const RETRY_DELAY_MS = 1500;

type PingResult = {
  status: string;
  latency: number;
  statusCode: null;
  message: string | null;
  responseHeaders: null;
  responseBody: null;
};

/**
 * Ping check using TCP connect (SYN) to common web ports.
 * We probe 443 first, then 80 if the host explicitly refuses the TLS port.
 */
async function probePort(host: string, port: number, timeoutMs: number) {
  const startedAt = performance.now();

  return new Promise<{ reachable: boolean; refused: boolean; message: string | null; latency: number }>((resolve) => {
    let socket: Socket | null = null;
    let settled = false;

    const finish = (result: { reachable: boolean; refused: boolean; message: string | null }) => {
      if (settled) return;
      settled = true;
      socket?.destroy();
      resolve({
        ...result,
        latency: Math.round(performance.now() - startedAt),
      });
    };

    socket = connect({ host, port });
    socket.setTimeout(timeoutMs);

    socket.once("connect", () => {
      finish({ reachable: true, refused: false, message: null });
    });

    socket.once("timeout", () => {
      finish({ reachable: false, refused: false, message: "Connection timed out" });
    });

    socket.once("error", (err: Error) => {
      const msg = err.message;

      if (msg.includes("ECONNRESET")) {
        finish({ reachable: true, refused: false, message: null });
        return;
      }

      finish({
        reachable: false,
        refused: msg.includes("ECONNREFUSED"),
        message: formatPingError(err),
      });
    });
  });
}

async function performPing(monitor: Monitor): Promise<PingResult> {
  const startedAt = performance.now();
  const rawHost = monitor.host ?? monitor.url ?? "";
  const timeoutMs = monitor.timeout * 1000;

  if (!rawHost) {
    return {
      status: "down",
      latency: 0,
      statusCode: null,
      message: "No host configured",
      responseHeaders: null,
      responseBody: null,
    };
  }

  let host: string;
  try {
    host = await assertPublicHostTarget(rawHost);
  } catch (e) {
    return {
      status: "down",
      latency: Math.round(performance.now() - startedAt),
      statusCode: null,
      message: e instanceof Error ? e.message : "Target host is not allowed",
      responseHeaders: null,
      responseBody: null,
    };
  }

  const primary = await probePort(host, 443, timeoutMs);
  if (primary.reachable) {
    return {
      status: "up",
      latency: primary.latency,
      statusCode: null,
      message: null,
      responseHeaders: null,
      responseBody: null,
    };
  }

  if (primary.refused) {
    const fallback = await probePort(host, 80, timeoutMs);
    return {
      status: fallback.reachable ? "up" : "down",
      latency: fallback.latency,
      statusCode: null,
      message: fallback.reachable ? null : fallback.message,
      responseHeaders: null,
      responseBody: null,
    };
  }

  return {
    status: "down",
    latency: primary.latency,
    statusCode: null,
    message: primary.message,
    responseHeaders: null,
    responseBody: null,
  };
}

export async function checkPing(monitor: Monitor) {
  const first = await performPing(monitor);
  if (first.status !== "down") return first;

  await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  return performPing(monitor);
}

function formatPingError(err: Error): string {
  const msg = err.message;
  if (msg.includes("ENOTFOUND") || msg.includes("getaddrinfo")) return "DNS resolution failed";
  if (msg.includes("ECONNREFUSED")) return "Host refused connection";
  if (msg.includes("ETIMEDOUT")) return "Connection timed out";
  if (msg.includes("EHOSTUNREACH")) return "Host unreachable";
  if (msg.includes("ENETUNREACH")) return "Network unreachable";
  return msg;
}
