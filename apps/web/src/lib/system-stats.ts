import os from "os";
import { APP_VERSION } from "@/lib/version";
import { readServerTemperatureC } from "@/lib/server-temperature";

export interface SystemStats {
  version: string;
  uptimeSeconds: number;
  cpu: {
    model: string;
    cores: number;
    loadPercent: number;
  };
  memory: {
    totalMb: number;
    usedMb: number;
    freeMb: number;
  };
  serverTemperatureC: number | null;
}

export async function getSystemStats(): Promise<SystemStats> {
  const cpus = os.cpus();
  const cpuCount = cpus.length || 1;
  const load = os.loadavg();
  const loadPercent = Math.min(100, Math.round((load[0] / cpuCount) * 100));

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const serverTemperatureC = await readServerTemperatureC();

  return {
    version: APP_VERSION,
    uptimeSeconds: Math.floor(process.uptime()),
    cpu: {
      model: cpus[0]?.model?.trim() || "CPU",
      cores: cpuCount,
      loadPercent,
    },
    memory: {
      totalMb: Math.round(totalMem / 1024 / 1024),
      usedMb: Math.round((totalMem - freeMem) / 1024 / 1024),
      freeMb: Math.round(freeMem / 1024 / 1024),
    },
    serverTemperatureC,
  };
}