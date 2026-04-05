import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function ProBadge({ label }: { label?: string }) {
  return (
    <Badge variant="outline" className="text-[10px] gap-0.5">
      <Sparkles className="size-2.5" />
      {label ?? "Pro"}
    </Badge>
  );
}

export function UpgradePrompt({ feature }: { feature: string }) {
  return (
    <div className="rounded-lg border border-dashed p-4 text-center">
      <p className="text-sm text-muted-foreground">{feature} requires a paid plan.</p>
      <Link to="/pricing">
        <Button size="sm" variant="outline" className="mt-2 gap-1">
          <Sparkles className="size-3" />
          Upgrade
        </Button>
      </Link>
    </div>
  );
}
