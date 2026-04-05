import { ORPCError } from "@orpc/server";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import z from "zod";

function getHostnameFromHeaders(headers: Headers) {
  const forwardedHost = headers.get("x-forwarded-host");
  const host = forwardedHost ?? headers.get("host") ?? "";
  const firstHost = host.split(",")[0]?.trim() ?? "";
  const hostname = firstHost.split(":")[0]?.trim().toLowerCase() ?? "";
  return hostname.endsWith(".") ? hostname.slice(0, -1) : hostname;
}

function isCustomDomain(hostname: string) {
  const appDomain = process.env.APP_DOMAIN;
  if (!appDomain || !hostname) return false;

  return (
    hostname !== appDomain &&
    hostname !== `www.${appDomain}` &&
    hostname !== "localhost" &&
    hostname !== "127.0.0.1"
  );
}

function isNotFoundError(error: unknown) {
  return error instanceof ORPCError && error.code === "NOT_FOUND";
}

export const getPublicStatusPageBySlugServerFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    try {
      const { getPublicStatusPageBySlug } = await import("./public-status");
      return await getPublicStatusPageBySlug(data.slug);
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  });

export const getPublicIncidentPageBySlugServerFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string(), incidentId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const { getPublicIncidentPageBySlug } = await import("./public-status");
      return await getPublicIncidentPageBySlug(data.slug, data.incidentId);
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  });

export const getCurrentCustomDomainStatusPageServerFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const domain = getHostnameFromHeaders(getRequestHeaders());
    if (!isCustomDomain(domain)) {
      return { domain: null, data: null };
    }

    try {
      const { getPublicStatusPageByDomain } = await import("./public-status");

      return {
        domain,
        data: await getPublicStatusPageByDomain(domain),
      };
    } catch (error) {
      if (isNotFoundError(error)) {
        return { domain, data: null };
      }

      throw error;
    }
  });

export const getCurrentCustomDomainIncidentPageServerFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ incidentId: z.string() }))
  .handler(async ({ data }) => {
    const domain = getHostnameFromHeaders(getRequestHeaders());
    if (!isCustomDomain(domain)) {
      return { domain: null, data: null };
    }

    try {
      const { getPublicIncidentPageByDomain } = await import("./public-status");

      return {
        domain,
        data: await getPublicIncidentPageByDomain(domain, data.incidentId),
      };
    } catch (error) {
      if (isNotFoundError(error)) {
        return { domain, data: null };
      }

      throw error;
    }
  });
