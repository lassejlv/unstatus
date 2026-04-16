import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface FeatureItem {
  text: string;
  detail?: string;
}

interface PricingCardProps {
  title: string;
  price: string;
  priceSuffix?: string;
  description: string;
  features: (string | FeatureItem)[];
  highlight?: boolean;
  buttonVariant?: "default" | "outline";
  buttonText?: string;
  badge?: string;
  inheritFrom?: string;
  onAction?: () => void;
}

export function PricingCard({
  title,
  price,
  priceSuffix,
  description,
  features,
  highlight = false,
  buttonVariant = "outline",
  buttonText = "Get started",
  badge,
  inheritFrom,
  onAction,
}: PricingCardProps) {
  return (
    <div
      className={`flex flex-1 flex-col justify-between space-y-4 p-4 sm:space-y-5 sm:p-6 ${
        highlight ? "rounded-xl bg-secondary" : ""
      }`}
    >
      <div className="space-y-4 sm:space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-medium">{title}</h2>
            {badge && (
              <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background">
                {badge}
              </span>
            )}
          </div>
          <div className="my-2.5 flex items-baseline gap-1.5 sm:my-3">
            <span className="text-2xl font-semibold tracking-tight sm:text-3xl">{price}</span>
            {priceSuffix && (
              <span className="text-xs text-muted-foreground sm:text-sm">{priceSuffix}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">{description}</p>
        </div>

        <Button className="w-full" variant={buttonVariant} onClick={onAction}>
          {buttonText}
        </Button>
      </div>

      <div className={`${highlight ? "mt-3 sm:mt-4" : "border-t pt-3 sm:pt-4"}`}>
        {inheritFrom && (
          <p className="mb-2.5 text-xs text-muted-foreground sm:mb-3">
            Everything in {inheritFrom}, plus:
          </p>
        )}
        <ul className="list-outside space-y-2.5 text-sm sm:space-y-3">
          {features.map((item, index) => {
            const feature = typeof item === "string" ? { text: item } : item;
            return (
              <li key={index} className="flex items-start gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-muted-foreground sm:size-4" />
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm">{feature.text}</span>
                  {feature.detail && (
                    <span className="text-xs text-muted-foreground">{feature.detail}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
