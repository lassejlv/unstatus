import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PublicNav } from "@/components/-public-nav";
import {
  CenteredMessage,
  PublicStatusPageView,
} from "@/components/public-status-view";
import { Hero } from "@/components/ui/animated-hero";
import { Features } from "@/components/ui/features-2";
import { useCustomDomain } from "@/lib/use-custom-domain";
import { orpc, client } from "@/orpc/client";

export const Route = createFileRoute("/")({
  component: RootPage,
});

function RootPage() {
  const customDomain = useCustomDomain();

  // undefined = SSR (custom domains enabled but hostname unknown yet)
  if (customDomain === undefined) return null;

  if (customDomain) {
    return <CustomDomainStatusPage domain={customDomain} />;
  }

  return <HomePage />;
}

function CustomDomainStatusPage({ domain }: { domain: string }) {
  const { data, isLoading, error } = useQuery(
    orpc.publicStatus.getByDomain.queryOptions({ input: { domain } }),
  );

  const subscribeMut = useMutation({
    mutationFn: (input: { email: string; monitorIds?: string[] }) =>
      client.publicStatus.subscribe({ slug: data?.slug ?? "", ...input }),
  });

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
        <Link to="/$incidentId" params={{ incidentId: incident.id }}>
          {content}
        </Link>
      )}
      onSubscribe={async (email, monitorIds) => {
        await subscribeMut.mutateAsync({ email, monitorIds });
      }}
      subscribeLoading={subscribeMut.isPending}
      subscribeSuccess={subscribeMut.isSuccess}
      subscribeError={subscribeMut.error?.message}
    />
  );
}

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicNav />

      <main className="flex-1">
        {/* Hero */}
        <Hero />

        {/* Features */}
        <Features />
      </main>

      <footer className="mt-auto">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-6">
          <span className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} unstatus</span>
          <div className="flex items-center gap-4">
            <a href="/docs" className="text-xs text-muted-foreground hover:text-foreground">Docs</a>
            <Link to="/registry" className="text-xs text-muted-foreground hover:text-foreground">Registry</Link>
            <Link to="/pricing" className="text-xs text-muted-foreground hover:text-foreground">Pricing</Link>
            <Link to="/legal" className="text-xs text-muted-foreground hover:text-foreground">Legal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
