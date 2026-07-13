import { AppShell } from "@/components/layout/AppShell";
import { LibraryCatalogGrid } from "@/components/library/LibraryCatalogGrid";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WidgetLibraryPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell username={session.username}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Widget library</h1>
          <p className="text-sm text-muted-foreground">
            Reference catalogue for sensor templates and utility widgets. To add a widget, open{" "}
            <strong className="font-medium text-foreground">Settings → Edit dashboard → Add widget</strong>{" "}
            and pick a template from the visual gallery.
          </p>
        </div>
        <LibraryCatalogGrid />
      </div>
    </AppShell>
  );
}
