import { AppShell } from "@/components/layout/AppShell";
import { ThemeCustomizerPanel } from "@/library/theme/theme-customizer-panel";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ThemesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell username={session.username}>
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Themes</h1>
          <p className="text-sm text-muted-foreground">
            Light/dark mode, background effects, and Gaussian colour themes.
          </p>
        </div>
        <div className="card">
          <ThemeCustomizerPanel />
        </div>
      </div>
    </AppShell>
  );
}
