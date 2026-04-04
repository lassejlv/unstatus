import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PublicNav } from "@/components/-public-nav";
import {
  CenteredMessage,
  PublicStatusPageView,
} from "@/components/public-status-view";
import { orpc, client } from "@/orpc/client";
import { useCustomDomain } from "@/lib/use-custom-domain";
import {
  ArrowRight,
  Globe,
  Wifi,
  AlertTriangle,
  Bell,
  MapPin,
  Code2,
  Activity,
} from "lucide-react";

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
// Hooks & utilities
// ---------------------------------------------------------------------------

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}


function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView(0.1);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const features = [
  {
    icon: Wifi,
    title: "Uptime monitoring",
    desc: "HTTP, TCP, and ping checks from EU, US, and Asia. 10-second intervals. Zero false positives.",
  },
  {
    icon: Globe,
    title: "Status pages",
    desc: "Beautiful public pages on your own domain. Custom branding, SSL included. Your users will love it.",
  },
  {
    icon: AlertTriangle,
    title: "Incident management",
    desc: "Auto-create incidents when things break. Timeline updates, severity tracking, post-mortems.",
  },
  {
    icon: Bell,
    title: "Instant alerts",
    desc: "Discord, email, webhooks. Get pinged before your users start tweeting about it.",
  },
  {
    icon: MapPin,
    title: "Dependency chain",
    desc: "Track Vercel, Cloudflare, AWS status. Know if it's you or your infra that's on fire.",
  },
  {
    icon: Code2,
    title: "API-first",
    desc: "Full REST API. Automate everything. Integrate with your CI/CD, Slack, whatever.",
  },
];

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function PulsingDot({ color = "emerald" }: { color?: "emerald" | "amber" }) {
  const bg = color === "emerald" ? "bg-emerald-500" : "bg-amber-500";
  const ring =
    color === "emerald" ? "bg-emerald-500/30" : "bg-amber-500/30";
  return (
    <span className="relative flex size-2">
      <span
        className={`absolute inset-0 rounded-full ${ring} animate-ping`}
      />
      <span className={`relative size-2 rounded-full ${bg}`} />
    </span>
  );
}

function LiveStatusMock() {
  const monitors = [
    { name: "API", path: "/v1/health", latency: 42, up: true },
    { name: "Website", path: "www.acme.com", latency: 118, up: true },
    { name: "Database", path: "db-primary", latency: 8, up: true },
    { name: "CDN", path: "cdn.acme.com", latency: 23, up: true },
    { name: "Auth", path: "auth.acme.com", latency: 67, up: true },
  ];

  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-[420px] rounded-2xl border bg-card shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <Activity className="size-4 text-emerald-500" />
            </div>
            <div>
              <span className="text-sm font-semibold">Acme Inc</span>
              <div className="flex items-center gap-1.5">
                <PulsingDot />
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  All Operational
                </span>
              </div>
            </div>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            99.98%
          </span>
        </div>
      </div>

      {/* Uptime bars */}
      <div className="px-5 pb-4">
        <div className="flex gap-[2px]">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className={`h-7 flex-1 rounded-[2px] ${
                i === 43
                  ? "bg-amber-500"
                  : i === 44
                    ? "bg-amber-500/50"
                    : "bg-emerald-500/60"
              }`}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between">
          <span className="text-[10px] text-muted-foreground">60 days ago</span>
          <span className="text-[10px] text-muted-foreground">Today</span>
        </div>
      </div>

      {/* Monitors */}
      <div className="border-t">
        {monitors.map((m, i) => {
          const jitter = Math.sin(tick + m.name.length) * 12;
          const lat = Math.max(1, Math.round(m.latency + jitter));
          return (
            <div
              key={m.name}
              className={`flex items-center justify-between px-5 py-3 ${i < monitors.length - 1 ? "border-b" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span className={`flex size-2 rounded-full ${m.up ? "bg-emerald-500" : "bg-amber-500"}`} />
                <div className="flex flex-col">
                  <span className="text-xs font-medium">{m.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{m.path}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="font-mono text-xs text-muted-foreground tabular-nums"
                  key={`${m.name}-${tick}`}
                >
                  {lat}ms
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                  UP
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative mx-auto max-w-6xl px-6 pt-28 pb-24 overflow-hidden">
          {/* Subtle grid background */}
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-20%,rgba(120,119,198,0.08),transparent_50%)]" />

          <div className="flex items-center gap-20">
            <div className="min-w-0 flex-1">


              <FadeIn delay={100}>
                <h1 className="text-4xl font-semibold tracking-tight leading-[1.1] lg:text-5xl">
                  Your site just went down.
                  <br />
                  <span className="bg-gradient-to-r from-foreground to-foreground/50 bg-clip-text text-transparent">
                    Who knew first?
                  </span>
                </h1>
              </FadeIn>

              <FadeIn delay={200}>
                <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
                  Uptime monitoring that actually tells you before Twitter does.
                  Status pages your users will trust. Incident management that
                  doesn't make you want to cry.
                </p>
              </FadeIn>

              <FadeIn delay={300}>
                <div className="mt-8 flex items-center gap-3">
                  <Link to="/login">
                    <Button size="lg" className="gap-2 h-12 px-6">
                      Start for free <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                  <Link to="/registry">
                    <Button variant="outline" size="lg" className="h-12 px-6">
                      Browse service registry
                    </Button>
                  </Link>
                </div>
              </FadeIn>
            </div>

            {/* Live status mock */}
            <FadeIn delay={400} className="hidden shrink-0 lg:block">
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-transparent to-blue-500/10 blur-2xl" />
                <div className="relative">
                  <LiveStatusMock />
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Features */}
        <section className="border-t">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <FadeIn key={f.title} delay={i * 80}>
                  <div className="group rounded-lg border p-5 transition-colors hover:border-foreground/20">
                    <f.icon className="size-4 text-muted-foreground" />
                    <h3 className="mt-3 text-sm font-medium">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t">
          <div className="mx-auto max-w-6xl px-6 py-20 text-center">
            <FadeIn>
              <h2 className="text-2xl font-semibold tracking-tight">
                Start monitoring in under a minute
              </h2>
              <p className="mt-3 text-muted-foreground">
                No credit card required. Free forever for small projects.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Link to="/login">
                  <Button size="lg" className="gap-2">
                    Get started <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button variant="outline" size="lg">
                    See pricing
                  </Button>
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
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
