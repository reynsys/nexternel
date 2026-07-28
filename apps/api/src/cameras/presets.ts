/** RTSP path templates for common CCTV brands (sub-stream preferred for dashboards). */

export type CameraBrandPreset = {
  id: string;
  label: string;
  /** Path after rtsp://user:pass@host:554 — may include query string */
  pathTemplate: string;
  hint: string;
};

export const CAMERA_BRAND_PRESETS: CameraBrandPreset[] = [
  {
    id: "reolink-sub",
    label: "Reolink (sub)",
    pathTemplate: "/h264Preview_01_sub",
    hint: "rtsp://USER:PASS@IP:554/h264Preview_01_sub",
  },
  {
    id: "reolink-main",
    label: "Reolink (main)",
    pathTemplate: "/h264Preview_01_main",
    hint: "rtsp://USER:PASS@IP:554/h264Preview_01_main",
  },
  {
    id: "hikvision-sub",
    label: "Hikvision (sub ch1)",
    pathTemplate: "/Streaming/Channels/102",
    hint: "rtsp://USER:PASS@IP:554/Streaming/Channels/102",
  },
  {
    id: "hikvision-main",
    label: "Hikvision (main ch1)",
    pathTemplate: "/Streaming/Channels/101",
    hint: "rtsp://USER:PASS@IP:554/Streaming/Channels/101",
  },
  {
    id: "dahua-sub",
    label: "Dahua / Amcrest (sub)",
    pathTemplate: "/cam/realmonitor?channel=1&subtype=1",
    hint: "rtsp://USER:PASS@IP:554/cam/realmonitor?channel=1&subtype=1",
  },
  {
    id: "dahua-main",
    label: "Dahua / Amcrest (main)",
    pathTemplate: "/cam/realmonitor?channel=1&subtype=0",
    hint: "rtsp://USER:PASS@IP:554/cam/realmonitor?channel=1&subtype=0",
  },
  {
    id: "axis",
    label: "Axis",
    pathTemplate: "/axis-media/media.amp",
    hint: "rtsp://USER:PASS@IP/axis-media/media.amp",
  },
];

export function buildRtspUrl(opts: {
  user: string;
  password: string;
  host: string;
  port?: number;
  pathTemplate: string;
}): string {
  const user = encodeURIComponent(opts.user);
  const password = encodeURIComponent(opts.password);
  const port = opts.port && opts.port !== 554 ? `:${opts.port}` : "";
  const path = opts.pathTemplate.startsWith("/")
    ? opts.pathTemplate
    : `/${opts.pathTemplate}`;
  return `rtsp://${user}:${password}@${opts.host}${port}${path}`;
}

export function normalizeStreamId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
