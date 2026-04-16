const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  operational: { label: "Operational", color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  degraded_performance: { label: "Degraded", color: "text-yellow-600 dark:text-yellow-400", dot: "bg-yellow-500" },
  partial_outage: { label: "Partial Outage", color: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
  major_outage: { label: "Major Outage", color: "text-red-600 dark:text-red-400", dot: "bg-red-500" },
  maintenance: { label: "Maintenance", color: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  unknown: { label: "Unknown", color: "text-muted-foreground", dot: "bg-muted-foreground" },
};

export function ServiceStatusBadge({ status, size = "sm" }: { status: string | null; size?: "sm" | "md" }) {
  const config = STATUS_CONFIG[status ?? "unknown"] ?? STATUS_CONFIG.unknown!;
  const dotSize = size === "md" ? "size-2.5" : "size-2";
  const textSize = size === "md" ? "text-sm" : "text-xs";

  return (
    <span className={`inline-flex items-center gap-1.5 ${config.color}`}>
      <span className={`${dotSize} shrink-0 rounded-full ${config.dot}`} />
      <span className={textSize}>{config.label}</span>
    </span>
  );
}

export { STATUS_CONFIG };
