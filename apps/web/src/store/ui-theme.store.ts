"use client"

import { create } from "zustand"

export type ParticleEffect =
  | ""
  | "snow"
  | "stars"
  | "bubbles"
  | "links"
  | "links-interactive"

type UIThemeState = {
  theme: string
  particles: ParticleEffect
  setTheme: (theme: string) => void
  setParticles: (particles: ParticleEffect) => void
  loadTheme: () => void
}

export const useUIThemeStore = create<UIThemeState>((set) => ({
  theme: "",
  particles: "",

  setTheme: (theme) => {
    localStorage.setItem("ui-theme", theme)
    set({ theme })
  },

  setParticles: (particles) => {
    localStorage.setItem("ui-particles", particles)
    set({ particles })
  },

  loadTheme: () => {
    const saved = localStorage.getItem("ui-theme") || ""
    const particles = (localStorage.getItem("ui-particles") || "") as ParticleEffect
    set({ theme: saved, particles })
  },
}))
