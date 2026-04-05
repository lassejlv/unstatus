import { Link, createFileRoute } from "@tanstack/react-router";

import {
  CenteredMessage,
  PublicIncidentPageView,
} from "@/components/public-status-view";
import { getPublicIncidentPageBySlugServerFn } from "@/lib/public-status";

export const Route = createFileRoute("/status/$slug/$incidentId")({
  loader: async ({ params }) =>
    getPublicIncidentPageBySlugServerFn({
      data: { slug: params.slug, incidentId: params.incidentId },
    }),
  component: PublicIncidentPage,
});

function PublicIncidentPage() {
  const { slug } = Route.useParams();
  const data = Route.useLoaderData();

  if (!data) {
    return <CenteredMessage message="Incident not found." />;
  }

  return (
    <PublicIncidentPageView
      data={data}
      backLink={
        <Link
          to="/status/$slug"
          params={{ slug }}
          className="text-xs text-muted-foreground hover:underline"
        >
          ← {data.pageName}
        </Link>
      }
    />
  );
}
