"use client";

import { useEffect, useRef, useState } from "react";

export function parseAspectRatio(ratio: string): number {
  const parts = ratio.split("/").map((s) => parseFloat(s.trim()));
  if (parts.length !== 2 || !parts[0] || !parts[1]) return 2;
  return parts[0] / parts[1];
}

function fitFrame(cw: number, ch: number, ratio: number): { width: number; height: number } {
  if (cw < 2 || ch < 2) return { width: 0, height: 0 };
  let width = cw;
  let height = width / ratio;
  if (height > ch) {
    height = ch;
    width = height * ratio;
  }
  return {
    width: Math.max(0, Math.floor(width)),
    height: Math.max(0, Math.floor(height)),
  };
}

/** Fit a gauge dial inside its container (width- or height-limited), like SVG preserveAspectRatio meet. */
export function useGaugeAspectFit(aspectRatio: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ratio = parseAspectRatio(aspectRatio);

    const update = () => {
      const next = fitFrame(el.clientWidth, el.clientHeight, ratio);
      setFrame((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next
      );
    };

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, [aspectRatio]);

  return { containerRef, frame };
}
