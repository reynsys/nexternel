"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { DashboardCatalog } from "@/lib/dashboard-catalog";
import { DashboardGridEditor } from "@/components/dashboard/DashboardGridEditor";

function DashboardEditorInner({ catalog }: { catalog: DashboardCatalog }) {
  const searchParams = useSearchParams();
  const add = searchParams.get("add");
  const type = searchParams.get("type");
  const deviceId = searchParams.get("deviceId");
  const relayId = searchParams.get("relayId");

  const deepLink =
    add === "classic" && type
      ? {
          mode: "classic" as const,
          widgetType: type,
          deviceId: deviceId || undefined,
          relayId: relayId || undefined,
        }
      : undefined;

  return <DashboardGridEditor catalog={catalog} deepLink={deepLink} />;
}

export function DashboardEditorClient({ catalog }: { catalog: DashboardCatalog }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading dashboard editor…</p>}>
      <DashboardEditorInner catalog={catalog} />
    </Suspense>
  );
}
