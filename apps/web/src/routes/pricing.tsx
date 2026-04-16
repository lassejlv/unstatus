import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { PublicNav } from "@/components/-public-nav";
import { MarketingFooter } from "@/components/-marketing-footer";
import { PricingCard } from "@/components/ui/pricing";
import { Check, Minus, Shield, Zap, HeadphonesIcon } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

const faqs = [
  {
    q: "What happens if I hit my plan's monitor limit?",
    a: "You can upgrade to a higher plan at any time. Your existing monitors and data are preserved during the upgrade."
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, you can cancel your subscription at any time. You'll retain access to paid features until the end of your current billing period, then automatically move to the Free plan."
  },
  {
    q: "Is there a free trial?",
    a: "The Free plan is free forever with no time limit. Start there and upgrade when you need more monitors or faster check intervals."
  },
  {
    q: "What is multi-region monitoring?",
    a: "Scale plan monitors run from multiple geographic locations (US, EU, Asia). This prevents false alerts from regional network issues and gives you a global view of your service availability."
  },
  {
    q: "What are auto incidents?",
    a: "When a monitor detects downtime, the system automatically creates an incident on your status page and updates it when service recovers. No manual intervention required."
  },
  {
    q: "How secure is my data?",
    a: "All data is encrypted in transit via TLS. We never store your endpoint responses - only status and timing metadata."
  },
  {
    q: "What kind of support do you offer?",
    a: "All plans include email support. We typically respond within 24 hours on business days. For urgent issues, we prioritize based on severity regardless of plan."
  },
  {
    q: "Can I get a refund?",
    a: "If you're not satisfied within the first 14 days of a paid subscription, contact us for a full refund - no questions asked."
  },
  {
    q: "Do you offer custom plans for larger teams?",
    a: "Yes. If you need more than 50 monitors or have specific requirements, reach out and we'll create a custom plan that fits your needs."
  },
];

// Feature comparison data
const comparisonFeatures = [
  { name: "Monitors", free: "1", hobby: "10", scale: "50" },
  { name: "Status pages", free: "1", hobby: "3", scale: "Unlimited" },
  { name: "Check interval", free: "10 min", hobby: "1 min", scale: "10 sec" },
  { name: "Email alerts", free: true, hobby: true, scale: true },
  { name: "Discord alerts", free: false, hobby: true, scale: true },
  { name: "Custom domains", free: false, hobby: true, scale: true },
  { name: "API access", free: false, hobby: true, scale: true },
  { name: "Custom CSS", free: false, hobby: false, scale: true },
  { name: "Auto incidents", free: false, hobby: false, scale: true },
  { name: "Multi-region checks", free: false, hobby: false, scale: true },
  { name: "Remove branding", free: false, hobby: false, scale: true },
];

function PricingPage() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  const handleAction = (plan: "free" | "hobby" | "scale") => {
    if (plan === "free") { navigate({ to: "/login" }); return; }
    if (!session) { navigate({ to: "/login" }); return; }
    navigate({ to: "/dashboard/billing" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicNav active="/pricing" />

      <main className="flex-1">
        {/* Header */}
        <section className="mx-auto max-w-5xl px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-20 lg:pt-24 lg:pb-16">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
            Pricing
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground sm:mt-4 sm:text-base">
            Start free, upgrade when you need more.
          </p>
        </section>

        {/* Plans */}
        <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="flex flex-col justify-between rounded-xl border p-1.5 sm:p-2">
            <div className="flex flex-col gap-4 md:flex-row md:gap-2">
              <PricingCard
                title="Free"
                price="$0"
                priceSuffix="forever"
                description="For side projects and personal use."
                buttonText="Start free"
                buttonVariant="outline"
                onAction={() => handleAction("free")}
                features={[
                  { text: "1 monitor", detail: "HTTP, TCP, or ping" },
                  { text: "1 status page", detail: "Hosted on unstatus.com" },
                  { text: "Email alerts", detail: "Instant notifications" },
                  { text: "10 min checks", detail: "Standard interval" },
                ]}
              />

              <PricingCard
                title="Hobby"
                price="$15"
                priceSuffix="/ month"
                description="For production apps that need faster detection."
                buttonText="Upgrade to Hobby"
                buttonVariant="outline"
                onAction={() => handleAction("hobby")}
                inheritFrom="Free"
                features={[
                  { text: "10 monitors", detail: "Monitor all your services" },
                  { text: "3 status pages", detail: "Separate pages per project" },
                  { text: "1 min checks", detail: "Faster issue detection" },
                  { text: "Custom domains", detail: "status.yourdomain.com" },
                  { text: "Discord alerts", detail: "Post to your server" },
                  { text: "API access", detail: "Automate your workflows" },
                ]}
              />

              <PricingCard
                title="Scale"
                badge="Most popular"
                price="$49"
                priceSuffix="/ month"
                description="For teams running critical infrastructure."
                buttonText="Upgrade to Scale"
                buttonVariant="default"
                highlight
                onAction={() => handleAction("scale")}
                inheritFrom="Hobby"
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
          </div>
        </section>

        {/* Trust badges */}
        <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="flex flex-col items-center justify-center gap-4 text-sm text-muted-foreground sm:flex-row sm:gap-8">
            <div className="flex items-center gap-2">
              <Shield className="size-4" />
              <span>14-day money-back guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="size-4" />
              <span>No credit card for free plan</span>
            </div>
            <div className="flex items-center gap-2">
              <HeadphonesIcon className="size-4" />
              <span>Email support on all plans</span>
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section className="border-t">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
            <h2 className="text-lg font-semibold tracking-tight text-center sm:text-xl">Compare plans</h2>
            <p className="mt-2 text-center text-xs text-muted-foreground sm:text-sm">See exactly what's included in each plan</p>

            <div className="-mx-4 mt-6 overflow-x-auto sm:mx-0 sm:mt-8">
              <table className="w-full min-w-[480px] text-xs sm:text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2.5 px-3 text-left font-medium sm:py-3 sm:px-4">Feature</th>
                    <th className="py-2.5 px-3 text-center font-medium sm:py-3 sm:px-4">Free</th>
                    <th className="py-2.5 px-3 text-center font-medium sm:py-3 sm:px-4">Hobby</th>
                    <th className="py-2.5 px-3 text-center font-medium bg-secondary/50 rounded-t-lg sm:py-3 sm:px-4">Scale</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature, idx) => (
                    <tr key={feature.name} className={idx < comparisonFeatures.length - 1 ? "border-b border-border/50" : ""}>
                      <td className="py-2.5 px-3 text-muted-foreground sm:py-3 sm:px-4">{feature.name}</td>
                      <td className="py-2.5 px-3 text-center sm:py-3 sm:px-4">
                        {typeof feature.free === "boolean" ? (
                          feature.free ? <Check className="mx-auto size-3.5 text-foreground sm:size-4" /> : <Minus className="mx-auto size-3.5 text-muted-foreground/50 sm:size-4" />
                        ) : (
                          <span>{feature.free}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center sm:py-3 sm:px-4">
                        {typeof feature.hobby === "boolean" ? (
                          feature.hobby ? <Check className="mx-auto size-3.5 text-foreground sm:size-4" /> : <Minus className="mx-auto size-3.5 text-muted-foreground/50 sm:size-4" />
                        ) : (
                          <span>{feature.hobby}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center bg-secondary/50 sm:py-3 sm:px-4">
                        {typeof feature.scale === "boolean" ? (
                          feature.scale ? <Check className="mx-auto size-3.5 text-foreground sm:size-4" /> : <Minus className="mx-auto size-3.5 text-muted-foreground/50 sm:size-4" />
                        ) : (
                          <span className="font-medium">{feature.scale}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
            <h2 className="text-lg font-semibold tracking-tight text-center sm:text-xl">Questions</h2>
            <div className="mt-8 grid gap-x-8 gap-y-6 sm:mt-10 sm:grid-cols-2 lg:gap-x-12 lg:gap-y-8">
              {faqs.map((faq) => (
                <div key={faq.q}>
                  <p className="text-sm font-medium">{faq.q}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:mt-2">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-5xl px-4 py-12 text-center sm:px-6 sm:py-16">
            <p className="text-sm text-muted-foreground sm:text-base">Set up your first monitor in under 2 minutes.</p>
            <Link to="/login" className="mt-4 inline-block">
              <Button size="lg">Start for free</Button>
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
