import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import {
  CenteredMessage,
  PublicIncidentPageView,
} from "@/components/public-status-view";
import { orpc } from "@/orpc/client";

export const Route = createFileRoute("/incidents/$incidentId")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      orpc.publicStatus.getCurrentHostIncident.queryOptions({
        input: { incidentId: params.incidentId },
      }),
    );

    return { incidentId: params.incidentId };
  },
  component: CustomDomainIncidentPage,
});

function CustomDomainIncidentPage() {
  const { incidentId } = Route.useLoaderData();
  const { data } = useQuery(
    orpc.publicStatus.getCurrentHostIncident.queryOptions({
      input: { incidentId },
    }),
  );

  if (!data) {
    return <CenteredMessage message="Incident not found." />;
  }

  return (
    <PublicIncidentPageView
      data={data}
      backLink={
        <Link to="/" className="text-xs text-muted-foreground hover:underline">
          ← {data.pageName}
        </Link>
      }
    />
  );
}
