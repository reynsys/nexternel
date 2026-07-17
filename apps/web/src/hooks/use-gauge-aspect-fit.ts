"use client";

import { useEffect, useRef, useState } from "react";

export function parseAspectRatio(ratio: string): number {
  const parts = ratio.split("/").map((s) => parseFloat(s.trim()));
  if (parts.length !== 2 || !parts[0] || !parts[1]) return 2;
  return parts[0] / parts[1];
}

/**
 * Largest box with the given width/height ratio that fits in (cw × ch) — SVG "meet".
 * `inset` (< 1) shrinks the box so arc ends / outer ticks are not clipped by
 * parent `overflow: hidden` + rounded widget shells.
 */
export function fitFrame(
  cw: number,
  ch: number,
  ratio: number,
  inset = 1
): { width: number; height: number } {
  if (cw < 2 || ch < 2) return { width: 0, height: 0 };
  const scale = Math.min(Math.max(inset, 0.5), 1);
  let width = cw;
  let height = width / ratio;
  if (height > ch) {
    height = ch;
    width = height * ratio;
  }
  return {
    width: Math.max(0, Math.round(width * scale)),
    height: Math.max(0, Math.round(height * scale)),
  };
}

/**
 * Fit a gauge dial inside its container (width- or height-limited).
 * Uses getBoundingClientRect so padding/transform ancestors don't under-report size.
 */
export function useGaugeAspectFit(aspectRatio: string, inset = 1) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ratio = parseAspectRatio(aspectRatio);

    const update = () => {
      const rect = el.getBoundingClientRect();
      const next = fitFrame(rect.width, rect.height, ratio, inset);
      setFrame((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next
      );
    };

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, [aspectRatio, inset]);

  return { containerRef, frame };
}
