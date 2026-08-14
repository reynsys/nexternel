import type { ClientSnapshot } from "./buildClientSnapshot";

import type { ServerDiagnostics } from "../api";

import { formatVisualSection, type VisualScanResult } from "./visualProbe";



export type AuthExtras = {

  capabilitiesCount?: number | string;

  meUsername?: string | null;

  error?: string;

};



export function formatDiagnosticsReport(

  client: ClientSnapshot,

  server: (Partial<ServerDiagnostics> & { error?: string }) | null,

  auth: AuthExtras | null,

  visual: VisualScanResult | null = null

): string {

  const lines: string[] = [

    "# Nexternel Diagnostics Report",

    `collectedAt: ${client.collectedAt}`,

    "",

    "## Client",

    `uiVersion: ${client.uiVersion}`,

    `href: ${client.href}`,

    `protocol: ${client.protocol}`,

    `hostname: ${client.hostname}`,

    `isSecureContext: ${client.isSecureContext}`,

    `crypto.randomUUID: ${client.randomUuid}`,

    `VITE_API_URL: ${client.viteApiUrl ?? "(unset)"}`,

    `apiBase: ${client.apiBase}`,

    `wsBase: ${client.wsBase}`,

    `accessTokenPresent: ${client.accessTokenPresent}`,

    `viewport: ${client.viewport.width}x${client.viewport.height}`,

    `userAgent: ${client.userAgent}`,

    "",

    "## Recent client errors",

  ];



  if (client.recentErrors.length === 0) {

    lines.push("(none)");

  } else {

    for (const e of client.recentErrors) {

      lines.push(

        `- [${e.at}] ${e.kind}: ${e.message}${e.source ? ` @ ${e.source}` : ""}${

          e.status != null ? ` (HTTP ${e.status})` : ""

        }`

      );

    }

  }



  lines.push("", "## Server (/api/v1/diagnostics)");

  if (!server) {

    lines.push("(unavailable)");

  } else if (server.error) {

    lines.push(`error: ${server.error}`);

  } else {

    lines.push(`status: ${server.status ?? "?"}`);

    lines.push(`version: ${server.version ?? "?"}`);

    lines.push(`database: ${server.database ?? "?"}`);

    lines.push(`mqtt: ${server.mqtt ?? "?"}`);

    if (server.mqttError) lines.push(`mqttError: ${server.mqttError}`);

    lines.push(

      `capabilityKindsRegistered: ${server.capabilityKindsRegistered ?? "?"}`

    );

    if (server.counts) {

      lines.push(

        `counts.capabilities: ${server.counts.capabilities ?? "?"}`,

        `counts.capabilityBindings: ${server.counts.capabilityBindings ?? "?"}`,

        `counts.v3Dashboards: ${server.counts.v3Dashboards ?? "?"}`,

        `counts.devicesEnabled: ${server.counts.devicesEnabled ?? "?"}`,

        `counts.devicesOnline: ${server.counts.devicesOnline ?? "?"}`,

        `counts.devicesOffline: ${server.counts.devicesOffline ?? "?"}`

      );

    }

    if (server.process) {

      lines.push(

        `uptimeSeconds: ${server.process.uptimeSeconds ?? "?"}`,

        `nodeVersion: ${server.process.nodeVersion ?? "?"}`

      );

    }

  }



  lines.push("", "## Auth-scoped probes");

  if (!client.accessTokenPresent) {

    lines.push("skipped: not signed in");

  } else if (!auth) {

    lines.push("(not run)");

  } else if (auth.error) {

    lines.push(`error: ${auth.error}`);

  } else {

    lines.push(`me.username: ${auth.meUsername ?? "?"}`);

    lines.push(`capabilities.count: ${auth.capabilitiesCount ?? "?"}`);

  }



  lines.push(...formatVisualSection(visual));

  return lines.join("\n");

}


