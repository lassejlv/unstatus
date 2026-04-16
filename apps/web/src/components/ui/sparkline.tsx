import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface SparklineProps {
  /** Array of numeric values to plot */
  data: number[];
  /** Width of the sparkline in pixels */
  width?: number;
  /** Height of the sparkline in pixels */
  height?: number;
  /** Stroke color - defaults to currentColor */
  color?: string;
  /** Fill color for area under line - defaults to color with opacity */
  fillColor?: string;
  /** Show gradient fill under the line */
  showFill?: boolean;
  /** Additional class names */
  className?: string;
  /** Stroke width */
  strokeWidth?: number;
}

/**
 * A minimal sparkline chart for displaying trends inline.
 * Uses SVG for crisp rendering at any size.
 */
export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "currentColor",
  fillColor,
  showFill = true,
  className,
  strokeWidth = 1.5,
}: SparklineProps) {
  const path = useMemo(() => {
    if (!data.length) return "";

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - min) / range) * chartHeight;
      return { x, y };
    });

    // Create smooth curve using bezier
    let pathD = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      pathD += ` Q ${cpx} ${prev.y} ${cpx} ${(prev.y + curr.y) / 2}`;
      pathD += ` Q ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
    }

    return pathD;
  }, [data, width, height]);

  const areaPath = useMemo(() => {
    if (!data.length || !showFill) return "";

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - min) / range) * chartHeight;
      return { x, y };
    });

    let pathD = `M ${points[0].x} ${height}`;
    pathD += ` L ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      pathD += ` Q ${cpx} ${prev.y} ${cpx} ${(prev.y + curr.y) / 2}`;
      pathD += ` Q ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
    }

    pathD += ` L ${points[points.length - 1].x} ${height}`;
    pathD += " Z";

    return pathD;
  }, [data, width, height, showFill]);

  if (!data.length) {
    return (
      <div
        className={cn("flex items-center justify-center text-muted-foreground", className)}
        style={{ width, height }}
      >
        <span className="text-[10px]">No data</span>
      </div>
    );
  }

  const gradientId = `sparkline-gradient-${Math.random().toString(36).slice(2)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={fillColor || color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={fillColor || color} stopOpacity={0.05} />
        </linearGradient>
      </defs>

      {/* Area fill */}
      {showFill && areaPath && (
        <path d={areaPath} fill={`url(#${gradientId})`} />
      )}

      {/* Line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End point dot */}
      {data.length > 0 && (
        <circle
          cx={width - 2}
          cy={
            2 +
            (height - 4) -
            ((data[data.length - 1] - Math.min(...data)) /
              (Math.max(...data) - Math.min(...data) || 1)) *
              (height - 4)
          }
          r={2}
          fill={color}
        />
      )}
    </svg>
  );
}

// Color presets based on status
export const sparklineColors = {
  up: "#10b981", // emerald-500
  down: "#ef4444", // red-500
  degraded: "#eab308", // yellow-500
  neutral: "#6b7280", // gray-500
  primary: "#3b82f6", // blue-500
};
