import { Polar } from "@polar-sh/sdk";
import { prisma } from "./db.js";

const MONITORS_EVENT = "monitors_count";
const CUSTOM_DOMAINS_EVENT = "custom_domains_count";
const BATCH_SIZE = 100;

type ProOrganization = {
  id: string;
  polarCustomerId: string;
  subscriptionId: string;
  subscriptionPlanName: string | null;
  subscriptionProductId: string | null;
};

type UsageCandidate = {
  organizationId: string;
  subscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
  eventName: typeof MONITORS_EVENT | typeof CUSTOM_DOMAINS_EVENT;
  resourceType: "monitor" | "custom_domain";
  resourceId: string;
  polarExternalId: string;
};

function getPolarClient() {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) return null;

  return new Polar({
    accessToken,
    server: process.env.POLAR_MODE === "production" ? "production" : "sandbox",
  });
}

function isConfiguredProProduct(productId: string | null | undefined) {
  return Boolean(process.env.POLAR_PRO_ID && productId === process.env.POLAR_PRO_ID);
}

function makeExternalId({
  subscriptionId,
  periodStart,
  eventName,
  resourceId,
}: Pick<UsageCandidate, "subscriptionId" | "periodStart" | "eventName" | "resourceId">) {
  const mode = process.env.POLAR_MODE === "production" ? "production" : "sandbox";
  return `unstatus:${mode}:${subscriptionId}:${periodStart.toISOString()}:${eventName}:${resourceId}`;
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function findBillableProOrganizations(): Promise<ProOrganization[]> {
  const orgs = await prisma.organization.findMany({
    where: {
      subscriptionActive: true,
      polarCustomerId: { not: null },
      subscriptionId: { not: null },
    },
    select: {
      id: true,
      polarCustomerId: true,
      subscriptionId: true,
      subscriptionPlanName: true,
      subscriptionProductId: true,
    },
  });

  return orgs.filter((org): org is ProOrganization => {
    return Boolean(org.polarCustomerId && org.subscriptionId);
  });
}

async function buildUsageCandidates(
  organizationId: string,
  subscriptionId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<UsageCandidate[]> {
  const [monitors, customDomainPages] = await Promise.all([
    prisma.monitor.findMany({
      where: { organizationId, active: true },
      select: { id: true },
    }),
    prisma.statusPage.findMany({
      where: { organizationId, customDomain: { not: null } },
      select: { id: true },
    }),
  ]);

  return [
    ...monitors.map((monitor) => ({
      organizationId,
      subscriptionId,
      periodStart,
      periodEnd,
      eventName: MONITORS_EVENT,
      resourceType: "monitor" as const,
      resourceId: monitor.id,
      polarExternalId: makeExternalId({
        subscriptionId,
        periodStart,
        eventName: MONITORS_EVENT,
        resourceId: monitor.id,
      }),
    })),
    ...customDomainPages.map((page) => ({
      organizationId,
      subscriptionId,
      periodStart,
      periodEnd,
      eventName: CUSTOM_DOMAINS_EVENT,
      resourceType: "custom_domain" as const,
      resourceId: page.id,
      polarExternalId: makeExternalId({
        subscriptionId,
        periodStart,
        eventName: CUSTOM_DOMAINS_EVENT,
        resourceId: page.id,
      }),
    })),
  ];
}

async function reportOrganizationUsage(polar: Polar, org: ProOrganization) {
  const subscription = await polar.subscriptions.get({ id: org.subscriptionId });
  if (!isConfiguredProProduct(subscription.productId)) {
    return { reported: 0, skipped: true };
  }

  if (!isConfiguredProProduct(org.subscriptionProductId)) {
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        subscriptionProductId: subscription.productId,
        subscriptionPlanName: subscription.product.name,
      },
    });
  }

  const candidates = await buildUsageCandidates(
    org.id,
    org.subscriptionId,
    subscription.currentPeriodStart,
    subscription.currentPeriodEnd,
  );

  if (candidates.length === 0) {
    return { reported: 0, skipped: false };
  }

  await prisma.polarUsageEvent.createMany({
    data: candidates.map((candidate) => ({
      organizationId: candidate.organizationId,
      subscriptionId: candidate.subscriptionId,
      periodStart: candidate.periodStart,
      periodEnd: candidate.periodEnd,
      eventName: candidate.eventName,
      resourceType: candidate.resourceType,
      resourceId: candidate.resourceId,
      polarExternalId: candidate.polarExternalId,
    })),
    skipDuplicates: true,
  });

  const pending = await prisma.polarUsageEvent.findMany({
    where: {
      polarExternalId: { in: candidates.map((candidate) => candidate.polarExternalId) },
      status: { not: "reported" },
    },
    orderBy: { createdAt: "asc" },
  });

  let reported = 0;

  for (const batch of chunk(pending, BATCH_SIZE)) {
    try {
      await polar.events.ingest({
        events: batch.map((event) => ({
          name: event.eventName,
          externalId: event.polarExternalId,
          customerId: org.polarCustomerId,
          timestamp: new Date(),
          metadata: {
            organizationId: event.organizationId,
            subscriptionId: event.subscriptionId,
            resourceType: event.resourceType,
            resourceId: event.resourceId,
            periodStart: event.periodStart.toISOString(),
            periodEnd: event.periodEnd.toISOString(),
          },
        })),
      });

      await prisma.polarUsageEvent.updateMany({
        where: { id: { in: batch.map((event) => event.id) } },
        data: {
          status: "reported",
          attempts: { increment: 1 },
          reportedAt: new Date(),
          lastError: null,
        },
      });

      reported += batch.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await prisma.polarUsageEvent.updateMany({
        where: { id: { in: batch.map((event) => event.id) } },
        data: {
          status: "failed",
          attempts: { increment: 1 },
          lastError: message.slice(0, 500),
        },
      });
      throw error;
    }
  }

  return { reported, skipped: false };
}

export async function runPolarUsageReconciliation() {
  const polar = getPolarClient();
  if (!polar || !process.env.POLAR_PRO_ID) {
    return { organizations: 0, reported: 0, skipped: true };
  }

  const orgs = await findBillableProOrganizations();
  let reported = 0;
  let skipped = 0;

  for (const org of orgs) {
    try {
      const result = await reportOrganizationUsage(polar, org);
      reported += result.reported;
      if (result.skipped) skipped += 1;
    } catch (error) {
      console.error(`[Polar usage] Failed to report usage for organization ${org.id}:`, error);
    }
  }

  return {
    organizations: orgs.length,
    reported,
    skipped,
  };
}
