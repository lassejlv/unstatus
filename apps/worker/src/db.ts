import { createPrismaClient } from "@unstatus/db";

export const prisma = createPrismaClient(process.env.DATABASE_URL!);
