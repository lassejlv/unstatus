import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PublicNav } from "@/components/-public-nav";
import {
  CenteredMessage,
  PublicStatusPageView,
} from "@/components/public-status-view";
import { orpc, client } from "@/orpc/client";
import { useCustomDomain } from "@/lib/use-custom-domain";

export const Route = createFileRoute("/")({
  component: RootPage,
});

function RootPage() {
  const customDomain = useCustomDomain();
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
    return <CenteredMessage message="Loading..." />;
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


// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const features = [
  { title: "Uptime monitoring", desc: "HTTP, TCP, and ping checks from multiple regions." },
  { title: "Status pages", desc: "Public pages on your domain with custom branding." },
  { title: "Incident management", desc: "Auto-create incidents with timeline updates." },
  { title: "Alerts", desc: "Discord, email, and webhook notifications." },
  { title: "Dependencies", desc: "Track third-party service status." },
  { title: "API", desc: "Full REST API for automation." },
];

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pt-28 pb-16">
          <h1 className="text-3xl font-medium tracking-tight lg:text-4xl">
            Monitor your services. Alert your team.
          </h1>
          <p className="mt-4 max-w-lg text-muted-foreground">
            Know when your services go down. Tell your users what's happening.
          </p>
          <div className="mt-6 flex items-center gap-4">
            <Link to="/login">
              <Button size="default">Get started</Button>
            </Link>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title}>
                <p className="text-sm">{f.title}</p>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-auto">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-6">
          <span className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} unstatus</span>
          <div className="flex items-center gap-4">
            <Link to="/registry" className="text-xs text-muted-foreground hover:text-foreground">Registry</Link>
            <Link to="/pricing" className="text-xs text-muted-foreground hover:text-foreground">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
