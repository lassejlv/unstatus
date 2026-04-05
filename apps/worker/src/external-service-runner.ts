import { prisma } from "./db.js";
import { checkExternalService, type ExternalStatusResult } from "./checkers/external-status.js";
import { createLimiter } from "./limiter.js";

const DUE_BATCH_SIZE = 50;
const limit = createLimiter(10);
const STATUS_RETENTION_DAYS = 90;

type DueService = {
  id: string;
  name: string;
  statusPageApiUrl: string | null;
  parserType: string;
  parserConfig: unknown;
  pollInterval: number;
  nextFetchAt: Date | null;
};

async function listDueExternalServices(now: Date): Promise<DueService[]> {
  return prisma.$queryRawUnsafe<DueService[]>(
    `SELECT id, name, "statusPageApiUrl", "parserType", "parserConfig", "pollInterval", "nextFetchAt"
     FROM external_service
     WHERE active = true
       AND "statusPageApiUrl" IS NOT NULL
       AND ("nextFetchAt" IS NULL OR "nextFetchAt" <= $1)
     ORDER BY COALESCE("nextFetchAt", to_timestamp(0)) ASC
     LIMIT ${DUE_BATCH_SIZE}`,
    now,
  );
}

async function claimExternalService(service: DueService, now: Date): Promise<boolean> {
  const nextFetchAt = new Date(now.getTime() + service.pollInterval * 1000);

  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `UPDATE external_service
     SET "nextFetchAt" = $2, "updatedAt" = $3
     WHERE id = $1
       AND active = true
       AND ("nextFetchAt" IS NULL OR "nextFetchAt" <= $3)
     RETURNING id`,
    service.id,
    nextFetchAt,
    now,
  );

  return rows.length > 0;
}

async function recordExternalServiceStatus(
  serviceId: string,
  result: ExternalStatusResult,
  now: Date,
  pollInterval: number,
) {
  const nextFetchAt = new Date(now.getTime() + pollInterval * 1000);

  // Update the service's cached status
  await prisma.$executeRawUnsafe(
    `UPDATE external_service
     SET "currentStatus" = $2,
         "currentDescription" = $3,
         "lastFetchedAt" = $4,
         "lastFetchError" = NULL,
         "nextFetchAt" = $5,
         "updatedAt" = $4
     WHERE id = $1`,
    serviceId,
    result.overallStatus,
    result.description,
    now,
    nextFetchAt,
  );

  // Batch upsert all components in a single query
  if (result.components.length > 0) {
    const values = result.components
      .map((_, i) => {
        const o = i * 7;
        return `(gen_random_uuid()::text, $${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7})`;
      })
      .join(", ");

    const params = result.components.flatMap((comp) => [
      serviceId,
      comp.externalId,
      comp.name,
      comp.description,
      comp.groupName,
      comp.status,
      now,
    ]);

    await prisma.$executeRawUnsafe(
      `INSERT INTO external_service_component
         ("id", "externalServiceId", "externalId", "name", "description", "groupName", "currentStatus", "updatedAt")
       VALUES ${values}
       ON CONFLICT ("externalServiceId", "externalId")
       DO UPDATE SET
         "name" = EXCLUDED."name",
         "description" = EXCLUDED."description",
         "groupName" = EXCLUDED."groupName",
         "currentStatus" = EXCLUDED."currentStatus",
         "updatedAt" = EXCLUDED."updatedAt"`,
      ...params,
    );
  }

  // Insert status history row
  const componentStatuses: Record<string, string> = {};
  for (const comp of result.components) {
    componentStatuses[comp.externalId] = comp.status;
  }

  await prisma.externalServiceStatus.create({
    data: {
      externalServiceId: serviceId,
      status: result.overallStatus,
      description: result.description,
      incidentName: result.activeIncidentName,
      componentStatuses,
      checkedAt: now,
    },
  });
}

async function recordExternalServiceError(serviceId: string, error: string, now: Date) {
  await prisma.$executeRawUnsafe(
    `UPDATE external_service
     SET "lastFetchError" = $2, "updatedAt" = $3
     WHERE id = $1`,
    serviceId,
    error,
    now,
  );
}

export async function runExternalServiceChecks() {
  const now = new Date();
  const services = await listDueExternalServices(now);

  if (services.length === 0) return { checked: 0 };

  let checked = 0;

  await Promise.allSettled(
    services.map((service) =>
      limit(async () => {
        const claimed = await claimExternalService(service, now);
        if (!claimed) return;

        try {
          const result = await checkExternalService(
            service.parserType,
            service.statusPageApiUrl!,
            service.parserConfig,
          );
          await recordExternalServiceStatus(service.id, result, now, service.pollInterval);
          checked++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`External service check failed for ${service.name}:`, msg);
          await recordExternalServiceError(service.id, msg, now).catch(() => {});
        }
      }),
    ),
  );

  if (checked > 0) {
    console.log(`Checked ${checked} external service(s)`);
  }

  return { checked };
}

export async function runExternalServiceMaintenance() {
  const cutoff = new Date(Date.now() - STATUS_RETENTION_DAYS * 86_400_000);

  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM external_service_status WHERE "checkedAt" < $1`,
      cutoff,
    );
  } catch (error) {
    console.error("External service maintenance failed:", error);
  }
}
