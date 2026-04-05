import z from "zod";

export const env = z
  .object({
    DATABASE_PUBLIC_URL: z.url(),
    DATABASE_URL: z.url(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    POLAR_MODE: z.enum(["sandbox", "production"]).default("sandbox"),
    POLAR_ACCESS_TOKEN: z.string(),
    POLAR_WEBHOOK_SECRET: z.string(),
    POLAR_PRO_ID: z.string(),
    POLAR_SCALE_ID: z.string(),
    WORKER_URL: z.url().optional(),
    WORKER_SECRET: z.string().optional(),
    WORKER_EU_URL: z.url().optional(),
    WORKER_US_URL: z.url().optional(),
    WORKER_ASIA_URL: z.url().optional(),
    INBOUND_API_KEY: z.string(),
    INBOUND_FROM: z.string(),
    APP_DOMAIN: z.string().default("localhost"),
  })
  .parse(process.env);
