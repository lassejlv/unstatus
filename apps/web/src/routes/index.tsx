import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  CenteredMessage,
  PublicStatusPageView,
} from "@/components/public-status-view";
import { orpc } from "@/orpc/client";
import { useCustomDomain } from "@/lib/use-custom-domain";
import {
  ArrowRight,
  Globe,
  Wifi,
  AlertTriangle,
  Bell,
  MapPin,
  Code2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: RootPage,
});

function RootPage() {
  const customDomain = useCustomDomain();
  // undefined = SSR, don't render anything yet to avoid homepage flash
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
    />
  );
}

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

const words = ["status pages", "monitoring", "incident tracking", "alerting"];

function TypewriterWord() {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[index];
    const speed = deleting ? 40 : 80;

    const timeout = setTimeout(() => {
      if (!deleting) {
        if (text.length < word.length) {
          setText(word.slice(0, text.length + 1));
        } else {
          setTimeout(() => setDeleting(true), 2000);
        }
      } else {
        if (text.length > 0) {
          setText(text.slice(0, -1));
        } else {
          setDeleting(false);
          setIndex((i) => (i + 1) % words.length);
        }
      }
    }, speed);

    return () => clearTimeout(timeout);
  }, [text, deleting, index]);

  return (
    <span className="bg-gradient-to-r from-foreground/80 to-foreground/40 bg-clip-text text-transparent">
      {text}
      <span className="inline-block w-[2px] h-[0.9em] bg-foreground/40 ml-0.5 align-middle animate-pulse" />
    </span>
  );
}

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/Logo.png" alt="unstatus" className="size-7" />
            <span className="text-sm font-semibold tracking-tight">
              unstatus
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              to="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
        <section className="mx-auto max-w-5xl px-6 pt-32 pb-28">
          <div className="flex items-center gap-16">
            <div className="flex-1 min-w-0">
              <h1 className="text-4xl lg:text-[44px] font-semibold tracking-tight leading-[1.15]">
                Better <span className="inline-block whitespace-nowrap"><TypewriterWord /></span>
                <br />
                that just work.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-lg">
                Uptime monitoring, status pages, and incident management.
                Simple, fast, and reliable.
              </p>
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
            </div>

            {/* Mock status page preview */}
            <div className="hidden lg:block shrink-0 w-[380px] rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">Acme Inc</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  All Systems Operational
                </span>
              </div>
              {["API", "Website", "Database"].map((name) => (
                <div key={name} className="py-2.5 border-t first:border-t-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-medium">{name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      99.98%
                    </span>
                  </div>
                  <div className="flex gap-[2px]">
                    {Array.from({ length: 45 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-5 flex-1 rounded-[2px] ${
                          i === 31
                            ? "bg-amber-500"
                            : "bg-emerald-500/80"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="mt-3 text-center">
                <span className="text-[10px] text-muted-foreground">
                  90 days ago — Today
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Everything you need
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="group rounded-lg border p-5 transition-colors hover:border-foreground/20"
                >
                  <div className="flex size-9 items-center justify-center rounded-md border bg-muted/50 transition-colors group-hover:bg-muted">
                    <f.icon className="size-4 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-sm font-medium">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t bg-gradient-to-b from-background to-muted/40">
          <div className="mx-auto max-w-5xl px-6 py-24 text-center">
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
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} unstatus
          </span>
          <Link
            to="/pricing"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Pricing
          </Link>
        </div>
      </footer>
    </div>
  );
}
