import type { Monitor } from "../../src/generated/prisma/client.js";
import { connect } from "net";

export async function checkTcp(monitor: Monitor) {
  const start = performance.now();
  return new Promise<{
    status: string;
    latency: number;
    statusCode: null;
    message: string | null;
    responseHeaders: null;
    responseBody: null;
  }>((resolve) => {
    const socket = connect(
      { host: monitor.host!, port: monitor.port!, timeout: monitor.timeout * 1000 },
      () => {
        socket.destroy();
        resolve({
          status: "up",
          latency: Math.round(performance.now() - start),
          statusCode: null,
          message: null,
          responseHeaders: null,
          responseBody: null,
        });
      },
    );
    socket.on("error", (e) => {
      socket.destroy();
      resolve({
        status: "down",
        latency: Math.round(performance.now() - start),
        statusCode: null,
        message: e.message,
        responseHeaders: null,
        responseBody: null,
      });
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve({
        status: "down",
        latency: Math.round(performance.now() - start),
        statusCode: null,
        message: "Connection timed out",
        responseHeaders: null,
        responseBody: null,
      });
    });
  });
}
