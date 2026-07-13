import type { ISourceOptions } from "@tsparticles/engine";
import type { ParticleEffect } from "@/store/ui-theme.store";

const base: Partial<ISourceOptions> = {
  fullScreen: { enable: false },
  background: { color: { value: "transparent" } },
  detectRetina: true,
};

export const PARTICLE_PRESETS: {
  id: ParticleEffect
  label: string
  description: string
  interactive: boolean
}[] = [
  { id: "", label: "Off", description: "No background animation", interactive: false },
  { id: "snow", label: "Snow", description: "Gentle falling flakes", interactive: false },
  { id: "stars", label: "Stars", description: "Slow drifting starfield", interactive: false },
  { id: "bubbles", label: "Bubbles", description: "Floating orbs", interactive: false },
  { id: "links", label: "Network", description: "Connected nodes", interactive: false },
  {
    id: "links-interactive",
    label: "Network (interactive)",
    description: "Nodes react to the cursor",
    interactive: true,
  },
];

export function particleOptions(effect: ParticleEffect): ISourceOptions | null {
  switch (effect) {
    case "snow":
      return {
        ...base,
        fpsLimit: 60,
        particles: {
          number: { value: 80, density: { enable: true } },
          color: { value: "#ffffff" },
          opacity: { value: { min: 0.15, max: 0.5 } },
          size: { value: { min: 1, max: 3 } },
          move: {
            enable: true,
            speed: { min: 0.5, max: 1.5 },
            direction: "bottom",
            outModes: { default: "out" },
          },
        },
      };
    case "stars":
      return {
        ...base,
        particles: {
          number: { value: 60 },
          color: { value: "#ffffff" },
          opacity: { value: { min: 0.1, max: 0.45 } },
          size: { value: { min: 1, max: 2.5 } },
          move: { enable: true, speed: 0.25, random: true },
        },
      };
    case "bubbles":
      return {
        ...base,
        particles: {
          number: { value: 35 },
          color: { value: ["#60a5fa", "#a78bfa", "#34d399"] },
          opacity: { value: 0.25 },
          size: { value: { min: 8, max: 28 } },
          move: { enable: true, speed: 0.6, direction: "top", outModes: { default: "out" } },
        },
      };
    case "links":
      return {
        ...base,
        particles: {
          number: { value: 40 },
          color: { value: "#94a3b8" },
          links: {
            enable: true,
            distance: 120,
            opacity: 0.25,
            width: 1,
          },
          move: { enable: true, speed: 0.8 },
          opacity: { value: 0.35 },
          size: { value: 2 },
        },
      };
    case "links-interactive":
      return {
        ...base,
        interactivity: {
          detectsOn: "window",
          events: {
            onHover: { enable: true, mode: "grab" },
            resize: { enable: true },
          },
          modes: {
            grab: { distance: 140, links: { opacity: 0.45 } },
          },
        },
        particles: {
          number: { value: 50 },
          color: { value: "#cbd5e1" },
          links: {
            enable: true,
            distance: 130,
            opacity: 0.3,
            width: 1,
          },
          move: { enable: true, speed: 0.9 },
          opacity: { value: 0.45 },
          size: { value: 2.5 },
        },
      };
    default:
      return null;
  }
}
