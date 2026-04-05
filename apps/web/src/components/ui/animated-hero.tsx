import { useEffect, useMemo, useState } from "react";
import { MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

function Hero() {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["reliable", "fast", "simple", "transparent", "beautiful"],
    []
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTitleNumber((current) => (current + 1) % titles.length);
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [titles]);

  return (
    <div className="w-full">
      <div className="container mx-auto">
        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">
          <div className="flex gap-4 flex-col">
            <h1 className="max-w-2xl text-center text-5xl tracking-tighter font-normal md:text-7xl">
              <span className="block">Monitoring that&apos;s</span>
              <span className="mt-2 block h-[1.1em] text-center leading-none md:mt-3">
                <span
                  key={titles[titleNumber]}
                  className="inline-flex min-w-[11ch] justify-center whitespace-nowrap animate-fade-in font-semibold"
                >
                  {titles[titleNumber]}
                </span>
              </span>
            </h1>

            <p className="text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl text-center">
              Know when your services go down. Tell your users what&apos;s happening.
              Uptime checks, status pages, and alerts — all in one place.
            </p>
          </div>
          <div className="flex flex-row gap-3">
            <Button size="lg" variant="outline" asChild>
              <Link to="/pricing">
                Pricing <MoveRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" asChild>
              <Link to="/login">
                Get started <MoveRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Hero };
