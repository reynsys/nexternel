"use client";

import type { ReactNode } from "react";

/**
 * Renders children at full dashboard layout size, then scales down uniformly
 * so the edit grid shows a proportional miniature of the live dashboard.
 */
export function DashboardEditorScaledContent({
  scale,
  children,
}: {
  scale: number;
  children: ReactNode;
}) {
  if (scale >= 0.999) {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    );
  }

  const invPercent = (1 / scale) * 100;

  return (
    <div className="relative h-full min-h-0 min-w-0 flex-1 overflow-hidden">
      <div
        className="origin-top-left"
        style={{
          width: `${invPercent}%`,
          height: `${invPercent}%`,
          transform: `scale(${scale})`,
        }}
      >
        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
