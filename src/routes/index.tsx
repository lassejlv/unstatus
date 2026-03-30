import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";

import {
  CenteredMessage,
  PublicStatusPageView,
} from "@/components/public-status-view";
import { getCustomDomainContext } from "@/lib/custom-domain";
import { getSession } from "@/lib/session";
import { orpc } from "@/orpc/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { customHost } = await getCustomDomainContext();
    if (customHost) {
      return;
    }

    const session = await getSession();
    if (session) {
      throw redirect({ to: "/dashboard", search: { tab: "overview" } });
    }

    throw redirect({ to: "/login" });
  },
  component: CustomDomainStatusPage,
});

function CustomDomainStatusPage() {
  const { data, isLoading, error } = useQuery(
    orpc.publicStatus.getByCustomDomain.queryOptions({ input: {} }),
  );

  if (isLoading) {
    return <CenteredMessage message="Loading…" />;
  }

  if (error || !data) {
    return <CenteredMessage message="Status page not found." />;
  }

  return (
    <PublicStatusPageView
      data={data}
      renderIncidentLink={(incident, content) => (
        <Link
          to="/incidents/$incidentId"
          params={{ incidentId: incident.id }}
        >
          {content}
        </Link>
      )}
    />
  );
}
