import type { GaugeSandboxConfig } from "@/widget-platform/studio/gauge-sandbox-bridge";

/** Serializable react-gauge-component props for JSX export (no functions). */
export type GaugeJsxConfig = Record<string, unknown>;

function formatJsxValue(val: unknown, indent = ""): string {
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  if (typeof val === "string") return `"${val.replace(/"/g, '\\"')}"`;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return "[]";
    const items = val.map((v) => formatJsxValue(v, `${indent}  `));
    const compact = items.join(", ");
    if (compact.length < 60) return `[${compact}]`;
    return `[\n${indent}    ${items.join(`,\n${indent}    `)}\n${indent}  ]`;
  }
  if (typeof val === "object") {
    const entries = Object.entries(val as Record<string, unknown>).filter(
      ([, v]) => v !== undefined
    );
    if (entries.length === 0) return "{}";
    const formatted = entries.map(([k, v]) => `${k}: ${formatJsxValue(v, `${indent}  `)}`);
    if (formatted.join(", ").length < 50) return `{ ${formatted.join(", ")} }`;
    return `{\n${indent}    ${formatted.join(`,\n${indent}    `)}\n${indent}  }`;
  }
  return String(val);
}

export function sandboxToJsxConfig(sandbox: GaugeSandboxConfig): GaugeJsxConfig {
  const cfg: GaugeJsxConfig = {
    type: sandbox.type,
    minValue: sandbox.minValue,
    maxValue: sandbox.maxValue,
  };
  if (sandbox.startAngle !== undefined) cfg.startAngle = sandbox.startAngle;
  if (sandbox.endAngle !== undefined) cfg.endAngle = sandbox.endAngle;
  if (sandbox.marginInPercent !== undefined) cfg.marginInPercent = sandbox.marginInPercent;
  if (sandbox.arc) cfg.arc = sandbox.arc;
  if (sandbox.pointers?.length) {
    cfg.pointers = sandbox.pointers;
  } else if (sandbox.pointer) {
    cfg.pointer = sandbox.pointer;
  }
  if (sandbox.labels) cfg.labels = sandbox.labels;
  return cfg;
}

export function stringifyGaugeJsx(config: GaugeJsxConfig, value: number): string {
  const props: string[] = [`  value={${value}}`];
  for (const [key, val] of Object.entries(config)) {
    if (val === undefined || key === "value") continue;
    if (typeof val === "string") {
      props.push(`  ${key}="${val}"`);
    } else {
      props.push(`  ${key}={${formatJsxValue(val, "  ")}}`);
    }
  }
  return `<GaugeComponent\n${props.join("\n")}\n/>`;
}

function extractPropValue(str: string, start: number): { value: string; end: number } {
  if (str[start] === '"' || str[start] === "'") {
    const quote = str[start];
    let end = start + 1;
    while (end < str.length && str[end] !== quote) {
      if (str[end] === "\\") end++;
      end++;
    }
    return { value: str.slice(start + 1, end), end: end + 1 };
  }
  if (str[start] === "{") {
    let depth = 1;
    let end = start + 1;
    while (end < str.length && depth > 0) {
      if (str[end] === "{") depth++;
      if (str[end] === "}") depth--;
      if (str[end] === '"' || str[end] === "'") {
        const quote = str[end];
        end++;
        while (end < str.length && str[end] !== quote) {
          if (str[end] === "\\") end++;
          end++;
        }
      }
      end++;
    }
    return { value: str.slice(start + 1, end - 1), end };
  }
  return { value: "", end: start };
}

function parseJsxObjectLiteral(raw: string): unknown {
  try {
    const jsonStr = raw
      .replace(/(\w+)\s*:/g, '"$1":')
      .replace(/'/g, '"')
      .replace(/,(\s*[}\]])/g, "$1");
    return JSON.parse(jsonStr);
  } catch {
    return undefined;
  }
}

/** Parse `<GaugeComponent … />` clipboard text into sandbox + preview value. */
export function parseGaugeJsx(
  text: string
): { sandbox: Partial<GaugeSandboxConfig>; previewValue?: number } | null {
  if (!text.includes("GaugeComponent") && !text.includes("<Gauge")) return null;

  const parsed: Record<string, unknown> = {};
  const propPattern = /(\w+)=(?={|"|')/g;
  let match: RegExpExecArray | null;
  while ((match = propPattern.exec(text)) !== null) {
    const propName = match[1];
    const startIdx = match.index + match[0].length;
    const { value: rawValue } = extractPropValue(text, startIdx);
    if (text[startIdx] === '"' || text[startIdx] === "'") {
      parsed[propName] = rawValue;
    } else {
      parsed[propName] = parseJsxObjectLiteral(rawValue);
    }
  }

  if (Object.keys(parsed).length === 0) return null;

  const previewValue =
    typeof parsed.value === "number" ? parsed.value : Number(parsed.value);
  delete parsed.value;

  const sandbox: Partial<GaugeSandboxConfig> = {
    type: (parsed.type as GaugeSandboxConfig["type"]) ?? "semicircle",
    minValue: Number(parsed.minValue ?? 0),
    maxValue: Number(parsed.maxValue ?? 100),
    startAngle: parsed.startAngle as number | undefined,
    endAngle: parsed.endAngle as number | undefined,
    marginInPercent: parsed.marginInPercent as number | undefined,
    arc: parsed.arc as GaugeSandboxConfig["arc"],
    pointer: parsed.pointer as GaugeSandboxConfig["pointer"],
    pointers: parsed.pointers as GaugeSandboxConfig["pointers"],
    labels: parsed.labels as GaugeSandboxConfig["labels"],
  };

  return {
    sandbox,
    previewValue: Number.isFinite(previewValue) ? previewValue : undefined,
  };
}
