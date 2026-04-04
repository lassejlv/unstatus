import { useState, useEffect, useRef, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { PublicNav } from "@/components/-public-nav";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeIn({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView(0.1);
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

function PricingPage() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  const handleCheckout = () => {
    if (!session) { navigate({ to: "/login" }); return; }
    navigate({ to: "/dashboard/billing" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicNav active="/pricing" />

      <main className="flex-1">
        {/* Header */}
        <section className="mx-auto max-w-6xl px-6 pt-24 pb-4 text-center">
          <FadeIn>
            <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
              Pricing
            </h1>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Start free. Pay for what you use.
            </p>
          </FadeIn>
        </section>

        {/* Plan cards */}
        <section className="mx-auto max-w-4xl px-6 py-12">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Free */}
              <FadeIn>
                <PlanCard
                  name="Free"
                  price="$0"
                  period=""
                  description="Get started with the basics"
                  features={["1 monitor", "1 status page", "Email notifications", "10 min check interval"]}
                  cta={<Link to="/login"><Button variant="outline" className="w-full">Get started</Button></Link>}
                />
              </FadeIn>

              {/* Pro */}
              <FadeIn delay={100}>
                <PlanCard
                  name="Pro"
                  price="$15"
                  period="/month"
                  description="50 monitors, unlimited status pages, custom domains, and all features."
                  highlight
                  features={[
                    "50 monitors",
                    "Unlimited status pages",
                    "Custom domains",
                    "Custom CSS",
                    "Auto incidents",
                    "Multi-regions (EU, US, Asia)",
                    "Discord notifications",
                    "Dependency chain",
                    "API access",
                    "Remove branding",
                  ]}
                  cta={
                    <Button className="w-full gap-2" onClick={handleCheckout}>
                      Get started <ArrowRight className="size-4" />
                      </Button>
                    }
                  />
                </FadeIn>
            </div>
        </section>

        {/* FAQ */}
        <section className="border-t">
          <div className="mx-auto max-w-2xl px-6 py-20">
            <FadeIn>
              <h2 className="text-center text-xl font-semibold tracking-tight">
                Questions
              </h2>
            </FadeIn>
            <div className="mt-10 space-y-6">
              {[
                { q: "What counts as a check?", a: "Every time we ping your monitor (HTTP, TCP, or ping), that's one check. A monitor running every 10 minutes uses ~4,320 checks/month." },
                { q: "What happens if I go over my limits?", a: "Usage-based features like checks and subscribers are billed at the overage rate shown on each plan. You're never blocked — just billed for what you use." },
                { q: "Can I cancel anytime?", a: "Yes. Cancel from your dashboard. You'll keep access until the end of your billing period." },
                { q: "Do you offer annual billing?", a: "Not yet, but it's coming soon." },
              ].map((faq, i) => (
                <FadeIn key={faq.q} delay={i * 60}>
                  <div>
                    <h3 className="text-sm font-medium">{faq.q}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{faq.a}</p>
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
                No credit card required.
              </p>
              <Link to="/login" className="mt-6 inline-block">
                <Button size="lg" className="gap-2">
                  Get started <ArrowRight className="size-4" />
                </Button>
              </Link>
            </FadeIn>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} unstatus</span>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Home</Link>
        </div>
      </footer>
    </div>
  );
}

function PlanCard({
  name,
  price,
  period,
  description,
  features,
  usagePricing,
  cta,
  highlight,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  usagePricing?: string[];
  cta: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`relative flex h-full flex-col rounded-xl p-6 ${highlight ? "border-2 border-foreground/20" : "border"}`}>
      {highlight && (
        <div className="absolute -top-2.5 left-6">
          <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[11px] font-medium text-background">
            Popular
          </span>
        </div>
      )}
      <div className="text-sm font-medium text-muted-foreground">{name}</div>
      <div className="mt-3 flex items-baseline">
        <span className="font-mono text-3xl font-semibold tracking-tight">{price}</span>
        {period && <span className="ml-1 text-sm text-muted-foreground">{period}</span>}
      </div>
      {description && <p className="mt-2 text-xs text-muted-foreground">{description}</p>}
      <div className="mt-5">{cta}</div>

      {features.length > 0 && (
        <div className="mt-5 border-t pt-4">
          <ul className="space-y-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {usagePricing && usagePricing.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Then pay as you go
          </span>
          <ul className="mt-2 space-y-1.5">
            {usagePricing.map((p) => (
              <li key={p} className="text-xs text-muted-foreground">{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
