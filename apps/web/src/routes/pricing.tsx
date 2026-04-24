import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { PublicNav } from "@/components/-public-nav";
import { MarketingFooter } from "@/components/-marketing-footer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

function CustomCheck({ className = "size-4", muted }: { className?: string; muted?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke={muted ? "hsl(var(--muted-foreground))" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className, !muted && "text-[oklch(0.765_0.177_163.22)]")}
    >
      <path d="M3 8.5l3.5 3.5L13 5" />
    </svg>
  );
}

function CustomMinus({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeLinecap="round" opacity={0.4}>
      <path d="M4 8h8" />
    </svg>
  );
}

interface PlanFeature {
  text: string;
  detail?: string;
}

interface PlanCardProps {
  name: string;
  price: string;
  priceSuffix?: string;
  desc: string;
  features: PlanFeature[];
  cta: string;
  ctaVariant?: "default" | "outline";
  highlight?: boolean;
  badge?: string;
  savings?: string | null;
  onAction?: () => void;
}

function PlanCard({
  name,
  price,
  priceSuffix,
  desc,
  features,
  cta,
  ctaVariant = "outline",
  highlight,
  badge,
  savings,
  onAction,
}: PlanCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-lg border bg-card p-6 md:p-7",
        highlight && "shadow-[0_20px_60px_-20px_rgba(0,0,0,0.4)]"
      )}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-[oklch(0.765_0.177_163.22)] px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-white">
            {badge}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          {name}
        </h3>
          {savings && (
            <span
              className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
            >
              {savings}
            </span>
          )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {desc}
      </p>
      <div className="mt-6 flex items-baseline gap-1.5">
        <span
          className="text-4xl font-semibold tracking-tight tabular-nums text-foreground"
        >
          {price}
        </span>
        {priceSuffix && (
          <span className="text-xs text-muted-foreground">
            {priceSuffix}
          </span>
        )}
      </div>
      <Button
        className={cn(
          "mt-6 w-full rounded-md text-sm",
          ctaVariant === "default" && "hover:opacity-90"
        )}
        variant={ctaVariant}
        onClick={onAction}
      >
        {cta}
      </Button>

      <ul className="mt-7 space-y-3 text-sm">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <CustomCheck className="mt-0.5 size-4 shrink-0" />
            <div>
              <div className="text-foreground">{f.text}</div>
              {f.detail && (
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {f.detail}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// -------- Header --------
function PricingHeader() {
  return (
    <section className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at top, black 0%, transparent 65%)",
          WebkitMaskImage: "radial-gradient(ellipse at top, black 0%, transparent 65%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-16 text-center md:pt-20">
        <h1 className="text-[2.5rem] font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
          Monitor more.
          <br />
          <span className="text-muted-foreground">Pay less as you grow.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-muted-foreground">
          Start free, upgrade when you need faster checks or more monitors. No seat tax, no overage
          surprises.
        </p>
      </div>
    </section>
  );
}

// -------- Plans --------
function Plans({
  handleAction,
}: {
  handleAction: (plan: "free" | "pro") => void;
}) {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-12 md:pb-16">
      <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
        <PlanCard
          name="Free"
          price="$0"
          priceSuffix="forever"
          desc="Side projects and personal use."
          cta="Start free"
          onAction={() => handleAction("free")}
          features={[
            { text: "1 monitor", detail: "HTTP, TCP, or ping" },
            { text: "1 status page", detail: "Hosted on unstatus.com" },
            { text: "Email alerts", detail: "Instant notifications" },
            { text: "10 min checks", detail: "Standard interval" },
          ]}
        />
        <PlanCard
          name="Pro"
          price="$7"
          priceSuffix="/ month"
          desc="Production apps that need room to grow."
          cta="Get Pro"
          ctaVariant="default"
          highlight
          badge="Usage based"
          onAction={() => handleAction("pro")}
          features={[
            { text: "5 monitors included", detail: "$0.50 per extra monitor" },
            { text: "1 custom domain included", detail: "$1 per extra custom domain" },
            { text: "Unlimited status pages", detail: "No page limit" },
            { text: "1 min checks", detail: "Faster issue detection" },
            { text: "Discord alerts", detail: "Post to your server" },
            { text: "API access", detail: "Automate your workflows" },
          ]}
        />
      </div>

      {/* Trust strip */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CustomCheck className="size-3.5" /> 14-day money-back guarantee
        </span>
        <span className="flex items-center gap-1.5">
          <CustomCheck className="size-3.5" /> No credit card for Free
        </span>
        <span className="flex items-center gap-1.5">
          <CustomCheck className="size-3.5" /> Email support on all plans
        </span>
      </div>
    </section>
  );
}

// -------- Comparison --------
interface ComparisonRow {
  label: string;
  free: React.ReactNode;
  pro: React.ReactNode;
}

interface ComparisonGroup {
  name: string;
  rows: ComparisonRow[];
}

const comparisonGroups: ComparisonGroup[] = [
  {
    name: "Monitoring",
    rows: [
      { label: "Monitors", free: "1", pro: "5 included, then $0.50 each" },
      { label: "Check interval", free: "10 min", pro: "1 min" },
      { label: "Check types", free: "HTTP / TCP", pro: "HTTP / TCP" },
      { label: "Multi-region checks", free: false, pro: false },
    ],
  },
  {
    name: "Status pages",
    rows: [
      { label: "Status pages", free: "1", pro: "Unlimited" },
      { label: "Custom domains", free: false, pro: "1 included, then $1 each" },
      { label: "Custom CSS", free: false, pro: false },
      { label: "Remove branding", free: false, pro: false },
    ],
  },
  {
    name: "Alerts & incidents",
    rows: [
      { label: "Email alerts", free: true, pro: true },
      { label: "Discord alerts", free: false, pro: true },
      { label: "Webhooks", free: false, pro: true },
      { label: "Auto incidents", free: false, pro: false },
      { label: "API access", free: false, pro: true },
    ],
  },
];

function Cell({ v }: { v: React.ReactNode }) {
  if (typeof v === "boolean") {
    return v ? <CustomCheck className="mx-auto size-4" /> : <CustomMinus className="mx-auto size-4" />;
  }
  return <span className="tabular-nums text-sm">{v}</span>;
}

function Comparison() {
  return (
    <section className="border-t">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <div className="max-w-xl">
          <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
            Compare plans
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
            Every feature, side by side.
          </h2>
        </div>

        <div className="-mx-5 mt-10 overflow-x-auto px-5">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 w-[40%] bg-background py-3 pr-4 text-left text-xs font-medium text-muted-foreground">
                  Feature
                </th>
                <th className="w-[30%] px-4 py-3 text-center">
                  <div className="text-sm font-medium">Free</div>
                  <div className="text-xs text-muted-foreground">$0</div>
                </th>
                <th className="w-[30%] rounded-t-md bg-muted/40 px-4 py-3 text-center">
                  <div className="text-sm font-medium">Pro</div>
                  <div className="text-xs text-muted-foreground">$7/mo</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonGroups.map((g) => (
                <>
                  <tr key={g.name}>
                    <td colSpan={3} className="pb-2 pt-8">
                      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
                        {g.name}
                      </div>
                    </td>
                  </tr>
                  {g.rows.map((r) => (
                    <tr key={r.label} className="border-t">
                      <td className="sticky left-0 bg-background py-3 pr-4 text-sm text-foreground">
                        {r.label}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Cell v={r.free} />
                      </td>
                      <td className="bg-muted/40 px-4 py-3 text-center">
                        <Cell v={r.pro} />
                      </td>
                    </tr>
                  ))}
                </>
              ))}
              <tr className="border-t">
                <td className="sticky left-0 bg-background py-4 pr-4" />
                <td className="px-4 py-4 text-center">
                  <Link to="/login" className="text-xs font-medium hover:underline">
                    Start free →
                  </Link>
                </td>
                <td className="px-4 py-4 text-center">
                  <Link to="/login" className="text-xs font-medium hover:underline">
                    Get Pro →
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// -------- FAQ --------
const faqs = [
  {
    q: "What happens if I hit my plan's monitor limit?",
    a: "Pro includes 5 monitors. Extra monitors are billed monthly as metered usage, so your existing monitors and data are preserved.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. You'll keep paid features until the end of your billing period, then automatically move to the Free plan.",
  },
  {
    q: "Is there a free trial?",
    a: "The Free plan is free forever with no time limit. Start there and upgrade when you need more capacity.",
  },
  {
    q: "What is multi-region monitoring?",
    a: "Multi-region checks run from the US, EU, and Asia. This prevents false alerts from regional network issues.",
  },
  {
    q: "What are auto incidents?",
    a: "When a monitor fails, we automatically create an incident on your status page and resolve it when checks recover — no manual updates needed.",
  },
  {
    q: "How secure is my data?",
    a: "All traffic is encrypted with TLS. We store status and timing metadata only — never your endpoint response bodies.",
  },
  {
    q: "What support do you offer?",
    a: "Email support on every plan, typically replying within 24 hours on business days. Urgent issues are prioritised by severity, not plan.",
  },
  {
    q: "Can I get a refund?",
    a: "If you're not satisfied within 14 days of a paid subscription, contact us for a full refund — no questions asked.",
  },
  {
    q: "Do you offer custom plans?",
    a: "Yes. If you need more than 50 monitors or have specific requirements, reach out and we'll build a plan that fits.",
  },
];

function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section className="border-t">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <div className="grid gap-10 md:grid-cols-[280px_1fr] md:gap-16">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
              FAQ
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              Questions,
              <br />
              answered.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Not finding what you need?{" "}
              <a href="#" className="underline underline-offset-2 hover:text-foreground">
                Email us
              </a>
              .
            </p>
          </div>
          <div className="divide-y border-b border-t">
            {faqs.map((f, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpen(open === i ? -1 : i)}
                  className="group flex w-full items-center justify-between gap-4 py-4 text-left"
                >
                  <span className="text-sm font-medium text-foreground">{f.q}</span>
                  <span
                    className={cn(
                      "shrink-0 text-muted-foreground transition-transform",
                      open === i && "rotate-45"
                    )}
                  >
                    <svg
                      viewBox="0 0 16 16"
                      className="size-4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M8 3v10M3 8h10" />
                    </svg>
                  </span>
                </button>
                {open === i && (
                  <div className="-mt-1 max-w-prose pb-4 text-sm leading-relaxed text-muted-foreground">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// -------- Closing CTA --------
function ClosingCTA() {
  return (
    <section className="border-t">
      <div className="mx-auto max-w-6xl px-5 py-20 text-center md:py-24">
        <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
          Set up in
          <br />
          <span className="text-muted-foreground">under 2 minutes.</span>
        </h2>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/login">
            <Button size="lg" className="rounded-md px-6">
              Start for free
            </Button>
          </Link>
          <a
            href="#"
            className="inline-flex items-center gap-1.5 rounded-md border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
          >
            Book a demo
          </a>
        </div>
      </div>
    </section>
  );
}

function PricingPage() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  const handleAction = (plan: "free" | "pro") => {
    if (plan === "free") {
      navigate({ to: "/login" });
      return;
    }
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    navigate({ to: "/dashboard/billing" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicNav active="/pricing" />

      <main className="flex-1">
        <PricingHeader />
        <Plans handleAction={handleAction} />
        <Comparison />
        <Faq />
        <ClosingCTA />
      </main>

      <MarketingFooter />
    </div>
  );
}
