import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { PublicNav } from "@/components/-public-nav";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

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
        <section className="mx-auto max-w-6xl px-6 pt-28 pb-8">
          <h1 className="text-3xl font-medium tracking-tight lg:text-4xl">
            Pricing
          </h1>
          <p className="mt-4 text-muted-foreground">
            Free forever. Upgrade when you need more.
          </p>
        </section>

        {/* Plans */}
        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-12 sm:grid-cols-2">
            {/* Free */}
            <div>
              <p className="text-sm text-muted-foreground">Free</p>
              <p className="mt-2 text-2xl">$0</p>
              <p className="mt-1 text-sm text-muted-foreground">1 monitor, 1 status page.</p>
              <Link to="/login" className="mt-4 inline-block">
                <Button variant="outline">Get started</Button>
              </Link>
              <ul className="mt-6 space-y-1 text-sm">
                <li>1 monitor</li>
                <li>1 status page</li>
                <li>Email alerts</li>
                <li>10 min interval</li>
              </ul>
            </div>

            {/* Pro */}
            <div>
              <p className="text-sm text-muted-foreground">Pro</p>
              <p className="mt-2 text-2xl">$15<span className="text-sm text-muted-foreground">/month</span></p>
              <p className="mt-1 text-sm text-muted-foreground">50 monitors, unlimited pages.</p>
              <Button className="mt-4" onClick={handleCheckout}>Get started</Button>
              <ul className="mt-6 space-y-1 text-sm">
                <li>50 monitors</li>
                <li>Unlimited status pages</li>
                <li>Custom domains</li>
                <li>Custom CSS</li>
                <li>Auto incidents</li>
                <li>Discord alerts</li>
                <li>API access</li>
                <li>No branding</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-sm text-muted-foreground">Questions</p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm">What happens if I exceed 50 monitors?</p>
              <p className="text-sm text-muted-foreground">Contact us for Enterprise pricing.</p>
            </div>
            <div>
              <p className="text-sm">Can I cancel anytime?</p>
              <p className="text-sm text-muted-foreground">Yes. Access continues until billing period ends.</p>
            </div>
            <div>
              <p className="text-sm">Do you offer annual billing?</p>
              <p className="text-sm text-muted-foreground">Coming soon.</p>
            </div>
            <div>
              <p className="text-sm">Is there a free trial?</p>
              <p className="text-sm text-muted-foreground">The Free plan is free forever. No trial needed.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-auto">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-6">
          <span className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} unstatus</span>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Home</Link>
        </div>
      </footer>
    </div>
  );
}
