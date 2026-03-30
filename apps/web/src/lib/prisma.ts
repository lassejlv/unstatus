import { createPrismaClient } from "@unstatus/db";
import { env } from "./env";

export const prisma = createPrismaClient(env.DATABASE_URL);
