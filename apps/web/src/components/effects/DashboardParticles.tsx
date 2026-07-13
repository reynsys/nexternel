"use client";

import { useMemo } from "react";
import Particles from "@tsparticles/react";
import { useUIThemeStore } from "@/store/ui-theme.store";
import { particleOptions } from "@/lib/particle-presets";

export function DashboardParticles() {
  const particles = useUIThemeStore((s) => s.particles);
  const options = useMemo(() => particleOptions(particles), [particles]);

  if (!particles || !options) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <Particles
        id="damnhome-particles"
        className="h-full w-full"
        options={options}
      />
    </div>
  );
}
