import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
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

function AnimatedCounter({
  target,
  suffix = "",
  duration = 2000,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const [value, setValue] = useState(0);
  const { ref, inView } = useInView();

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [inView, target, duration]);

  return (
    <span ref={ref} className="font-mono tabular-nums">
      {value.toLocaleString()}
      {suffix}
    </span>
  );
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
    desc: "HTTP, TCP, and ping checks from multiple regions. Get alerted the second something goes wrong.",
  },
  {
    icon: Globe,
    title: "Status pages",
    desc: "Public status pages with custom domains and branding. SSL provisioned automatically.",
  },
  {
    icon: AlertTriangle,
    title: "Incident management",
    desc: "Track incidents with updates and timelines. Auto-create incidents when monitors go down.",
  },
  {
    icon: Bell,
    title: "Notifications",
    desc: "Email and Discord alerts. Webhook support for integrating with your own tools.",
  },
  {
    icon: MapPin,
    title: "Multi-region",
    desc: "Run checks from EU, US, and Asia. Avoid false positives from a single point of failure.",
  },
  {
    icon: Code2,
    title: "API access",
    desc: "Full REST API for automating your monitoring setup. Integrate with your existing workflows.",
  },
];

const stats = [
  { value: 99.99, suffix: "%", label: "Uptime SLA" },
  { value: 30, suffix: "s", label: "Check interval" },
  { value: 4, suffix: "", label: "Global regions" },
  { value: 5000, suffix: "+", label: "Checks / day" },
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
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/Logo.png" alt="unstatus" className="size-7" />
            <span className="text-sm font-semibold tracking-tight">
              unstatus
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              to="/pricing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative mx-auto max-w-6xl px-6 pt-28 pb-24">
          <div className="flex items-center gap-20">
            <div className="min-w-0 flex-1">
              <FadeIn>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1">
                  <Activity className="size-3 text-emerald-500" />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    Monitoring active
                  </span>
                  <PulsingDot />
                </div>
              </FadeIn>

              <FadeIn delay={100}>
                <h1 className="text-4xl font-semibold tracking-tight leading-[1.15] lg:text-5xl">
                  Know when it breaks.
                  <br />
                  <span className="text-muted-foreground">
                    Before your users do.
                  </span>
                </h1>
              </FadeIn>

              <FadeIn delay={200}>
                <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
                  Uptime monitoring, status pages, and incident management.
                  Simple, fast, and reliable.
                </p>
              </FadeIn>

              <FadeIn delay={300}>
                <div className="mt-8 flex items-center gap-3">
                  <Link to="/login">
                    <Button size="lg" className="gap-2">
                      Start for free <ArrowRight className="size-4" />
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

            {/* Live status mock */}
            <FadeIn delay={400} className="hidden shrink-0 lg:block">
              <LiveStatusMock />
            </FadeIn>
          </div>
        </section>

        {/* Stats */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {stats.map((s, i) => (
              <FadeIn key={s.label} delay={i * 100}>
                <div className="rounded-lg border bg-card p-5 text-center">
                  <div className="text-3xl font-semibold tracking-tight">
                    <AnimatedCounter
                      target={s.value}
                      suffix={s.suffix}
                    />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="border-t">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <FadeIn>
              <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Everything you need
              </h2>
            </FadeIn>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <FadeIn key={f.title} delay={i * 80}>
                  <div className="group rounded-lg border p-5 transition-all duration-300 hover:border-foreground/20 hover:-translate-y-0.5 hover:shadow-sm">
                    <div className="flex size-9 items-center justify-center rounded-md border bg-muted/50 transition-colors group-hover:bg-muted">
                      <f.icon className="size-4 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 text-sm font-medium">{f.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
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
          <div className="mx-auto max-w-6xl px-6 py-20">
            <FadeIn>
              <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                How it works
              </h2>
            </FadeIn>
            <div className="mt-10 grid gap-8 lg:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Add a monitor",
                  desc: "Enter a URL or IP. Pick your check interval and regions. That's it.",
                },
                {
                  step: "02",
                  title: "Get notified instantly",
                  desc: "When something goes down, you'll know within seconds via email or Discord.",
                },
                {
                  step: "03",
                  title: "Share status with users",
                  desc: "Create a public status page with your own domain. Build trust with transparency.",
                },
              ].map((s, i) => (
                <FadeIn key={s.step} delay={i * 120}>
                  <div className="flex gap-4">
                    <span className="font-mono text-3xl font-bold text-muted-foreground/30">
                      {s.step}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">{s.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t">
          <div className="mx-auto max-w-6xl px-6 py-24 text-center">
            <FadeIn>
              <h2 className="text-3xl font-semibold tracking-tight">
                Start monitoring in under a minute
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                No credit card required. Free forever for small projects.
              </p>
              <Link to="/login" className="mt-8 inline-block">
                <Button size="lg" className="gap-2">
                  Get started <ArrowRight className="size-4" />
                </Button>
              </Link>
            </FadeIn>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} unstatus
          </span>
          <Link
            to="/pricing"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </Link>
        </div>
      </footer>
    </div>
  );
}
