import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import UIThemeProvider from "@/library/theme/ui-theme-provider";
import { AppParticlesProvider } from "@/components/effects/AppParticlesProvider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nexternel",
  description: "Local smart home dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="gaussian-black"
          enableSystem
          disableTransitionOnChange
        >
          <UIThemeProvider>
            <AppParticlesProvider>
              {children}
            </AppParticlesProvider>
            <Toaster richColors position="top-right" />
          </UIThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
