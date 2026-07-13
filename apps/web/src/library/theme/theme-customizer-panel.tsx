"use client";

import { useEffect, useState } from "react";
import { useUIThemeStore } from "@/store/ui-theme.store";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Snowflake, Sparkles, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { PARTICLE_PRESETS } from "@/lib/particle-presets";
import type { ParticleEffect } from "@/store/ui-theme.store";

const GAUSSIAN_THEMES = [
  { id: "gaussian-blue", label: "Gaussian Blue", preview: "bg-gradient-to-r from-blue-300 to-blue-900" },
  { id: "gaussian-black", label: "Gaussian Black", preview: "bg-gradient-to-r from-gray-300 to-gray-900" },
  { id: "gaussian-amethyst", label: "Gaussian Amethyst", preview: "bg-gradient-to-r from-purple-300 to-purple-900" },
  { id: "gaussian-emerald", label: "Gaussian Emerald", preview: "bg-gradient-to-r from-green-300 to-green-900" },
  { id: "gaussian-bronze", label: "Gaussian Bronze", preview: "bg-gradient-to-r from-red-300 to-red-900" },
  { id: "gaussian-gold", label: "Gaussian Gold", preview: "bg-gradient-to-r from-yellow-300 to-yellow-900" },
];

export function ThemeCustomizerPanel() {
  const { theme: mode, setTheme: setMode } = useTheme();
  const { theme: customTheme, setTheme: setCustomTheme, particles, setParticles } =
    useUIThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  function applyLight() {
    setCustomTheme("");
    setMode("light");
  }

  function applyDark() {
    setCustomTheme("");
    setMode("dark");
  }

  function applyGaussian(id: string) {
    setCustomTheme(id);
  }

  const isLight = mounted && mode === "light" && !customTheme;
  const isDark = mounted && mode === "dark" && !customTheme;

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-sm font-medium text-muted-foreground">Appearance</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={applyLight}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors",
              isLight ? "border-primary bg-primary/10 text-foreground" : "hover:bg-muted"
            )}
          >
            <Sun className="size-4" />
            Light
          </button>
          <button
            type="button"
            onClick={applyDark}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors",
              isDark ? "border-primary bg-primary/10 text-foreground" : "hover:bg-muted"
            )}
          >
            <Moon className="size-4" />
            Dark
          </button>
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-muted-foreground">Background effects</p>
        <div className="space-y-2">
          {PARTICLE_PRESETS.map((preset) => (
            <button
              key={preset.id || "off"}
              type="button"
              onClick={() => setParticles(preset.id as ParticleEffect)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                particles === preset.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "hover:bg-muted"
              )}
            >
              <span className="mt-0.5 text-muted-foreground">
                {preset.id === "" && <span className="inline-block h-4 w-4" />}
                {preset.id === "snow" && <Snowflake className="size-4" />}
                {preset.id === "stars" && <Sparkles className="size-4" />}
                {preset.id === "bubbles" && <Sparkles className="size-4" />}
                {(preset.id === "links" || preset.id === "links-interactive") && (
                  <Sparkles className="size-4" />
                )}
              </span>
              <span>
                <span className="font-medium">{preset.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {preset.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-muted-foreground">Gaussian themes</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {GAUSSIAN_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => applyGaussian(t.id)}
              className={cn(
                "relative h-16 overflow-hidden rounded-lg transition hover:scale-105",
                t.preview,
                customTheme === t.id ? "scale-105 ring-2 ring-primary" : ""
              )}
            >
              <div className="absolute inset-0 bg-black/20" />
              <span className="absolute bottom-1 left-2 rounded bg-black/40 px-2 py-0.5 text-[11px] font-medium text-white">
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => {
          setCustomTheme("");
          setParticles("");
          setMode("dark");
        }}
      >
        Reset to default
      </Button>
    </div>
  );
}
