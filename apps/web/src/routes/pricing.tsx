import { useState, useEffect, useRef, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRight, Check, Minus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useCustomer, useListPlans } from "autumn-js/react";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

// ---------------------------------------------------------------------------
// Hooks
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
// Static data (feature comparison table)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function PricingPage() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const { attach } = useCustomer();
  const { data: plans, isLoading: plansLoading } = useListPlans();

  // Filter to paid (non-free, non-add-on) plans
  const paidPlans = plans?.filter((p) => !p.addOn && !p.autoEnable) ?? [];

  const handleCheckout = async (planId: string) => {
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    await attach({ planId });
  };

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
        <section className="mx-auto max-w-6xl px-6 pt-28 pb-6 text-center">
          <FadeIn>
            <h1 className="text-4xl font-semibold tracking-tight lg:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-lg text-muted-foreground">
              Start free. Upgrade when you need more. No surprises.
            </p>
          </FadeIn>
        </section>

        {/* Cards */}
        <section className="mx-auto max-w-4xl px-6 py-16">
          <div className={`grid gap-8 ${paidPlans.length >= 2 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {/* Free */}
            <FadeIn delay={0}>
              <div className="flex h-full flex-col rounded-2xl border p-8 transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5">
                <div className="text-sm font-medium text-muted-foreground">
                  Free
                </div>
                <div className="mt-4 flex items-baseline">
                  <span className="font-mono text-5xl font-semibold tracking-tight">
                    $0
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Everything you need to get started
                </p>
                <Link to="/login" className="mt-8">
                  <Button variant="outline" className="h-11 w-full">
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
                        <Check className="size-4 shrink-0 text-muted-foreground" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </FadeIn>

            {/* Paid plans (from Autumn) */}
            {plansLoading ? (
              <FadeIn delay={100}>
                <div className="flex h-full items-center justify-center rounded-2xl border p-8">
                  <Spinner className="size-6" />
                </div>
              </FadeIn>
            ) : (
              paidPlans.map((plan, i) => (
                <FadeIn key={plan.id} delay={100 * (i + 1)}>
                  <div className="relative flex h-full flex-col rounded-2xl border-2 border-foreground/15 p-8 transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5">
                    {i === 0 && (
                      <div className="absolute -top-3 left-8">
                        <span className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
                          Most popular
                        </span>
                      </div>
                    )}
                    <div className="text-sm font-medium text-muted-foreground">
                      {plan.name}
                    </div>
                    <div className="mt-4 flex items-baseline">
                      {plan.price ? (
                        <>
                          <span className="font-mono text-5xl font-semibold tracking-tight">
                            {plan.price.display?.primaryText ?? `$${plan.price.amount}`}
                          </span>
                          <span className="ml-1 text-lg text-muted-foreground">
                            {plan.price.display?.secondaryText ?? `/${plan.price.interval}`}
                          </span>
                        </>
                      ) : (
                        <span className="font-mono text-5xl font-semibold tracking-tight">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {plan.description ?? "Unlock the full experience"}
                    </p>
                    <Button
                      className="mt-8 h-11 w-full gap-2"
                      onClick={() => handleCheckout(plan.id)}
                    >
                      Get started <ArrowRight className="size-4" />
                    </Button>
                    {plan.items.length > 0 && (
                      <div className="mt-8 border-t pt-6">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {i === 0 ? "Everything in Free, plus" : `Everything in ${paidPlans[i - 1]?.name ?? "Free"}, plus`}
                        </span>
                        <ul className="mt-4 space-y-3">
                          {plan.items.map((item) => (
                            <li
                              key={item.featureId}
                              className="flex items-center gap-2.5 text-sm"
                            >
                              <Check className="size-4 shrink-0 text-foreground" />
                              {item.display?.primaryText
                                ?? (item.unlimited
                                  ? `Unlimited ${item.feature?.display?.plural ?? item.feature?.name ?? item.featureId}`
                                  : item.included > 0
                                    ? `${item.included} ${item.included === 1 ? (item.feature?.display?.singular ?? item.feature?.name ?? item.featureId) : (item.feature?.display?.plural ?? item.feature?.name ?? item.featureId)}`
                                    : (item.feature?.name ?? item.featureId))}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </FadeIn>
              ))
            )}
          </div>
        </section>

        {/* Feature comparison */}
        <section className="border-t bg-muted/20">
          <div className="mx-auto max-w-3xl px-6 py-24">
            <FadeIn>
              <h2 className="text-center text-2xl font-semibold tracking-tight lg:text-3xl">
                Compare plans in detail
              </h2>
              <p className="mt-3 text-center text-sm text-muted-foreground">
                See exactly what you get on each plan.
              </p>
            </FadeIn>
            <FadeIn delay={100}>
              <div className="mt-14 overflow-hidden rounded-xl border bg-background">
                {/* Table header */}
                <div className="grid grid-cols-3 border-b bg-muted/30 px-6 py-4 text-xs font-medium text-muted-foreground">
                  <div>Feature</div>
                  <div className="text-center">Free</div>
                  <div className="text-center">{paidPlans[0]?.name ?? "Pro"}</div>
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
                          fi < group.features.length - 1
                            ? "border-b border-border/50"
                            : ""
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
            </FadeIn>
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
                The free plan is free forever. Upgrade or downgrade anytime. No
                contracts.
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
            to="/"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
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
