export type VisualFlags = {
  zeroSize: boolean;
  clippedOverflow: boolean;
  offscreen: boolean;
  hidden: boolean;
  undersizedChart: boolean;
};

export type VisualElementProbe = {
  path: string;
  tag: string;
  id: string | null;
  classes: string;
  dataAttrs: Record<string, string>;
  rect: { x: number; y: number; width: number; height: number };
  client: { width: number; height: number };
  scroll: { width: number; height: number };
  computed: {
    display: string;
    position: string;
    overflow: string;
    overflowX: string;
    overflowY: string;
    transform: string;
    zIndex: string;
    visibility: string;
    opacity: string;
    boxSizing: string;
  };
  flags: VisualFlags;
  childCount: number;
};

export type VisualScanResult = {
  collectedAt: string;
  href: string;
  viewport: { width: number; height: number };
  mode: "selector" | "pick" | "auto";
  selector: string;
  matchCount: number;
  elements: VisualElementProbe[];
  warnings: string[];
};

const STORAGE_KEY = "nexternel_visual_scan";
const MAX_ELEMENTS = 40;

/** Default selectors for dashboard / widget layout bugs (V2 gauge class of issues). */
export const DEFAULT_VISUAL_SELECTORS = [
  "[data-nx-widget]",
  "[data-nx-chart-host]",
  ".echarts-for-react",
  ".react-grid-item",
  ".react-grid-layout",
  ".layout",
  "svg",
  "canvas",
].join(", ");

function cssPath(el: Element): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  let depth = 0;
  while (cur && depth < 6) {
    let part = cur.tagName.toLowerCase();
    if (cur.id) {
      part += `#${cur.id}`;
      parts.unshift(part);
      break;
    }
    const cls = Array.from(cur.classList)
      .filter((c) => c && !c.startsWith("Mui"))
      .slice(0, 2);
    if (cls.length) part += `.${cls.join(".")}`;
    const nx = cur.getAttribute("data-nx-widget-type");
    if (nx) part += `[data-nx-widget-type=${nx}]`;
    const parent = cur.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c) => c.tagName === cur!.tagName
      );
      if (siblings.length > 1) {
        part += `:nth-of-type(${siblings.indexOf(cur) + 1})`;
      }
    }
    parts.unshift(part);
    cur = parent;
    depth += 1;
  }
  return parts.join(" > ");
}

function dataAttrsOf(el: Element): Record<string, string> {
  const out: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith("data-")) {
      out[attr.name] = attr.value.slice(0, 120);
    }
  }
  return out;
}

function flagsFor(
  el: Element,
  rect: DOMRect,
  clientW: number,
  clientH: number,
  scrollW: number,
  scrollH: number,
  computed: CSSStyleDeclaration
): VisualFlags {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const hidden =
    computed.display === "none" ||
    computed.visibility === "hidden" ||
    Number(computed.opacity) === 0;
  return {
    zeroSize: rect.width < 1 || rect.height < 1 || clientW < 1 || clientH < 1,
    clippedOverflow:
      scrollW > clientW + 2 ||
      scrollH > clientH + 2 ||
      (computed.overflow !== "visible" &&
        computed.overflow !== "clip" &&
        (scrollW > clientW + 1 || scrollH > clientH + 1)),
    offscreen:
      rect.bottom < 0 ||
      rect.right < 0 ||
      rect.top > vh ||
      rect.left > vw,
    hidden,
    undersizedChart:
      el.hasAttribute("data-nx-chart-host") &&
      rect.height > 0 &&
      rect.height < 100,
  };
}

/** Detect tiny gauge arcs inside a reasonably sized chart host (broken radius %). */
function gaugeArcWarnings(): string[] {
  const out: string[] = [];
  document.querySelectorAll("[data-nx-chart-host]").forEach((host) => {
    const hr = host.getBoundingClientRect();
    if (hr.height < 60) return;
    const svg = host.querySelector("svg");
    if (!svg) return;
    const sw = svg.clientWidth || hr.width;
    const sh = svg.clientHeight || hr.height;
    const minSide = Math.min(sw, sh);
    for (const path of svg.querySelectorAll("path[d]")) {
      const d = path.getAttribute("d") ?? "";
      const m = d.match(/A([\d.]+)\s+([\d.]+)/);
      if (!m) continue;
      const rx = parseFloat(m[1]);
      if (!Number.isFinite(rx) || rx < 8) continue;
      if (rx < minSide * 0.14) {
        out.push(
          `Gauge arc ~${Math.round(rx)}px in ${Math.round(hr.width)}×${Math.round(hr.height)} chart-host (${Math.round(sw)}×${Math.round(sh)} svg) — radius option too low for this cell`
        );
        break;
      }
    }
  });
  return out;
}

export function probeElement(el: Element): VisualElementProbe {
  const rect = el.getBoundingClientRect();
  const htmlEl = el as HTMLElement;
  const clientW = "clientWidth" in htmlEl ? htmlEl.clientWidth : 0;
  const clientH = "clientHeight" in htmlEl ? htmlEl.clientHeight : 0;
  const scrollW = "scrollWidth" in htmlEl ? htmlEl.scrollWidth : 0;
  const scrollH = "scrollHeight" in htmlEl ? htmlEl.scrollHeight : 0;
  const computed = window.getComputedStyle(el);

  return {
    path: cssPath(el),
    tag: el.tagName.toLowerCase(),
    id: el.id || null,
    classes: Array.from(el.classList).slice(0, 12).join(" "),
    dataAttrs: dataAttrsOf(el),
    rect: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
    client: { width: clientW, height: clientH },
    scroll: { width: scrollW, height: scrollH },
    computed: {
      display: computed.display,
      position: computed.position,
      overflow: computed.overflow,
      overflowX: computed.overflowX,
      overflowY: computed.overflowY,
      transform: computed.transform === "none" ? "none" : computed.transform.slice(0, 80),
      zIndex: computed.zIndex,
      visibility: computed.visibility,
      opacity: computed.opacity,
      boxSizing: computed.boxSizing,
    },
    flags: flagsFor(el, rect, clientW, clientH, scrollW, scrollH, computed),
    childCount: el.children.length,
  };
}

export function scanVisual(
  selector: string = DEFAULT_VISUAL_SELECTORS,
  mode: VisualScanResult["mode"] = "selector"
): VisualScanResult {
  const warnings: string[] = [];
  let nodes: Element[] = [];

  try {
    nodes = Array.from(document.querySelectorAll(selector));
  } catch {
    warnings.push(`Invalid selector: ${selector}`);
    return {
      collectedAt: new Date().toISOString(),
      href: location.href,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      mode,
      selector,
      matchCount: 0,
      elements: [],
      warnings,
    };
  }

  if (nodes.length === 0) {
    warnings.push(
      "No matches — open the page that has the issue, then use Visual Diagnostic → Scan this page or Pick element."
    );
  }

  const limited = nodes.slice(0, MAX_ELEMENTS);
  if (nodes.length > MAX_ELEMENTS) {
    warnings.push(`Truncated to ${MAX_ELEMENTS} of ${nodes.length} matches`);
  }

  const elements = limited.map(probeElement);
  const problemCount = elements.filter(
    (e) =>
      e.flags.zeroSize ||
      e.flags.clippedOverflow ||
      e.flags.offscreen ||
      e.flags.undersizedChart
  ).length;
  if (problemCount > 0) {
    warnings.push(
      `${problemCount} element(s) flagged (zeroSize / clippedOverflow / offscreen / undersizedChart)`
    );
  }
  warnings.push(...gaugeArcWarnings());

  return {
    collectedAt: new Date().toISOString(),
    href: location.href,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    mode,
    selector,
    matchCount: nodes.length,
    elements,
    warnings,
  };
}

export function scanElementTree(el: Element): VisualScanResult {
  const chain: Element[] = [];
  let cur: Element | null = el;
  for (let i = 0; i < 5 && cur; i++) {
    chain.unshift(cur);
    cur = cur.parentElement;
  }
  const kids = Array.from(el.children).slice(0, 8);
  const unique = [...chain, ...kids.filter((k) => !chain.includes(k))];
  const elements = unique.map(probeElement);
  const warnings: string[] = [];
  const problemCount = elements.filter(
    (e) =>
      e.flags.zeroSize ||
      e.flags.clippedOverflow ||
      e.flags.offscreen ||
      e.flags.undersizedChart
  ).length;
  if (problemCount > 0) {
    warnings.push(`${problemCount} element(s) flagged in pick tree`);
  }
  warnings.push(...gaugeArcWarnings());

  return {
    collectedAt: new Date().toISOString(),
    href: location.href,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    mode: "pick",
    selector: cssPath(el),
    matchCount: elements.length,
    elements,
    warnings,
  };
}

export function saveVisualScan(result: VisualScanResult) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {
    /* quota / private mode */
  }
}

export function loadVisualScan(): VisualScanResult | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as VisualScanResult;
  } catch {
    return null;
  }
}

export function clearVisualScan() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function formatVisualSection(scan: VisualScanResult | null): string[] {
  const lines: string[] = ["", "## Visual diagnostic"];
  if (!scan) {
    lines.push("(none — open the page with the issue, use Visual Diagnostic → Scan this page or Pick element)");
    lines.push("");
    return lines;
  }

  lines.push(`collectedAt: ${scan.collectedAt}`);
  lines.push(`href: ${scan.href}`);
  lines.push(`viewport: ${scan.viewport.width}x${scan.viewport.height}`);
  lines.push(`mode: ${scan.mode}`);
  lines.push(`selector: ${scan.selector}`);
  lines.push(`matchCount: ${scan.matchCount}`);
  if (scan.warnings.length) {
    lines.push("warnings:");
    for (const w of scan.warnings) lines.push(`  - ${w}`);
  }
  lines.push("elements:");
  for (const e of scan.elements) {
    const flags = Object.entries(e.flags)
      .filter(([, v]) => v)
      .map(([k]) => k);
    lines.push(`  - path: ${e.path}`);
    lines.push(`    tag: ${e.tag} class="${e.classes}"`);
    if (Object.keys(e.dataAttrs).length) {
      lines.push(`    data: ${JSON.stringify(e.dataAttrs)}`);
    }
    lines.push(
      `    rect: ${e.rect.width}x${e.rect.height} @ (${e.rect.x},${e.rect.y})`
    );
    lines.push(
      `    client: ${e.client.width}x${e.client.height}  scroll: ${e.scroll.width}x${e.scroll.height}`
    );
    lines.push(
      `    css: display=${e.computed.display} overflow=${e.computed.overflow}/${e.computed.overflowX}/${e.computed.overflowY} position=${e.computed.position} transform=${e.computed.transform}`
    );
    if (flags.length) lines.push(`    FLAGS: ${flags.join(", ")}`);
  }
  lines.push("");
  return lines;
}
