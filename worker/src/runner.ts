import { prisma } from "./db.js";
import { checkHttp } from "./checkers/http.js";
import { checkTcp } from "./checkers/tcp.js";

const region = process.env.REGION ?? "eu";

export async function runChecks() {
  const monitors = await prisma.monitor.findMany({ where: { active: true } });
  const filtered = monitors.filter((m) => {
    const regions = (m.regions as string[]) ?? [];
    return regions.includes(region);
  });

  const results = await Promise.allSettled(
    filtered.map(async (monitor) => {
      const result =
        monitor.type === "tcp"
          ? await checkTcp(monitor)
          : await checkHttp(monitor);

      await prisma.monitorCheck.create({
        data: {
          monitorId: monitor.id,
          status: result.status,
          latency: result.latency,
          statusCode: result.statusCode,
          message: result.message,
          region,
        },
      });
    }),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  return { total: filtered.length, failed };
}
