import { getDashboardCatalog } from "@/lib/dashboard-catalog";
import { DashboardEditorClient } from "./DashboardEditorClient";

export const dynamic = "force-dynamic";

export default async function DashboardEditorPage() {
  const catalog = await getDashboardCatalog();

  if (!catalog.hasDevices) {
    return (
      <div className="card text-center">
        <p className="text-muted-foreground">Add devices before building a dashboard.</p>
        <a href="/admin/devices" className="btn-primary mt-4 inline-flex">
          Add devices
        </a>
      </div>
    );
  }

  return <DashboardEditorClient catalog={catalog} />;
}
