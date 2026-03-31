import type { ReactNode } from "react";

export function Canvas({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex-1 overflow-auto"
      style={{
        backgroundImage: `radial-gradient(circle, color-mix(in oklch, var(--foreground) 15%, transparent) 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      }}
    >
      <div className="p-4">{children}</div>
    </div>
  );
}
