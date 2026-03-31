import { monitorsRouter } from "./monitors";
import { incidentsRouter } from "./incidents";
import { statusPagesRouter } from "./status-pages";
import { publicStatusRouter } from "./public-status";
import { notificationsRouter } from "./notifications";
import { billingRouter } from "./billing";
import { subscribersRouter } from "./subscribers";

const router = {
  monitors: monitorsRouter,
  incidents: incidentsRouter,
  statusPages: statusPagesRouter,
  publicStatus: publicStatusRouter,
  notifications: notificationsRouter,
  billing: billingRouter,
  subscribers: subscribersRouter,
};

export default router;
