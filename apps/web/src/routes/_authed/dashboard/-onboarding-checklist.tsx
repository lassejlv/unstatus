import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Activity, Globe, Bell, Check, X } from "lucide-react";
import { motion } from "motion/react";

type Step = {
  key: string;
  title: string;
  description: string;
  doneText: string;
  icon: typeof Activity;
  to: string;
  search: Record<string, string>;
  buttonLabel: string;
};

const STEPS: Step[] = [
  {
    key: "monitor",
    title: "Create a monitor",
    description: "Track uptime for your API, website, or service.",
    doneText: "Monitor running",
    icon: Activity,
    to: "/dashboard/monitors",
    search: {},
    buttonLabel: "Add monitor",
  },
  {
    key: "statusPage",
    title: "Create a status page",
    description: "Share service status with your users.",
    doneText: "Status page live",
    icon: Globe,
    to: "/dashboard/status-pages",
    search: {},
    buttonLabel: "Create page",
  },
  {
    key: "notification",
    title: "Set up notifications",
    description: "Get alerted via Discord or email when things break.",
    doneText: "Notifications set",
    icon: Bell,
    to: "/dashboard/notifications",
    search: {},
    buttonLabel: "Add channel",
  },
];

export function OnboardingChecklist({
  steps,
  completedCount,
  onDismiss,
}: {
  steps: { monitor: boolean; statusPage: boolean; notification: boolean };
  completedCount: number;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col gap-4"
    >
      {/* Header */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-sm font-semibold">Set up your workspace</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Complete these steps to start monitoring — {completedCount} of 3 done
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
        <Progress value={(completedCount / 3) * 100} className="mt-3 h-1.5" />
      </div>

      {/* Steps */}
      <div className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, i) => {
          const done = steps[step.key as keyof typeof steps];
          const Icon = step.icon;
          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * (i + 1) }}
              className={`flex flex-col gap-3 rounded-lg border p-4 transition-colors ${
                done ? "border-emerald-500/20 bg-emerald-500/5" : "bg-card"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {done ? (
                  <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10">
                    <Check className="size-3.5 text-emerald-500" />
                  </div>
                ) : (
                  <div className="flex size-7 items-center justify-center rounded-md border bg-muted/50">
                    <Icon className="size-3.5 text-muted-foreground" />
                  </div>
                )}
                <span className="text-sm font-medium">{step.title}</span>
              </div>

              {done ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {step.doneText}
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                  <Link to={step.to} search={step.search} className="mt-auto">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      {step.buttonLabel}
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Skip */}
      <div className="text-center">
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip setup — you can always find these in the sidebar
        </button>
      </div>
    </motion.div>
  );
}
