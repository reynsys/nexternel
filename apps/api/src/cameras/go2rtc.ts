import { config } from "../config.js";

function go2rtcBase(): string {
  return config.go2rtcUrl().replace(/\/$/, "");
}

/** YAML double-quoted string (safe for passwords with # : @ etc.). */
function yamlDoubleQuoted(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function streamExists(streamId: string): Promise<boolean> {
  try {
    const res = await fetch(`${go2rtcBase()}/api/streams`);
    if (!res.ok) return false;
    const data = (await res.json()) as Record<string, unknown>;
    return Boolean(data && typeof data === "object" && streamId in data);
  } catch {
    return false;
  }
}

/**
 * Fallback when PUT's surgical YAML patch fails (e.g. empty `streams: {}`).
 * PATCH /api/config with a quoted RTSP URL.
 */
async function go2rtcPatchConfigStream(
  streamId: string,
  rtspUrl: string
): Promise<void> {
  const body = `streams:\n  ${streamId}: ${yamlDoubleQuoted(rtspUrl)}\n`;
  const res = await fetch(`${go2rtcBase()}/api/config`, {
    method: "PATCH",
    headers: { "Content-Type": "text/plain" },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `go2rtc patch config failed (${res.status}): ${text || res.statusText}`
    );
  }
}

/**
 * Register or update a stream in go2rtc.
 * Primary: PUT /api/streams?name=…&src=…
 * Fallback: PATCH /api/config if YAML patch fails; accept if stream is live.
 */
export async function go2rtcPutStream(
  streamId: string,
  rtspUrl: string
): Promise<void> {
  const url = `${go2rtcBase()}/api/streams?name=${encodeURIComponent(streamId)}&src=${encodeURIComponent(rtspUrl)}`;
  const res = await fetch(url, { method: "PUT" });
  if (res.ok) return;

  const body = await res.text().catch(() => "");

  // PUT may create the in-memory stream then fail while writing YAML.
  if (res.status === 400 && /yaml/i.test(body)) {
    try {
      await go2rtcPatchConfigStream(streamId, rtspUrl);
      // Re-PUT so the in-memory stream is definitely registered
      const retry = await fetch(url, { method: "PUT" });
      if (retry.ok || (await streamExists(streamId))) return;
    } catch {
      if (await streamExists(streamId)) return;
    }
  }

  if (await streamExists(streamId)) return;

  throw new Error(
    `go2rtc put stream failed (${res.status}): ${body || res.statusText}`
  );
}

export async function go2rtcDeleteStream(streamId: string): Promise<void> {
  const url = `${go2rtcBase()}/api/streams?src=${encodeURIComponent(streamId)}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    const body = await res.text().catch(() => "");
    // Ignore yaml patch failures if stream is already gone
    if (res.status === 400 && /yaml/i.test(body)) {
      if (!(await streamExists(streamId))) return;
    }
    throw new Error(
      `go2rtc delete stream failed (${res.status}): ${body || res.statusText}`
    );
  }
}

export function playUrlsForStream(streamId: string): {
  streamId: string;
  hlsUrl: string;
  mseUrl: string;
} {
  // Prefer same-origin /go2rtc (UI nginx → go2rtc). Absolute GO2RTC_PUBLIC_URL
  // only when explicitly configured for direct browser → :1984 access.
  const explicit = config.go2rtcPublicUrl();
  const base = explicit || "/go2rtc";
  const q = `src=${encodeURIComponent(streamId)}`;
  return {
    streamId,
    hlsUrl: `${base}/api/stream.m3u8?${q}`,
    mseUrl: `${base}/api/stream.mp4?${q}`,
  };
}
