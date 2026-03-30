import { monitorsRouter } from "./monitors";
import { incidentsRouter } from "./incidents";
import { statusPagesRouter } from "./status-pages";
import { publicStatusRouter } from "./public-status";

const router = {
  monitors: monitorsRouter,
  incidents: incidentsRouter,
  statusPages: statusPagesRouter,
  publicStatus: publicStatusRouter,
};

export default router;
