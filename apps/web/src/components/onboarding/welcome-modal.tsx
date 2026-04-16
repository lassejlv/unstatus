import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Activity, Globe, Database, Layers } from "lucide-react";

interface WelcomeModalProps {
  open: boolean;
  onComplete: (useCase?: string) => void;
  onSkip: () => void;
}

const useCases = [
  {
    id: "api",
    label: "API / Backend",
    description: "Monitor APIs, servers, and backend services",
    icon: Activity,
  },
  {
    id: "website",
    label: "Website / Frontend",
    description: "Track website availability and performance",
    icon: Globe,
  },
  {
    id: "database",
    label: "Database",
    description: "Monitor database health and connectivity",
    icon: Database,
  },
  {
    id: "other",
    label: "Other",
    description: "Custom monitoring setup",
    icon: Layers,
  },
];

export function WelcomeModal({ open, onComplete, onSkip }: WelcomeModalProps) {
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);
  const [step, setStep] = useState<"welcome" | "usecase">("welcome");

  const handleContinue = () => {
    if (step === "welcome") {
      setStep("usecase");
    } else {
      onComplete(selectedUseCase ?? undefined);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg overflow-hidden border-0 bg-transparent p-0 shadow-none [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="rounded-xl border bg-card p-6 shadow-2xl"
        >
          <AnimatePresence mode="wait">
            {step === "welcome" ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center text-center"
              >
                {/* Logo / Brand */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary"
                >
                  <Activity className="size-8 text-primary-foreground" />
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-2xl font-semibold"
                >
                  Welcome to Unstatus
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-2 text-sm text-muted-foreground"
                >
                  Simple, reliable uptime monitoring for your services.
                  <br />
                  Let's get you set up in under 2 minutes.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="mt-6 flex w-full flex-col gap-2"
                >
                  <Button onClick={handleContinue} size="lg" className="w-full">
                    Get started
                  </Button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    I'll explore on my own
                  </button>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="usecase"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <h2 className="text-lg font-semibold">
                  What are you monitoring?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  This helps us personalize your experience.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {useCases.map((useCase, index) => {
                    const Icon = useCase.icon;
                    const isSelected = selectedUseCase === useCase.id;

                    return (
                      <motion.button
                        key={useCase.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * index }}
                        type="button"
                        onClick={() => setSelectedUseCase(useCase.id)}
                        className={cn(
                          "flex flex-col items-start rounded-lg border p-3 text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:border-foreground/20 hover:bg-accent"
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-8 items-center justify-center rounded-md",
                            isSelected ? "bg-primary/10" : "bg-muted"
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-4",
                              isSelected
                                ? "text-primary"
                                : "text-muted-foreground"
                            )}
                          />
                        </div>
                        <span className="mt-2 text-sm font-medium">
                          {useCase.label}
                        </span>
                        <span className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {useCase.description}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <Button
                    onClick={handleContinue}
                    disabled={!selectedUseCase}
                    className="w-full"
                  >
                    Continue
                  </Button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip for now
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
