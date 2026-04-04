import { monitorsRouter } from "./monitors";
import { incidentsRouter } from "./incidents";
import { statusPagesRouter } from "./status-pages";
import { publicStatusRouter } from "./public-status";
import { notificationsRouter } from "./notifications";
import { billingRouter } from "./billing";
import { subscribersRouter } from "./subscribers";
import { registryRouter } from "./registry";
import { dependenciesRouter } from "./dependencies";
import { maintenanceRouter } from "./maintenance";
import { apiKeysRouter } from "./api-keys";

const router = {
  monitors: monitorsRouter,
  incidents: incidentsRouter,
  statusPages: statusPagesRouter,
  publicStatus: publicStatusRouter,
  notifications: notificationsRouter,
  billing: billingRouter,
  subscribers: subscribersRouter,
  registry: registryRouter,
  dependencies: dependenciesRouter,
  maintenance: maintenanceRouter,
  apiKeys: apiKeysRouter,
};

export default router;
