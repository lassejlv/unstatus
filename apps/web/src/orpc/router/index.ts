import { monitorsRouter } from "./monitors";
import { incidentsRouter } from "./incidents";
import { statusPagesRouter } from "./status-pages";
import { publicStatusRouter } from "./public-status";
import { notificationsRouter } from "./notifications";

const router = {
  monitors: monitorsRouter,
  incidents: incidentsRouter,
  statusPages: statusPagesRouter,
  publicStatus: publicStatusRouter,
  notifications: notificationsRouter,
};

export default router;
