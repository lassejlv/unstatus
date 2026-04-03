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

        {/* Social proof / trust strip */}
        <section className="border-t border-b bg-muted/30">
          <div className="mx-auto max-w-6xl px-6 py-6">
            <div className="flex items-center justify-center gap-12 text-muted-foreground">
              <FadeIn delay={0}>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="font-mono text-sm">99.99% uptime</span>
                </div>
              </FadeIn>
              <FadeIn delay={100}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">10s check intervals</span>
                </div>
              </FadeIn>
              <FadeIn delay={200}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">4 global regions</span>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* Features */}
        <section>
          <div className="mx-auto max-w-6xl px-6 py-24">
            <FadeIn>
              <div className="text-center">
                <h2 className="text-2xl font-semibold tracking-tight lg:text-3xl">
                  Everything you need to sleep at night
                </h2>
                <p className="mt-3 text-muted-foreground">
                  No bloat. No dashboards-within-dashboards. Just the stuff that matters.
                </p>
              </div>
            </FadeIn>
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <FadeIn key={f.title} delay={i * 80}>
                  <div className="group rounded-xl border p-6 transition-all duration-300 hover:border-foreground/20 hover:-translate-y-1 hover:shadow-md">
                    <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/50 transition-colors group-hover:bg-foreground group-hover:text-background">
                      <f.icon className="size-4" />
                    </div>
                    <h3 className="mt-4 font-medium">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {f.desc}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t bg-muted/20">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <FadeIn>
              <div className="text-center">
                <h2 className="text-2xl font-semibold tracking-tight lg:text-3xl">
                  Three steps. Under a minute.
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Seriously, it's embarrassingly easy.
                </p>
              </div>
            </FadeIn>
            <div className="mt-14 grid gap-8 lg:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Paste a URL",
                  desc: "Enter what you want monitored. Pick your check interval. Pick your regions. Done.",
                },
                {
                  step: "02",
                  title: "Get yelled at (nicely)",
                  desc: "When something breaks, you'll know in seconds. Email, Discord, webhook — your call.",
                },
                {
                  step: "03",
                  title: "Look professional",
                  desc: "Ship a status page on your own domain. Your users see transparency. You see fewer support tickets.",
                },
              ].map((s, i) => (
                <FadeIn key={s.step} delay={i * 120}>
                  <div className="flex gap-5">
                    <span className="font-mono text-4xl font-bold text-foreground/10">
                      {s.step}
                    </span>
                    <div>
                      <h3 className="font-semibold">{s.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Registry callout */}
        <section className="border-t">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <FadeIn>
              <div className="rounded-2xl border bg-card p-10 text-center">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Is it you, or is it Vercel?
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
                  Our service registry tracks the real-time status of 25+ popular services.
                  Map your dependency chain and know exactly what's broken — and whose fault it is.
                </p>
                <Link to="/registry" className="mt-6 inline-block">
                  <Button variant="outline" size="lg" className="gap-2">
                    <Globe className="size-4" />
                    Browse service registry
                  </Button>
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t">
          <div className="mx-auto max-w-6xl px-6 py-28 text-center">
            <FadeIn>
              <h2 className="text-3xl font-semibold tracking-tight lg:text-4xl">
                Stop refreshing your logs.
                <br />
                <span className="text-muted-foreground">Let us do it for you.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-md text-lg text-muted-foreground">
                Join teams who'd rather ship features than babysit servers.
              </p>
              <div className="mt-8 flex items-center justify-center gap-3">
                <Link to="/login">
                  <Button size="lg" className="gap-2 h-12 px-8">
                    Start for free <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <img src="/Logo.png" alt="unstatus" className="size-5" />
              <span className="text-xs font-semibold">unstatus</span>
            </Link>
            <span className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/registry"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Registry
            </Link>
            <Link
              to="/pricing"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
