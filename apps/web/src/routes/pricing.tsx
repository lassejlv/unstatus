import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { PublicNav } from "@/components/-public-nav";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "For side projects and personal use.",
    cta: "Get started",
    ctaVariant: "outline" as const,
    highlight: false,
    features: [
      "1 monitor",
      "1 status page",
      "Email alerts",
      "10 min check interval",
    ],
  },
  {
    name: "Pro",
    price: "$15",
    period: "/mo",
    description: "For teams that need reliability.",
    cta: "Get started",
    ctaVariant: "default" as const,
    highlight: true,
    features: [
      "50 monitors",
      "Unlimited status pages",
      "Custom domains",
      "Custom CSS",
      "Auto incidents",
      "Multi-region checks",
      "Discord alerts",
      "API access",
      "Remove branding",
    ],
  },
];

const faqs = [
  { q: "What happens if I exceed 50 monitors?", a: "Contact us for Enterprise pricing." },
  { q: "Can I cancel anytime?", a: "Yes. Access continues until your billing period ends." },
  { q: "Do you offer annual billing?", a: "Coming soon." },
  { q: "Is there a free trial?", a: "The Free plan is free forever. No trial needed." },
];

function PricingPage() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  const handleAction = (highlight: boolean) => {
    if (!highlight) { navigate({ to: "/login" }); return; }
    if (!session) { navigate({ to: "/login" }); return; }
    navigate({ to: "/dashboard/billing" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicNav active="/pricing" />

      <main className="flex-1">
        {/* Header */}
        <section className="mx-auto max-w-3xl px-6 pt-28 pb-12 text-center">
          <h1 className="text-3xl font-medium tracking-tight lg:text-4xl">
            Pricing
          </h1>
          <p className="mt-3 text-muted-foreground">
            Free forever. Upgrade when you need more.
          </p>
        </section>

        {/* Plans */}
        <section className="mx-auto max-w-3xl px-6 pb-16">
          <div className="grid gap-6 sm:grid-cols-2">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-lg border p-6 ${
                  plan.highlight ? "border-foreground/20 ring-1 ring-foreground/5" : ""
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-foreground px-2.5 py-0.5 text-[11px] font-medium text-background">
                    Popular
                  </span>
                )}

                <p className="text-sm font-medium">{plan.name}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">
                  {plan.price}
                  {plan.period && <span className="text-sm font-normal text-muted-foreground">{plan.period}</span>}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>

                <Button
                  variant={plan.ctaVariant}
                  className="mt-5 w-full"
                  onClick={() => handleAction(plan.highlight)}
                >
                  {plan.cta}
                </Button>

                <ul className="mt-6 flex-1 space-y-2.5 border-t pt-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <Check className="size-3.5 shrink-0 text-muted-foreground" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t">
          <div className="mx-auto max-w-3xl px-6 py-16">
            <h2 className="text-lg font-medium tracking-tight">Questions</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {faqs.map((faq) => (
                <div key={faq.q}>
                  <p className="text-sm font-medium">{faq.q}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center">
            <p className="text-muted-foreground">Ready to start monitoring?</p>
            <Link to="/login" className="mt-4 inline-block">
              <Button>Get started</Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-6">
          <span className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} unstatus</span>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Home</Link>
            <Link to="/legal" className="text-xs text-muted-foreground hover:text-foreground">Legal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
