import { ORPCError } from "@orpc/server";
import z from "zod";

import { email } from "@/lib/email";
import { env } from "@/lib/env";
import {
  getPublicIncidentPageByDomain,
  getPublicIncidentPageBySlug,
  getPublicStatusPageByDomain,
  getPublicStatusPageBySlug,
} from "@/lib/public-status";
import { prisma } from "@/lib/prisma";
import { publicProcedure } from "@/orpc/procedures";
import { SubscriptionVerifyEmail } from "@unstatus/email";

const subscribeRateLimiter = new Map<string, number[]>();
const SUBSCRIBE_IP_LIMIT = { windowMs: 15 * 60 * 1000, maxRequests: 10 };
const SUBSCRIBE_EMAIL_LIMIT = { windowMs: 60 * 60 * 1000, maxRequests: 3 };

function getRequestIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return headers.get("cf-connecting-ip")
    ?? headers.get("x-real-ip")
    ?? "unknown";
}

function enforceRateLimit(
  key: string,
  config: { windowMs: number; maxRequests: number },
  message: string,
) {
  const now = Date.now();
  const attempts = subscribeRateLimiter.get(key) ?? [];
  const recentAttempts = attempts.filter((attempt) => now - attempt < config.windowMs);

  if (recentAttempts.length >= config.maxRequests) {
    throw new ORPCError("TOO_MANY_REQUESTS", { message });
  }

  recentAttempts.push(now);
  subscribeRateLimiter.set(key, recentAttempts);
}

export const publicStatusRouter = {
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .handler(async ({ input }) => {
      return getPublicStatusPageBySlug(input.slug);
    }),

  getByDomain: publicProcedure
    .input(z.object({ domain: z.string() }))
    .handler(async ({ input }) => {
      return getPublicStatusPageByDomain(input.domain);
    }),

  getIncident: publicProcedure
    .input(z.object({ slug: z.string(), incidentId: z.string() }))
    .handler(async ({ input }) => {
      return getPublicIncidentPageBySlug(input.slug, input.incidentId);
    }),

  getIncidentByDomain: publicProcedure
    .input(z.object({ domain: z.string(), incidentId: z.string() }))
    .handler(async ({ input }) => {
      return getPublicIncidentPageByDomain(input.domain, input.incidentId);
    }),

  subscribe: publicProcedure
    .input(z.object({
      slug: z.string(),
      email: z.string().email(),
      monitorIds: z.array(z.string()).optional(),
    }))
    .handler(async ({ input, context }) => {
      const page = await prisma.statusPage.findUniqueOrThrow({
        where: { slug: input.slug },
        select: { id: true, name: true, slug: true, isPublic: true },
      });

      if (!page.isPublic) {
        throw new ORPCError("NOT_FOUND");
      }

      const normalizedEmail = input.email.trim().toLowerCase();
      const requestIp = getRequestIp(context.headers);

      enforceRateLimit(
        `status-subscribe:ip:${requestIp}`,
        SUBSCRIBE_IP_LIMIT,
        "Too many subscription attempts. Please try again later.",
      );
      enforceRateLimit(
        `status-subscribe:email:${page.id}:${normalizedEmail}`,
        SUBSCRIBE_EMAIL_LIMIT,
        "This email has received too many verification messages. Please try again later.",
      );

      const subscriber = await prisma.statusPageSubscriber.upsert({
        where: {
          statusPageId_email: { statusPageId: page.id, email: normalizedEmail },
        },
        create: {
          statusPageId: page.id,
          email: normalizedEmail,
          monitorIds: input.monitorIds ?? [],
        },
        update: {
          monitorIds: input.monitorIds ?? [],
          verified: false,
        },
      });

      const domain = env.APP_DOMAIN === "localhost" ? "http://localhost:3000" : `https://${env.APP_DOMAIN}`;
      const verifyUrl = `${domain}/status/${page.slug}/verify?token=${subscriber.token}`;
      const unsubscribeUrl = `${domain}/status/${page.slug}/verify?token=${subscriber.token}&action=unsubscribe`;

      await email.emails.send({
        from: env.INBOUND_FROM,
        to: input.email,
        subject: `Confirm your subscription to ${page.name} status updates`,
        react: <SubscriptionVerifyEmail pageName={page.name} verifyUrl={verifyUrl} unsubscribeUrl={unsubscribeUrl} />,
      });

      return { success: true };
    }),

  verifySubscription: publicProcedure
    .input(z.object({ token: z.string() }))
    .handler(async ({ input }) => {
      await prisma.statusPageSubscriber.update({
        where: { token: input.token },
        data: { verified: true },
      });
      return { success: true };
    }),

  unsubscribe: publicProcedure
    .input(z.object({ token: z.string() }))
    .handler(async ({ input }) => {
      await prisma.statusPageSubscriber.delete({
        where: { token: input.token },
      });
      return { success: true };
    }),
};
