import AutoScroll from "embla-carousel-auto-scroll";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

interface Company {
  id: string;
  label: string;
  iconUrl: string;
  websiteUrl: string;
}

interface Logos3Props {
  heading?: string;
  companies?: Company[];
}

const defaultCompanies: Company[] = [
  {
    id: "vercel",
    label: "Vercel",
    iconUrl: "https://cdn.simpleicons.org/vercel/black/white",
    websiteUrl: "https://vercel.com",
  },
  {
    id: "netlify",
    label: "Netlify",
    iconUrl: "https://cdn.simpleicons.org/netlify/black/white",
    websiteUrl: "https://netlify.com",
  },
  {
    id: "supabase",
    label: "Supabase",
    iconUrl: "https://cdn.simpleicons.org/supabase/black/white",
    websiteUrl: "https://supabase.com",
  },
  {
    id: "linear",
    label: "Linear",
    iconUrl: "https://cdn.simpleicons.org/linear/black/white",
    websiteUrl: "https://linear.app",
  },
  {
    id: "stripe",
    label: "Stripe",
    iconUrl: "https://cdn.simpleicons.org/stripe/black/white",
    websiteUrl: "https://stripe.com",
  },
  {
    id: "github",
    label: "GitHub",
    iconUrl: "https://cdn.simpleicons.org/github/black/white",
    websiteUrl: "https://github.com",
  },
  {
    id: "cloudflare",
    label: "Cloudflare",
    iconUrl: "https://cdn.simpleicons.org/cloudflare/black/white",
    websiteUrl: "https://cloudflare.com",
  },
  {
    id: "railway",
    label: "Railway",
    iconUrl: "https://cdn.simpleicons.org/railway/black/white",
    websiteUrl: "https://railway.app",
  },
];

const Logos3 = ({
  heading = "Trusted by teams who ship fast",
  companies = defaultCompanies,
}: Logos3Props) => {
  return (
    <section className="py-16 md:py-24">
      <div className="container flex flex-col items-center text-center">
        <p className="text-sm text-muted-foreground">{heading}</p>
      </div>
      <div className="pt-8 md:pt-12">
        <div className="relative mx-auto flex items-center justify-center lg:max-w-5xl">
          <Carousel
            opts={{ loop: true, }}
            plugins={[AutoScroll({ playOnInit: true, speed: 0.7 })]}
          >
            <CarouselContent className="ml-0">
              {companies.map((company) => (
                <CarouselItem
                  key={company.id}
                  className="flex basis-1/3 justify-center pl-0 sm:basis-1/4 md:basis-1/5 lg:basis-1/6"
                >
                  <a
                    href={company.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mx-10 flex shrink-0 items-center justify-center opacity-60 grayscale transition-opacity hover:opacity-100"
                  >
                    <img
                      src={company.iconUrl}
                      alt={company.label}
                      className="h-7 w-auto"
                    />
                  </a>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          <div className="absolute inset-y-0 left-0 w-12 bg-linear-to-r from-background to-transparent" />
          <div className="absolute inset-y-0 right-0 w-12 bg-linear-to-l from-background to-transparent" />
        </div>
      </div>
    </section>
  );
};

export { Logos3 };
export type { Company };
