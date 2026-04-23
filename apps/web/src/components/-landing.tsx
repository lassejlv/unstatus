import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Github } from "lucide-react";
import { cn } from "@/lib/utils";

type State = "up" | "degraded" | "down" | "none";

function stateColor(state: State) {
  if (state === "up") return "bg-emerald-500";
  if (state === "degraded") return "bg-yellow-500";
  if (state === "down") return "bg-red-500";
  return "bg-muted-foreground";
}

function stateTextColor(state: State) {
  if (state === "up") return "text-emerald-500";
  if (state === "degraded") return "text-yellow-500";
  if (state === "down") return "text-red-500";
  return "text-muted-foreground";
}

function Dot({ state = "up", size = 8 }: { state?: State; size?: number }) {
  const color = stateColor(state);
  return (
    <span
      className={cn("relative inline-block shrink-0 rounded-full", color)}
      style={{ width: size, height: size }}
    >
      {state === "up" && (
        <span
          className={cn("absolute inset-0 rounded-full opacity-50 animate-ping", color)}
        />
      )}
    </span>
  );
}

function Bar({ state }: { state: State }) {
  const color = stateColor(state);
  return (
    <div
      className={cn(
        "h-7 flex-1 rounded-[2px]",
        state === "none" ? "opacity-20" : "opacity-90",
        color,
      )}
    />
  );
}

function UptimeStrip({ seed = 1, daysDown = [] }: { seed?: number; daysDown?: number[] }) {
  const bars: State[] = Array.from({ length: 90 }, (_, i) => {
    if (daysDown.includes(i)) return "down";
    const x = Math.sin(seed * 31 + i * 7.13) * 10000;
    const r = x - Math.floor(x);
    if (r < 0.015) return "degraded";
    return "up";
  });
  return (
    <div className="flex gap-[2px]">
      {bars.map((s, i) => (
        <Bar key={i} state={s} />
      ))}
    </div>
  );
}

function StatusRow({
  name,
  url,
  state,
  latency,
  uptime,
  seed,
  daysDown,
}: {
  name: string;
  url: string;
  state: State;
  latency: number;
  uptime: string;
  seed: number;
  daysDown?: number[];
}) {
  return (
    <div className="border-b border-border py-4 first:pt-0 last:border-0 last:pb-0">
      <div className="mb-2 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <Dot state={state} />
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="hidden truncate font-mono text-xs text-muted-foreground sm:inline">
            {url}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-5 font-mono text-xs tabular-nums">
          <span className="hidden text-muted-foreground sm:inline">{latency}ms</span>
          <span className={stateTextColor(state)}>{uptime}</span>
        </div>
      </div>
      <UptimeStrip seed={seed} daysDown={daysDown} />
    </div>
  );
}

function StatusCard() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2400);
    return () => clearInterval(id);
  }, []);

  const latencies = {
    api: 42 + ((tick * 3) % 14),
    web: 118 + ((tick * 5) % 22),
    db: 7 + (tick % 5),
    stripe: 214 + ((tick * 11) % 30),
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_0_rgba(0,0,0,0.02),0_20px_60px_-20px_rgba(0,0,0,0.15)]">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#E06C75] opacity-70" />
          <span className="size-2.5 rounded-full bg-[#E5C07B] opacity-70" />
          <span className="size-2.5 rounded-full bg-[#98C379] opacity-70" />
        </div>
        <div className="font-mono text-[11px] text-muted-foreground">status.acme.dev</div>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          <Dot state="up" size={6} /> live
        </div>
      </div>

      <div className="border-b border-border px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Dot state="up" />
              <span className="text-sm font-medium">All systems operational</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Last checked {(tick % 10) + 2}s ago · 4 regions
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              30d uptime
            </div>
            <div className="font-mono text-sm font-medium tabular-nums">99.982%</div>
          </div>
        </div>
      </div>

      <div className="px-5 py-2">
        <StatusRow
          name="API"
          url="api.acme.dev"
          state="up"
          latency={latencies.api}
          uptime="100%"
          seed={1}
        />
        <StatusRow
          name="Web app"
          url="app.acme.dev"
          state="up"
          latency={latencies.web}
          uptime="99.98%"
          seed={2}
        />
        <StatusRow
          name="Database"
          url="db.internal"
          state="up"
          latency={latencies.db}
          uptime="99.99%"
          seed={3}
        />
        <StatusRow
          name="Stripe"
          url="api.stripe.com"
          state="degraded"
          latency={latencies.stripe}
          uptime="98.4%"
          seed={4}
        />
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-2 font-mono text-[10px] text-muted-foreground">
        <span>90 days ago</span>
        <span>today</span>
      </div>
    </div>
  );
}

export function LandingHero() {
  return (
    <section className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at top, black 20%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at top, black 20%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-20 md:pt-24 md:pb-28">
        <h1 className="mx-auto max-w-3xl text-center text-[2.5rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          Uptime monitoring
          <br />
          <span className="text-muted-foreground">you actually own.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-center text-base text-muted-foreground sm:text-lg">
          Beautiful status pages and uptime monitoring for modern teams. Get instant alerts,
          multi-region checks, and a public page your users will actually trust.
        </p>

        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
            >
              Start monitoring — free <ArrowRight className="size-4" aria-hidden />
            </Link>
            <a
              href="https://github.com/lassejlv/unstatus"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
            >
              <Github className="size-4" aria-hidden /> Star on GitHub
            </a>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-4xl md:mt-20">
          <StatusCard />
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Dot state="up" size={6} />
            Live demo · updating every few seconds
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureRow({
  label,
  title,
  description,
  visual,
  reverse,
}: {
  label: string;
  title: string;
  description: string;
  visual: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid items-center gap-10 md:grid-cols-2 md:gap-16",
        reverse && "md:[&>*:first-child]:order-2",
      )}
    >
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </div>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h3>
        <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="relative">{visual}</div>
    </div>
  );
}

function RegionsVisual() {
  const regions = [
    { code: "eu-west", top: 42, right: 29, ms: 38, state: "up" as const },
    { code: "us-east", top: 55, right: 68, ms: 112, state: "up" as const },
    { code: "us-west", top: 52, right: 82, ms: 147, state: "up" as const },
    { code: "ap-south", top: 60, right: 15, ms: 203, state: "degraded" as const },
  ];
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="font-mono text-xs text-muted-foreground">api.acme.dev</div>
        <div className="font-mono text-xs text-muted-foreground">now</div>
      </div>
      <div className="relative h-40 overflow-hidden rounded-md border border-border bg-muted/30">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
            backgroundSize: "10px 10px",
          }}
        />
        {regions.map((r) => (
          <div
            key={r.code}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ top: `${r.top}%`, right: `${r.right}%` }}
          >
            <div className="relative">
              <Dot state={r.state} size={10} />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[10px]">
                <span className="text-muted-foreground">{r.code}</span>{" "}
                <span className="tabular-nums">{r.ms}ms</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
        <span>4 probes · 10s interval</span>
        <span>p95 147ms</span>
      </div>
    </div>
  );
}

function AlertsVisual() {
  const channels = [
    { ch: "Email", to: "team@acme.dev", t: "12s ago" },
    { ch: "Discord", to: "#ops-alerts", t: "12s ago" },
    { ch: "Webhook", to: "https://hooks.acme.dev/oncall", t: "13s ago" },
    { ch: "Slack", to: "#incidents", t: "13s ago", muted: true },
  ];
  return (
    <div className="space-y-2.5 rounded-lg border border-border bg-card p-5">
      {channels.map((r, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 text-sm",
            r.muted && "opacity-50",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{r.ch}</span>
            <span className="truncate font-mono text-xs">{r.to}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground">{r.t}</span>
            {!r.muted && <Dot state="up" size={6} />}
          </div>
        </div>
      ))}
      <div className="pt-1 font-mono text-[11px] text-muted-foreground">+ 3 more channels</div>
    </div>
  );
}

function IncidentVisual() {
  const items: Array<{ t: string; label: string; state: State; note: string }> = [
    { t: "10:42", label: "Resolved", state: "up", note: "All services recovered" },
    {
      t: "10:31",
      label: "Monitoring",
      state: "degraded",
      note: "Rolled back v4.12 on api.acme.dev",
    },
    {
      t: "10:14",
      label: "Investigating",
      state: "down",
      note: "Elevated 5xx on Stripe webhooks",
    },
  ];
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="font-mono text-xs text-muted-foreground">INC-284</div>
          <div className="mt-0.5 text-sm font-medium">Stripe webhook delays</div>
        </div>
        <span className="rounded border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground">
          RESOLVED
        </span>
      </div>
      <div className="relative pt-4">
        <div className="absolute bottom-2 left-[7px] top-5 w-px bg-border" />
        {items.map((it, i) => (
          <div key={i} className="relative pb-4 pl-7 last:pb-0">
            <div className="absolute left-0 top-1">
              <Dot state={it.state} size={14} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs text-muted-foreground">{it.t}</span>
              <span className="text-xs font-medium">{it.label}</span>
            </div>
            <div className="mt-0.5 text-sm text-muted-foreground">{it.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LandingFeatures() {
  return (
    <section id="features" className="border-t border-border">
      <div className="mx-auto max-w-6xl space-y-24 px-5 py-20 md:space-y-32 md:py-28">
        <FeatureRow
          label="01 · Multi-region checks"
          title="Probe from where your users are."
          description="HTTP, TCP, and ping checks from EU, US, and Asia. Intervals as low as 10 seconds. Catch regional outages before your users tweet about them."
          visual={<RegionsVisual />}
        />
        <FeatureRow
          label="02 · Instant alerts"
          title="Wake up the right person, once."
          description="Email, Discord, Slack, webhooks. Smart deduplication so a 5-region outage doesn't fire 5 alerts. Recovery notices included."
          visual={<AlertsVisual />}
          reverse
        />
        <FeatureRow
          label="03 · Incident management"
          title="Timelines your team actually writes in."
          description="Auto-created incidents with a clean update flow. Subscribers get emails. Post-mortems get their own canonical URL."
          visual={<IncidentVisual />}
        />
      </div>
    </section>
  );
}

function TerminalBlock() {
  const lines: Array<{ p: string; t: string; color?: "up" }> = [
    { p: "$", t: "git clone github.com/lassejlv/unstatus" },
    { p: "$", t: "cd unstatus && bun install" },
    { p: "$", t: "cp .env.example .env.local" },
    { p: "$", t: "bun run db:migrate:deploy" },
    { p: "$", t: "bun run dev" },
    { p: "", t: "  ✓ web   ready on http://localhost:3000", color: "up" },
    { p: "", t: "  ✓ worker running (region: eu, 10s interval)", color: "up" },
  ];
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card font-mono text-[13px]">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#E06C75] opacity-70" />
          <span className="size-2.5 rounded-full bg-[#E5C07B] opacity-70" />
          <span className="size-2.5 rounded-full bg-[#98C379] opacity-70" />
        </div>
        <span className="text-[11px] text-muted-foreground">~ / unstatus</span>
        <span className="w-8" />
      </div>
      <pre className="whitespace-pre-wrap px-4 py-4 leading-[1.75] text-foreground">
        {lines.map((l, i) => (
          <div key={i}>
            {l.p && <span className="text-muted-foreground">{l.p} </span>}
            <span className={cn(l.color === "up" && "text-emerald-500")}>{l.t}</span>
          </div>
        ))}
        <span className="inline-block h-4 w-2 animate-pulse bg-foreground align-[-2px]" />
      </pre>
    </div>
  );
}

export function LandingOss() {
  const stats = [
    { n: "1.2k", l: "GitHub stars" },
    { n: "MIT", l: "License" },
    { n: "100%", l: "Source available" },
    { n: "$0", l: "Self-hosted" },
  ];
  return (
    <section id="oss" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Open source
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Own your uptime stack.
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
              Every line is MIT-licensed and on GitHub. Host it on Railway in a click, or
              docker-compose it on a $5 VPS. Your data, your database, your domain.
            </p>
            <div className="mt-6 grid max-w-xs grid-cols-2 gap-5">
              {stats.map((s) => (
                <div key={s.l}>
                  <div className="font-mono text-xl font-medium tabular-nums">{s.n}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="mt-7 flex gap-3">
              <a
                href="https://github.com/lassejlv/unstatus"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium transition hover:bg-muted"
              >
                <Github className="size-4" aria-hidden /> View on GitHub
              </a>
              <a
                href="/docs"
                className="inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm text-muted-foreground transition hover:text-foreground"
              >
                Read the docs →
              </a>
            </div>
          </div>
          <TerminalBlock />
        </div>
      </div>
    </section>
  );
}

export function LandingHowItWorks() {
  const steps = [
    {
      n: "01",
      t: "Add a monitor",
      d: "Paste a URL. Pick regions and interval. Done in 30 seconds.",
      code: 'POST /v1/monitors  { url: "https://acme.dev" }',
    },
    {
      n: "02",
      t: "Unstatus probes it",
      d: "Workers in multiple regions hit your endpoint and stream results.",
      code: "worker.eu → 200 OK · 38ms",
    },
    {
      n: "03",
      t: "You get notified",
      d: "Email / Discord / webhook the instant something is off. Plus a public page if you want one.",
      code: "→ incident created · 3 channels notified",
    },
  ];
  return (
    <section id="how" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="max-w-xl">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            How it works
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Three steps from zero to monitored.
          </h2>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="bg-background p-6">
              <div className="font-mono text-xs text-muted-foreground">{s.n}</div>
              <h3 className="mt-2 text-base font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
              <div className="mt-5 overflow-x-auto rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-[11px] text-muted-foreground">
                {s.code}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingClosingCTA() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 text-center md:py-28">
        <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
          Start monitoring.
          <br />
          <span className="text-muted-foreground">Keep the source.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-muted-foreground">
          Free forever on our hosted plan. Or clone the repo and run it yourself — both paths
          take about 5 minutes.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
          >
            Start for free →
          </Link>
          <a
            href="https://github.com/lassejlv/unstatus"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
          >
            <Github className="size-4" aria-hidden /> Self-host it
          </a>
        </div>
      </div>
    </section>
  );
}
