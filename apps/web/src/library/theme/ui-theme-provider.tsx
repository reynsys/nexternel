"use client"

import { useEffect } from "react"
import { useUIThemeStore } from "@/store/ui-theme.store"

const CUSTOM_THEMES = [
  "gaussian-blue",
  "gaussian-black",
  "gaussian-amethyst",
  "gaussian-emerald",
  "gaussian-bronze",
   "gaussian-gold",
  "semi-dark",
]

export default function UIThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { theme, loadTheme } = useUIThemeStore()

  // ✅ Load theme on mount
  useEffect(() => {
    loadTheme()
  }, [])

  // ✅ Apply theme
  useEffect(() => {
    const html = document.documentElement

    CUSTOM_THEMES.forEach((t) => html.classList.remove(t))

    if (theme) {
      html.classList.remove("dark", "light")
      html.classList.add(theme)
    }
  }, [theme])

  return <>{children}</>
}