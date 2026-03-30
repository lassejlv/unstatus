import { useState, useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Check } from "lucide-react";

function AnimatedPrice({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const from = prevValueRef.current;
    const to = value;

    if (from === to) return;

    const duration = 600;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 1) {
        // Random scramble effect that settles
        const randomOffset = Math.floor(Math.random() * 10) + 1;
        const target = from + (to - from) * progress;
        const scrambled = Math.round(
          target + (Math.random() - 0.5) * randomOffset * (1 - progress),
        );
        setDisplayValue(scrambled);
        requestAnimationFrame(tick);
      } else {
        setDisplayValue(to);
      }
    };

    requestAnimationFrame(tick);
    prevValueRef.current = to;
  }, [value]);

  return <span className="tabular-nums">{displayValue}</span>;
}

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/Logo.png" alt="unstatus" className="size-14" />
            <span className="text-[15px] font-medium">unstatus</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              to="/pricing"
              className="text-[15px] font-medium text-foreground"
            >
              Pricing
            </Link>
            <Link
              to="/"
              className="text-[15px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Status
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-[15px]">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6">
        {/* Pricing Header */}
        <section className="mx-auto max-w-6xl pt-16 pb-12 text-center">
          <h1 className="text-[36px] font-medium tracking-[-0.02em]">
            Simple pricing
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Start free, upgrade when you need more.
          </p>
        </section>

        {/* Pricing Cards */}
        <section className="mx-auto max-w-4xl pb-32">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Free */}
            <div className="border p-6">
              <h2 className="text-[15px] font-medium">Free</h2>
              <p className="mt-1 text-[15px] text-muted-foreground">
                For personal projects
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-[32px] font-medium">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <Link to="/login">
                <Button
                  variant="outline"
                  className="mt-6 w-full h-10 text-[15px] font-normal"
                >
                  Get started
                </Button>
              </Link>
              <ul className="mt-8 space-y-3">
                <li className="flex items-start gap-3 text-[15px]">
                  <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  1 status page
                </li>
                <li className="flex items-start gap-3 text-[15px]">
                  <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  3 team members
                </li>
                <li className="flex items-start gap-3 text-[15px]">
                  <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  Email notifications
                </li>
                <li className="flex items-start gap-3 text-[15px]">
                  <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  30-day incident history
                </li>
              </ul>
            </div>

            {/* Pro */}
            <div className="border p-6">
              <h2 className="text-[15px] font-medium">Pro</h2>
              <p className="mt-1 text-[15px] text-muted-foreground">
                For growing teams
              </p>

              {/* Billing toggle inside Pro card */}
              <div className="mt-4 flex items-center gap-3">
                <span
                  className={`text-[14px] ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}
                >
                  Monthly
                </span>
                <Switch
                  size="sm"
                  checked={isAnnual}
                  onCheckedChange={setIsAnnual}
                />
                <span
                  className={`text-[14px] ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}
                >
                  Annual
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-[32px] font-medium">$</span>
                <span className="text-[32px] font-medium">
                  <AnimatedPrice value={isAnnual ? 168 : 15} />
                </span>
                <span className="text-muted-foreground">
                  {isAnnual ? "/year" : "/month"}
                </span>
              </div>
              <p
                className={`mt-1 text-[14px] ${isAnnual ? "text-green-600 dark:text-green-500" : "text-muted-foreground"}`}
              >
                {isAnnual ? "Save $12/year" : "Switch to annual to save $12"}
              </p>

              <Link to="/login">
                <Button className="mt-5 w-full h-10 text-[15px] font-normal">
                  Get started
                </Button>
              </Link>
              <ul className="mt-8 space-y-3">
                <li className="flex items-start gap-3 text-[15px]">
                  <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  Unlimited status pages
                </li>
                <li className="flex items-start gap-3 text-[15px]">
                  <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  Unlimited team members
                </li>
                <li className="flex items-start gap-3 text-[15px]">
                  <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  Email & SMS notifications
                </li>
                <li className="flex items-start gap-3 text-[15px]">
                  <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  Custom domains
                </li>
                <li className="flex items-start gap-3 text-[15px]">
                  <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  Unlimited history
                </li>
                <li className="flex items-start gap-3 text-[15px]">
                  <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  API access
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t px-6 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-[14px] text-muted-foreground">
            © 2026 unstatus
          </span>
          <Link
            to="/"
            className="text-[14px] text-muted-foreground transition-colors hover:text-foreground"
          >
            System status →
          </Link>
        </div>
      </footer>
    </div>
  );
}
