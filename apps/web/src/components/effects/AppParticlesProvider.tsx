"use client";

import type { ReactNode } from "react";
import { ParticlesProvider } from "@tsparticles/react";
import type { Engine } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";

async function particlesInit(engine: Engine) {
  await loadSlim(engine);
}

export function AppParticlesProvider({ children }: { children: ReactNode }) {
  return <ParticlesProvider init={particlesInit}>{children}</ParticlesProvider>;
}
