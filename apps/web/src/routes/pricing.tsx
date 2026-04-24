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

function StatusDot({ size = 8 }: { size?: number }) {
  return (
    <span
      className="relative inline-block rounded-full"
      style={{ width: size, height: size, background: "var(--emerald)" }}
    >
      <span
        className="absolute inset-0 rounded-full animate-ping"
        style={{ background: "var(--emerald)", opacity: 0.5 }}
      />
    </span>
  );
}

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
        "relative flex flex-col rounded-lg p-6 md:p-7",
        highlight
          ? "bg-foreground text-background shadow-[0_20px_60px_-20px_rgba(0,0,0,0.4)]"
          : "border bg-card"
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
        <h3 className={cn("text-sm font-medium", highlight ? "text-background" : "text-foreground")}>
          {name}
        </h3>
        {savings && (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-mono",
              highlight ? "bg-white/15 text-background" : "bg-muted text-muted-foreground"
            )}
          >
            {savings}
          </span>
        )}
      </div>
      <p className={cn("mt-1 text-xs", highlight ? "text-background/70" : "text-muted-foreground")}>
        {desc}
      </p>
      <div className="mt-6 flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-4xl font-semibold tracking-tight tabular-nums",
            highlight ? "text-background" : "text-foreground"
          )}
        >
          {price}
        </span>
        {priceSuffix && (
          <span className={cn("text-xs", highlight ? "text-background/60" : "text-muted-foreground")}>
            {priceSuffix}
          </span>
        )}
      </div>
      <Button
        className={cn(
          "mt-6 w-full rounded-md text-sm",
          ctaVariant === "default" && !highlight && "hover:opacity-90",
          highlight && "bg-background text-foreground hover:opacity-90"
        )}
        variant={highlight ? "outline" : ctaVariant}
        onClick={onAction}
      >
        {cta}
      </Button>

      <ul className="mt-7 space-y-3 text-sm">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <CustomCheck className="mt-0.5 size-4 shrink-0" muted={!!highlight} />
            <div>
              <div className={highlight ? "text-background" : "text-foreground"}>{f.text}</div>
              {f.detail && (
                <div className={cn("mt-0.5 text-xs", highlight ? "text-background/60" : "text-muted-foreground")}>
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
function PricingHeader({ billing, setBilling }: { billing: string; setBilling: (v: "monthly" | "yearly") => void }) {
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
        <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
          <StatusDot size={6} />
          <span>Transparent pricing · cancel anytime</span>
        </div>
        <h1 className="mt-5 text-[2.5rem] font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
          Monitor more.
          <br />
          <span className="text-muted-foreground">Pay less as you grow.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-muted-foreground">
          Start free, upgrade when you need faster checks or more monitors. No seat tax, no overage
          surprises.
        </p>

        {/* Billing toggle */}
        <div className="mt-8 inline-flex items-center gap-1 rounded-full border bg-card p-1 text-sm">
          {(["monthly", "yearly"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={cn(
                "rounded-full px-4 py-1.5 capitalize transition",
                billing === b
                  ? "bg-foreground font-medium text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {b}
              {b === "yearly" && (
                <span
                  className={cn(
                    "ml-1.5 rounded px-1 py-0.5 text-[10px] font-mono",
                    billing === "yearly" ? "bg-white/15" : "text-[oklch(0.765_0.177_163.22)]"
                  )}
                >
                  −20%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// -------- Plans --------
function Plans({
  billing,
  handleAction,
}: {
  billing: string;
  handleAction: (plan: "free" | "hobby" | "scale") => void;
}) {
  const monthly = { free: 0, hobby: 15, scale: 49 };
  const yearly = { free: 0, hobby: 12, scale: 39 };
  const prices = billing === "yearly" ? yearly : monthly;
  const suffix = billing === "yearly" ? "/ mo, billed annually" : "/ month";

  return (
    <section className="mx-auto max-w-6xl px-5 pb-12 md:pb-16">
      <div className="grid gap-4 md:grid-cols-3">
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
          name="Hobby"
          price={`$${prices.hobby}`}
          priceSuffix={suffix}
          desc="Production apps that need faster detection."
          cta="Get Hobby"
          savings={billing === "yearly" ? "−$36/yr" : null}
          onAction={() => handleAction("hobby")}
          features={[
            { text: "10 monitors", detail: "Monitor all your services" },
            { text: "3 status pages", detail: "Separate pages per project" },
            { text: "1 min checks", detail: "Faster issue detection" },
            { text: "Custom domains", detail: "status.yourdomain.com" },
            { text: "Discord alerts", detail: "Post to your server" },
            { text: "API access", detail: "Automate your workflows" },
          ]}
        />
        <PlanCard
          name="Scale"
          price={`$${prices.scale}`}
          priceSuffix={suffix}
          desc="Teams running critical infrastructure."
          cta="Get Scale"
          ctaVariant="default"
          highlight
          badge="Most popular"
          savings={billing === "yearly" ? "−$120/yr" : null}
          onAction={() => handleAction("scale")}
          features={[
            { text: "50 monitors", detail: "Enterprise-grade capacity" },
            { text: "Unlimited status pages", detail: "No restrictions" },
            { text: "10 second checks", detail: "Near real-time monitoring" },
            { text: "Multi-region checks", detail: "US, EU, and Asia" },
            { text: "Auto incidents", detail: "Automatic status updates" },
            { text: "Custom CSS", detail: "Full brand control" },
            { text: "Remove branding", detail: "White-label your pages" },
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
  hobby: React.ReactNode;
  scale: React.ReactNode;
}

interface ComparisonGroup {
  name: string;
  rows: ComparisonRow[];
}

const comparisonGroups: ComparisonGroup[] = [
  {
    name: "Monitoring",
    rows: [
      { label: "Monitors", free: "1", hobby: "10", scale: "50" },
      { label: "Check interval", free: "10 min", hobby: "1 min", scale: "10 sec" },
      { label: "Check types", free: "HTTP / TCP / ping", hobby: "HTTP / TCP / ping", scale: "HTTP / TCP / ping" },
      { label: "Multi-region checks", free: false, hobby: false, scale: "US · EU · Asia" },
    ],
  },
  {
    name: "Status pages",
    rows: [
      { label: "Status pages", free: "1", hobby: "3", scale: "Unlimited" },
      { label: "Custom domains", free: false, hobby: true, scale: true },
      { label: "Custom CSS", free: false, hobby: false, scale: true },
      { label: "Remove branding", free: false, hobby: false, scale: true },
    ],
  },
  {
    name: "Alerts & incidents",
    rows: [
      { label: "Email alerts", free: true, hobby: true, scale: true },
      { label: "Discord alerts", free: false, hobby: true, scale: true },
      { label: "Webhooks", free: false, hobby: true, scale: true },
      { label: "Auto incidents", free: false, hobby: false, scale: true },
      { label: "API access", free: false, hobby: true, scale: true },
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
                <th className="w-[20%] px-4 py-3 text-center">
                  <div className="text-sm font-medium">Free</div>
                  <div className="text-xs text-muted-foreground">$0</div>
                </th>
                <th className="w-[20%] px-4 py-3 text-center">
                  <div className="text-sm font-medium">Hobby</div>
                  <div className="text-xs text-muted-foreground">$15/mo</div>
                </th>
                <th className="w-[20%] rounded-t-md bg-muted/40 px-4 py-3 text-center">
                  <div className="text-sm font-medium">Scale</div>
                  <div className="text-xs text-muted-foreground">$49/mo</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonGroups.map((g) => (
                <>
                  <tr key={g.name}>
                    <td colSpan={4} className="pb-2 pt-8">
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
                      <td className="px-4 py-3 text-center">
                        <Cell v={r.hobby} />
                      </td>
                      <td className="bg-muted/40 px-4 py-3 text-center">
                        <Cell v={r.scale} />
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
                    Get Hobby →
                  </Link>
                </td>
                <td className="rounded-b-md bg-muted/40 px-4 py-4 text-center">
                  <Link to="/login" className="text-xs font-medium hover:underline">
                    Get Scale →
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
    a: "You can upgrade at any time. Your existing monitors and data are preserved during the upgrade — nothing is lost.",
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
    a: "Scale plans run checks from the US, EU, and Asia. This prevents false alerts from regional network issues.",
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
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const handleAction = (plan: "free" | "hobby" | "scale") => {
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
        <PricingHeader billing={billing} setBilling={setBilling} />
        <Plans billing={billing} handleAction={handleAction} />
        <Comparison />
        <Faq />
        <ClosingCTA />
      </main>

      <MarketingFooter />
    </div>
  );
}
