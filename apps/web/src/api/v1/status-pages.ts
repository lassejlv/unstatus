import { Hono } from "hono";
import z from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "../middleware/auth";
import { ApiError, success, paginated, parsePagination, parseJsonBody } from "../helpers";

const app = new Hono();
const statusPageFields = {
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  customDomain: z.string().trim().min(1).nullable().optional(),
  isPublic: z.boolean().optional(),
  logoUrl: z.string().trim().min(1).nullable().optional(),
  faviconUrl: z.string().trim().min(1).nullable().optional(),
  brandColor: z.string().trim().min(1).optional(),
  headerText: z.string().nullable().optional(),
  footerText: z.string().nullable().optional(),
  customCss: z.string().nullable().optional(),
  customJs: z.string().nullable().optional(),
  showResponseTimes: z.boolean().optional(),
  showDependencies: z.boolean().optional(),
};

const createStatusPageBodySchema = z.object({
  ...statusPageFields,
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
});

const updateStatusPageBodySchema = z.object(statusPageFields).partial();

// GET /status-pages - List status pages
app.get("/", async (c) => {
  const { organizationId } = getApiContext(c);
  const { limit, offset } = parsePagination(c);

  const where = { organizationId };
  const [items, total] = await Promise.all([
    prisma.statusPage.findMany({
      where,
      include: {
        monitors: {
          include: { monitor: { select: { id: true, name: true } } },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.statusPage.count({ where }),
  ]);

  return paginated(c, items, total, limit, offset);
});

// GET /status-pages/:id - Get status page
app.get("/:id", async (c) => {
  const { organizationId } = getApiContext(c);
  const id = c.req.param("id");

  const statusPage = await prisma.statusPage.findUnique({
    where: { id },
    include: {
      monitors: {
        include: { monitor: { select: { id: true, name: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!statusPage || statusPage.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Status page not found", 404);
  }

  return success(c, statusPage);
});

// POST /status-pages - Create status page
app.post("/", async (c) => {
  const { organizationId } = getApiContext(c);
  const body = await parseJsonBody(c, createStatusPageBodySchema);
  const { name, slug } = body;

  const statusPage = await prisma.statusPage.create({
    data: {
      organizationId,
      name,
      slug,
      customDomain: body.customDomain ?? null,
      isPublic: body.isPublic ?? true,
      logoUrl: body.logoUrl ?? null,
      faviconUrl: body.faviconUrl ?? null,
      brandColor: body.brandColor ?? "#000000",
      headerText: body.headerText ?? null,
      footerText: body.footerText ?? null,
      customCss: body.customCss ?? null,
      customJs: body.customJs ?? null,
      showResponseTimes: body.showResponseTimes ?? true,
      showDependencies: body.showDependencies ?? false,
    },
  });

  return success(c, statusPage, 201);
});

// PATCH /status-pages/:id - Update status page
app.patch("/:id", async (c) => {
  const { organizationId } = getApiContext(c);

  const id = c.req.param("id");
  const statusPage = await prisma.statusPage.findUnique({ where: { id } });
  if (!statusPage || statusPage.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Status page not found", 404);
  }

  const body = await parseJsonBody(c, updateStatusPageBodySchema);
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.slug !== undefined) data.slug = body.slug;
  if (body.customDomain !== undefined) data.customDomain = body.customDomain;
  if (body.isPublic !== undefined) data.isPublic = body.isPublic;
  if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl;
  if (body.faviconUrl !== undefined) data.faviconUrl = body.faviconUrl;
  if (body.brandColor !== undefined) data.brandColor = body.brandColor;
  if (body.headerText !== undefined) data.headerText = body.headerText;
  if (body.footerText !== undefined) data.footerText = body.footerText;
  if (body.customCss !== undefined) data.customCss = body.customCss;
  if (body.customJs !== undefined) data.customJs = body.customJs;
  if (body.showResponseTimes !== undefined) data.showResponseTimes = body.showResponseTimes;
  if (body.showDependencies !== undefined) data.showDependencies = body.showDependencies;

  const updated = await prisma.statusPage.update({ where: { id }, data });
  return success(c, updated);
});

// DELETE /status-pages/:id - Delete status page
app.delete("/:id", async (c) => {
  const { organizationId } = getApiContext(c);

  const id = c.req.param("id");
  const statusPage = await prisma.statusPage.findUnique({ where: { id } });
  if (!statusPage || statusPage.organizationId !== organizationId) {
    throw new ApiError("NOT_FOUND", "Status page not found", 404);
  }

  await prisma.statusPage.delete({ where: { id } });
  return success(c, { deleted: true });
});

export { app as statusPagesRoutes };
