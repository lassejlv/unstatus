import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Minus } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

const featureGroups: {
  label: string;
  features: { name: string; free: string | boolean; pro: string | boolean }[];
}[] = [
  {
    label: "Limits",
    features: [
      { name: "Monitors", free: "5", pro: "Unlimited" },
      { name: "Status pages", free: "1", pro: "Unlimited" },
      { name: "Team members", free: "3", pro: "Unlimited" },
      { name: "Check interval", free: "5 min", pro: "10 sec" },
      { name: "Incident history", free: "30 days", pro: "Unlimited" },
      { name: "Regions", free: "1", pro: "All (EU, US, Asia)" },
    ],
  },
  {
    label: "Notifications",
    features: [
      { name: "Email", free: true, pro: true },
      { name: "Discord", free: false, pro: true },
      { name: "Webhooks", free: false, pro: true },
    ],
  },
  {
    label: "Customization",
    features: [
      { name: "Custom domains", free: false, pro: true },
      { name: "Custom branding", free: false, pro: true },
      { name: "Custom CSS", free: false, pro: true },
    ],
  },
  {
    label: "Advanced",
    features: [
      { name: "API access", free: false, pro: true },
      { name: "Auto incidents", free: false, pro: true },
      { name: "Ping monitors", free: false, pro: true },
    ],
  },
];

function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const proPrice = annual ? 144 : 15;
  const proPeriod = annual ? "/year" : "/mo";
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  const handleProCheckout = async () => {
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    await authClient.checkout({ slug: "pro" });
  };

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
              className="text-sm font-medium text-foreground"
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
        {/* Header */}
        <section className="mx-auto max-w-5xl px-6 pt-24 pb-6 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free. Upgrade when you need more. No surprises.
          </p>

          {/* Billing toggle */}
          <div className="mt-10 inline-flex items-center rounded-full border p-1">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`rounded-full px-5 py-2 text-sm transition-all ${
                !annual
                  ? "bg-foreground text-background font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`rounded-full px-5 py-2 text-sm transition-all ${
                annual
                  ? "bg-foreground text-background font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span className="ml-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                -20%
              </span>
            </button>
          </div>
        </section>

        {/* Cards */}
        <section className="mx-auto max-w-3xl px-6 py-12">
          <div className="grid gap-8 sm:grid-cols-2">
            {/* Free */}
            <div className="flex flex-col rounded-2xl border p-8">
              <div className="text-sm font-medium text-muted-foreground">
                Free
              </div>
              <div className="mt-4 flex items-baseline">
                <span className="text-5xl font-semibold tracking-tight">
                  $0
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                For side projects and personal use. Everything you need to get
                started.
              </p>
              <Link to="/login" className="mt-8">
                <Button variant="outline" className="w-full h-11">
                  Get started free
                </Button>
              </Link>
              <div className="mt-8 border-t pt-6">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Includes
                </span>
                <ul className="mt-4 space-y-3">
                  {[
                    "5 monitors",
                    "1 status page",
                    "3 team members",
                    "5 min check interval",
                    "Email notifications",
                    "30 day history",
                  ].map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      <Check className="size-4 text-muted-foreground shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Pro */}
            <div className="relative flex flex-col rounded-2xl border-2 border-foreground/15 p-8">
              <div className="absolute -top-3 left-8">
                <span className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
                  Most popular
                </span>
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                Pro
              </div>
              <div className="mt-4 flex items-baseline">
                <span className="text-5xl font-semibold tracking-tight">
                  ${proPrice}
                </span>
                <span className="ml-1 text-lg text-muted-foreground">
                  {proPeriod}
                </span>
              </div>
              {annual && (
                <p className="mt-1 text-xs text-muted-foreground">
                  That's $12/month, billed annually
                </p>
              )}
              <p className="mt-3 text-sm text-muted-foreground">
                For teams and businesses. Unlimited everything, all features
                unlocked.
              </p>
              <Button className="mt-8 w-full h-11 gap-2" onClick={handleProCheckout}>
                Get started <ArrowRight className="size-4" />
              </Button>
              <div className="mt-8 border-t pt-6">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Everything in Free, plus
                </span>
                <ul className="mt-4 space-y-3">
                  {[
                    "Unlimited monitors",
                    "Unlimited status pages",
                    "Unlimited team members",
                    "10 sec check interval",
                    "All notification channels",
                    "Custom domains & branding",
                    "API access",
                    "Auto incidents",
                    "All regions (EU, US, Asia)",
                    "Unlimited history",
                  ].map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      <Check className="size-4 text-foreground shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Feature comparison */}
        <section className="border-t bg-muted/20">
          <div className="mx-auto max-w-3xl px-6 py-20">
            <h2 className="text-2xl font-semibold tracking-tight text-center">
              Compare plans in detail
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              See exactly what you get on each plan.
            </p>
            <div className="mt-12 rounded-xl border bg-background overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-3 border-b bg-muted/30 px-6 py-4 text-xs font-medium text-muted-foreground">
                <div>Feature</div>
                <div className="text-center">Free</div>
                <div className="text-center">Pro</div>
              </div>

              {featureGroups.map((group, gi) => (
                <div key={group.label}>
                  <div
                    className={`px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 ${
                      gi > 0 ? "border-t bg-muted/20" : "bg-muted/20"
                    }`}
                  >
                    {group.label}
                  </div>
                  {group.features.map((f, fi) => (
                    <div
                      key={f.name}
                      className={`grid grid-cols-3 px-6 py-3.5 text-sm ${
                        fi < group.features.length - 1 ? "border-b border-border/50" : ""
                      }`}
                    >
                      <div className="text-muted-foreground">{f.name}</div>
                      <div className="text-center">
                        <FeatureValue value={f.free} />
                      </div>
                      <div className="text-center">
                        <FeatureValue value={f.pro} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ-style bottom */}
        <section className="border-t">
          <div className="mx-auto max-w-3xl px-6 py-20 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Questions?
            </h2>
            <p className="mt-3 text-muted-foreground">
              The free plan is free forever. Upgrade or downgrade anytime. Cancel
              anytime. No contracts.
            </p>
            <Link to="/login" className="mt-8 inline-block">
              <Button size="lg" className="gap-2">
                Start for free <ArrowRight className="size-4" />
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
            to="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true)
    return <Check className="inline size-4 text-foreground" />;
  if (value === false)
    return <Minus className="inline size-4 text-muted-foreground/30" />;
  return <span className="font-medium">{value}</span>;
}
