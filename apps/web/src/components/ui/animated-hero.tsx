import { MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

function Hero() {
  return (
    <section className="w-full">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-center gap-8 py-16 sm:py-20 lg:py-28">
          <div className="flex flex-col gap-5">
            <h1 className="mx-auto max-w-2xl text-center text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Uptime monitoring and status pages
            </h1>

            <p className="mx-auto max-w-lg text-center text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
              Know the moment your services go down. Keep users informed with beautiful status pages. Get alerts via email, Discord, or webhooks.
            </p>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link to="/login">
                  Start for free <MoveRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/pricing">
                  See pricing
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Free forever. No credit card required.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export { Hero };
