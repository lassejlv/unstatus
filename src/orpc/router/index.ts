import { orgsRouter } from "./orgs";
import { monitorsRouter } from "./monitors";
import { incidentsRouter } from "./incidents";
import { statusPagesRouter } from "./status-pages";

const router = {
  orgs: orgsRouter,
  monitors: monitorsRouter,
  incidents: incidentsRouter,
  statusPages: statusPagesRouter,
};

export default router;
