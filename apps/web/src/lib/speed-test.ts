import { getServerLanIp } from "@/lib/server-lan-ip";

export type SpeedTestStatus = "idle" | "running" | "ok" | "error";

export type SpeedTestResult = {
  status: SpeedTestStatus;
  internalIp: string | null;
  externalIp: string | null;
  downloadMbps: number | null;
  uploadMbps: number | null;
  latencyMs: number | null;
  testedAt: string | null;
  error?: string;
  intervalMinutes: number;
};

const DEFAULT_INTERVAL_MIN = 3;
const MIN_INTERVAL_MIN = 2;
const MAX_INTERVAL_MIN = 15;

let cache: { result: SpeedTestResult; at: number } | null = null;
let runPromise: Promise<SpeedTestResult> | null = null;

function clampInterval(minutes: number): number {
  if (!Number.isFinite(minutes)) return DEFAULT_INTERVAL_MIN;
  return Math.min(MAX_INTERVAL_MIN, Math.max(MIN_INTERVAL_MIN, Math.round(minutes)));
}

function timeoutSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

async function fetchExternalIp(): Promise<string | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: timeoutSignal(10_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ip?: string };
    return data.ip?.trim() || null;
  } catch {
    return null;
  }
}

async function measureLatencyMs(): Promise<number | null> {
  const start = Date.now();
  try {
    const res = await fetch("https://1.1.1.1/cdn-cgi/trace", {
      signal: timeoutSignal(8_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    await res.text();
    return Math.max(1, Date.now() - start);
  } catch {
    return null;
  }
}

async function measureDownloadMbps(): Promise<number | null> {
  const bytes = 8_000_000;
  const start = Date.now();
  try {
    const res = await fetch(`https://speed.cloudflare.com/__down?bytes=${bytes}`, {
      signal: timeoutSignal(90_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const seconds = (Date.now() - start) / 1000;
    if (seconds < 0.1 || buf.byteLength < 1) return null;
    const mbps = (buf.byteLength * 8) / seconds / 1_000_000;
    return Math.round(mbps * 10) / 10;
  } catch {
    return null;
  }
}

async function measureUploadMbps(): Promise<number | null> {
  const bytes = 1_500_000;
  const body = new Uint8Array(bytes);
  const start = Date.now();
  try {
    const res = await fetch("https://speed.cloudflare.com/__up", {
      method: "POST",
      body,
      signal: timeoutSignal(90_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    await res.text();
    const seconds = (Date.now() - start) / 1000;
    if (seconds < 0.1) return null;
    const mbps = (bytes * 8) / seconds / 1_000_000;
    return Math.round(mbps * 10) / 10;
  } catch {
    return null;
  }
}

async function runSpeedTest(intervalMinutes: number): Promise<SpeedTestResult> {
  const interval = clampInterval(intervalMinutes);
  const internalIp = getServerLanIp();
  const running: SpeedTestResult = {
    status: "running",
    internalIp,
    externalIp: cache?.result.externalIp ?? null,
    downloadMbps: cache?.result.downloadMbps ?? null,
    uploadMbps: cache?.result.uploadMbps ?? null,
    latencyMs: cache?.result.latencyMs ?? null,
    testedAt: cache?.result.testedAt ?? null,
    intervalMinutes: interval,
  };

  try {
    const [externalIp, latencyMs, downloadMbps, uploadMbps] = await Promise.all([
      fetchExternalIp(),
      measureLatencyMs(),
      measureDownloadMbps(),
      measureUploadMbps(),
    ]);

    if (downloadMbps === null && uploadMbps === null && !externalIp) {
      return {
        status: "error",
        internalIp,
        externalIp,
        downloadMbps,
        uploadMbps,
        latencyMs,
        testedAt: new Date().toISOString(),
        error: "Could not reach speed test endpoints",
        intervalMinutes: interval,
      };
    }

    return {
      status: "ok",
      internalIp,
      externalIp,
      downloadMbps,
      uploadMbps,
      latencyMs,
      testedAt: new Date().toISOString(),
      intervalMinutes: interval,
    };
  } catch (e) {
    return {
      status: "error",
      internalIp: getServerLanIp(),
      externalIp: cache?.result.externalIp ?? null,
      downloadMbps: null,
      uploadMbps: null,
      latencyMs: null,
      testedAt: new Date().toISOString(),
      error: e instanceof Error ? e.message : "Speed test failed",
      intervalMinutes: interval,
    };
  }
}

/** Returns cached speed test; runs a new test when older than interval. */
export async function getSpeedTestResult(intervalMinutes = DEFAULT_INTERVAL_MIN): Promise<SpeedTestResult> {
  const interval = clampInterval(intervalMinutes);
  const maxAgeMs = interval * 60 * 1000;
  const now = Date.now();

  if (cache && now - cache.at < maxAgeMs && cache.result.status !== "error") {
    return { ...cache.result, intervalMinutes: interval };
  }

  if (runPromise) {
    return runPromise;
  }

  runPromise = (async () => {
    const result = await runSpeedTest(interval);
    cache = { result, at: Date.now() };
    return result;
  })();

  try {
    return await runPromise;
  } finally {
    runPromise = null;
  }
}
