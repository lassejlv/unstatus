import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, ChevronDown, ChevronUp, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickStartCardProps {
  onCreateMonitor: (data: {
    url: string;
    name: string;
    interval: number;
  }) => Promise<void>;
  isCreating?: boolean;
  isComplete?: boolean;
  monitorName?: string;
  onDismiss?: () => void;
}

const intervals = [
  { value: 60, label: "Every 1 minute" },
  { value: 300, label: "Every 5 minutes" },
  { value: 600, label: "Every 10 minutes" },
];

function extractNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove www. prefix and get hostname
    const hostname = parsed.hostname.replace(/^www\./, "");
    // Capitalize first letter
    return hostname.charAt(0).toUpperCase() + hostname.slice(1);
  } catch {
    return "";
  }
}

export function QuickStartCard({
  onCreateMonitor,
  isCreating = false,
  isComplete = false,
  monitorName,
  onDismiss,
}: QuickStartCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [interval, setInterval] = useState(300);
  const [urlTouched, setUrlTouched] = useState(false);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    // Auto-generate name from URL if name hasn't been manually edited
    if (!name || name === extractNameFromUrl(url)) {
      setName(extractNameFromUrl(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !name) return;

    // Ensure URL has protocol
    let finalUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      finalUrl = `https://${url}`;
    }

    await onCreateMonitor({ url: finalUrl, name, interval });
  };

  const isValidUrl = (value: string) => {
    if (!value) return true; // Don't show error for empty
    try {
      new URL(value.startsWith("http") ? value : `https://${value}`);
      return true;
    } catch {
      return false;
    }
  };

  const showUrlError = urlTouched && url && !isValidUrl(url);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-lg border bg-card overflow-hidden"
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-md",
              isComplete ? "bg-emerald-500/10" : "bg-primary/10"
            )}
          >
            {isComplete ? (
              <Check className="size-4 text-emerald-500" />
            ) : (
              <Zap className="size-4 text-primary" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium">
              {isComplete ? "Your first monitor is live!" : "Quick start"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isComplete
                ? `${monitorName} is now being monitored`
                : "Create your first monitor in seconds"}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && !isComplete && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <form onSubmit={handleSubmit} className="border-t p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                {/* URL Input */}
                <div className="sm:col-span-2">
                  <Label htmlFor="quick-url" className="text-xs">
                    URL to monitor
                  </Label>
                  <Input
                    id="quick-url"
                    type="text"
                    placeholder="https://api.example.com"
                    value={url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    onBlur={() => setUrlTouched(true)}
                    className={cn(
                      "mt-1.5",
                      showUrlError && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {showUrlError && (
                    <p className="mt-1 text-xs text-destructive">
                      Please enter a valid URL
                    </p>
                  )}
                </div>

                {/* Interval Select */}
                <div>
                  <Label htmlFor="quick-interval" className="text-xs">
                    Check interval
                  </Label>
                  <Select
                    value={interval.toString()}
                    onValueChange={(v) => setInterval(parseInt(v))}
                  >
                    <SelectTrigger id="quick-interval" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {intervals.map((int) => (
                        <SelectItem key={int.value} value={int.value.toString()}>
                          {int.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Name Input (auto-filled) */}
              <div className="mt-3">
                <Label htmlFor="quick-name" className="text-xs">
                  Monitor name
                </Label>
                <Input
                  id="quick-name"
                  type="text"
                  placeholder="My API"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center justify-between">
                <Button
                  type="submit"
                  disabled={!url || !name || !isValidUrl(url) || isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create & start monitoring"
                  )}
                </Button>
                {onDismiss && (
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        )}

        {isExpanded && isComplete && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t p-4"
          >
            <p className="text-sm text-muted-foreground">
              We're now checking your service every few minutes. You'll be
              notified if anything goes wrong.
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href="/dashboard/monitors">View monitors</a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/dashboard/status-pages">Create status page</a>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
