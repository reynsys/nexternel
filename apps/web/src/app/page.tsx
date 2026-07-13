import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDashboardCatalog } from "@/lib/dashboard-catalog";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardView } from "@/components/dashboard/DashboardView";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const catalog = await getDashboardCatalog();

  return (
    <AppShell username={session.username} fillViewport>
      {!catalog.hasDevices ? (
        <div className="card text-center">
          <p className="text-muted-foreground">No devices registered yet.</p>
          <a href="/admin/devices" className="btn-primary mt-4 inline-flex">
            Add your first device
          </a>
        </div>
      ) : (
        <DashboardView catalog={catalog} />
      )}
    </AppShell>
  );
}
