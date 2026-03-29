import z from "zod";

export const env = z
  .object({
    DATABASE_PUBLIC_URL: z.url(),
    DATABASE_URL: z.url(),
  })
  .parse(process.env);
