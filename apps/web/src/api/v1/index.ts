import { Hono } from "hono";
import { errorHandler } from "../middleware/error-handler";
import { apiKeyAuth } from "../middleware/auth";
import { apiAudit } from "../middleware/audit";
import { rateLimit } from "../middleware/rate-limit";
import { monitorsRoutes } from "./monitors";
import { incidentsRoutes } from "./incidents";
import { statusPagesRoutes } from "./status-pages";
import { maintenanceRoutes } from "./maintenance";
import { notificationsRoutes } from "./notifications";
import { organizationRoutes } from "./organization";

const app = new Hono().basePath("/api/v1");

app.use("*", errorHandler);
app.use("*", apiKeyAuth);
app.use("*", rateLimit);
app.use("*", apiAudit);

app.route("/monitors", monitorsRoutes);
app.route("/incidents", incidentsRoutes);
app.route("/status-pages", statusPagesRoutes);
app.route("/maintenance", maintenanceRoutes);
app.route("/notifications", notificationsRoutes);
app.route("/organization", organizationRoutes);

export { app as apiV1 };
