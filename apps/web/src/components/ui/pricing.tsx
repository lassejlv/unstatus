import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface PricingCardProps {
  title: string;
  price: string;
  description: string;
  features: string[];
  highlight?: boolean;
  buttonVariant?: "default" | "outline";
  onAction?: () => void;
}

export function PricingCard({
  title,
  price,
  description,
  features,
  highlight = false,
  buttonVariant = "outline",
  onAction,
}: PricingCardProps) {
  return (
    <div
      className={`flex flex-1 flex-col justify-between p-6 space-y-4 ${
        highlight ? "bg-secondary rounded-xl" : ""
      }`}
    >
      <div className="space-y-4">
        <div>
          <h2 className="font-medium">{title}</h2>
          <span className="my-3 block text-2xl font-semibold">{price}</span>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>

        <Button className="w-full" variant={buttonVariant} onClick={onAction}>
          Get started
        </Button>
      </div>

      <ul className={`${highlight ? "mt-4" : "border-t pt-4"} list-outside space-y-3 text-sm`}>
        {features.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <Check className="size-3" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
