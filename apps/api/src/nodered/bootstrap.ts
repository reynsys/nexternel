import fs from "fs";
import path from "path";
import { config } from "../config.js";
import { noderedDataDir } from "../backup/paths.js";
import { restartNexternelServices } from "../backup/post-restore.js";

type NoderedFlowNode = {
  type?: string;
  id?: string;
  func?: string;
  topic?: string;
  username?: string;
  password?: string;
  [key: string]: unknown;
};

export type EnsureNoderedFlowsResult = {
  action: "seeded" | "patched" | "unchanged";
  tabCount: number;
  flowsPath: string;
  templatePath: string;
  restarted: boolean;
  message: string;
};

function noderedTemplateDir(): string {
  return process.env.NODERED_TEMPLATE_DIR || "/nodered-template";
}

export function countFlowTabs(nodes: NoderedFlowNode[]): number {
  return nodes.filter((n) => n.type === "tab").length;
}

export function flowsNeedBootstrap(flowsPath: string): boolean {
  if (!fs.existsSync(flowsPath)) return true;
  try {
    const raw = fs.readFileSync(flowsPath, "utf8").trim();
    if (!raw || raw === "[]") return true;
    const nodes = JSON.parse(raw) as NoderedFlowNode[];
    if (!Array.isArray(nodes) || nodes.length === 0) return true;
    return countFlowTabs(nodes) === 0;
  } catch {
    return true;
  }
}

function readFlowNodes(flowsPath: string): NoderedFlowNode[] | null {
  try {
    const raw = fs.readFileSync(flowsPath, "utf8").trim();
    if (!raw) return null;
    const nodes = JSON.parse(raw) as NoderedFlowNode[];
    return Array.isArray(nodes) ? nodes : null;
  } catch {
    return null;
  }
}

function resolveTemplateFlowsPath(): string | null {
  const templateDir = noderedTemplateDir();
  const mounted = path.join(templateDir, "flows.json");
  if (fs.existsSync(mounted)) return mounted;
  const bundled = path.join(process.cwd(), "nodered-template", "flows.json");
  if (fs.existsSync(bundled)) return bundled;
  return null;
}

/** Patch template or restored flows for this installation's MQTT, topic root, and Influx. */
export function patchFlowTemplateNodes(nodes: NoderedFlowNode[]): NoderedFlowNode[] {
  const influx = config.influx();
  const topicRoot = (process.env.MQTT_TOPIC_PREFIX || "nexternel").trim() || "nexternel";
  const mqttUser = config.mqttUsername();
  const mqttPass = config.mqttPassword();

  return nodes.map((node) => {
    const next = { ...node };
    if (next.type === "mqtt-broker" && mqttUser) {
      next.username = mqttUser;
      next.password = mqttPass;
    }
    if (next.type === "mqtt in" && typeof next.topic === "string") {
      next.topic = next.topic
        .replace(/^nexternel\/#/, `${topicRoot}/#`)
        .replace(/^damnhome\/#/, `${topicRoot}/#`);
    }
    if (next.type === "function" && typeof next.func === "string") {
      let func = next.func;
      func = func.replaceAll("REPLACE_WITH_INFLUXDB_TOKEN", influx.token || "");
      func = func.replace(
        /const org = "(?:damnhome|nexternel)";/,
        `const org = ${JSON.stringify(influx.org || "nexternel")};`
      );
      func = func.replace(
        /const bucket = "sensors";/,
        `const bucket = ${JSON.stringify(influx.bucket || "sensors")};`
      );
      func = func.replaceAll("damnhome/", `${topicRoot}/`);
      func = func.replaceAll("nexternel/", `${topicRoot}/`);
      func = func.replace(
        /parts\[0\] !== "(?:nexternel|damnhome)"/,
        `parts[0] !== ${JSON.stringify(topicRoot)}`
      );
      next.func = func;
    }
    return next;
  });
}

function seedFlowsFromTemplate(
  dataDir: string,
  flowsPath: string,
  templateFlows: string
): NoderedFlowNode[] {
  const templateDir = path.dirname(templateFlows);
  const templateSettings = path.join(templateDir, "settings.js");
  fs.mkdirSync(dataDir, { recursive: true });
  const nodes = patchFlowTemplateNodes(
    JSON.parse(fs.readFileSync(templateFlows, "utf8")) as NoderedFlowNode[]
  );
  fs.writeFileSync(flowsPath, JSON.stringify(nodes, null, 2), "utf8");
  if (fs.existsSync(templateSettings)) {
    fs.copyFileSync(templateSettings, path.join(dataDir, "settings.js"));
  }
  return nodes;
}

async function restartNoderedIfAllowed(): Promise<boolean> {
  if (process.env.ALLOW_DOCKER_RESTART !== "true") return false;
  const restarted = await restartNexternelServices("automations");
  return restarted.ok;
}

/**
 * Ensure Node-RED has a working MQTT→Influx flow (seed when no tabs, patch credentials when stale).
 */
export async function ensureNoderedFlows(): Promise<EnsureNoderedFlowsResult> {
  const dataDir = noderedDataDir();
  const flowsPath = path.join(dataDir, "flows.json");
  const templateFlows = resolveTemplateFlowsPath();
  const templatePath = templateFlows ?? path.join(noderedTemplateDir(), "flows.json");

  if (!templateFlows) {
    return {
      action: "unchanged",
      tabCount: 0,
      flowsPath,
      templatePath,
      restarted: false,
      message: `Node-RED template missing (checked ${templatePath} and bundled copy). Upload nodered/ or rebuild the API image.`,
    };
  }

  const existing = readFlowNodes(flowsPath);
  const existingTabs = existing ? countFlowTabs(existing) : 0;

  if (flowsNeedBootstrap(flowsPath)) {
    const nodes = seedFlowsFromTemplate(dataDir, flowsPath, templateFlows);
    const restarted = await restartNoderedIfAllowed();
    return {
      action: "seeded",
      tabCount: countFlowTabs(nodes),
      flowsPath,
      templatePath: templateFlows,
      restarted,
      message: restarted
        ? "Node-RED flows seeded from template and container restarted."
        : "Node-RED flows seeded. Restart the nodered container to load them.",
    };
  }

  if (!existing?.length) {
    return {
      action: "unchanged",
      tabCount: 0,
      flowsPath,
      templatePath: templateFlows,
      restarted: false,
      message: "Node-RED flows.json is missing or invalid.",
    };
  }

  const patched = patchFlowTemplateNodes(existing);
  const before = JSON.stringify(existing);
  const after = JSON.stringify(patched);
  if (before === after) {
    return {
      action: "unchanged",
      tabCount: existingTabs,
      flowsPath,
      templatePath: templateFlows,
      restarted: false,
      message: `Node-RED flows OK (${existingTabs} tab(s)).`,
    };
  }

  fs.writeFileSync(flowsPath, JSON.stringify(patched, null, 2), "utf8");
  const restarted = await restartNoderedIfAllowed();
  return {
    action: "patched",
    tabCount: countFlowTabs(patched),
    flowsPath,
    templatePath: templateFlows,
    restarted,
    message: restarted
      ? "Node-RED flows patched (MQTT/Influx/topics) and container restarted."
      : "Node-RED flows patched. Restart the nodered container to apply.",
  };
}

/** @deprecated use ensureNoderedFlows */
export async function bootstrapNoderedIfEmpty(): Promise<{
  seeded: boolean;
  message: string;
}> {
  const result = await ensureNoderedFlows();
  return {
    seeded: result.action === "seeded",
    message: result.message,
  };
}

/** Patch flows.json in a backup restore batch before writing to the live volume. */
export function patchNoderedArchiveFiles(
  files: { rel: string; data: Buffer }[]
): { rel: string; data: Buffer }[] {
  return files.map((f) => {
    if (f.rel !== "flows.json") return f;
    try {
      const nodes = patchFlowTemplateNodes(
        JSON.parse(f.data.toString("utf8")) as NoderedFlowNode[]
      );
      return { rel: f.rel, data: Buffer.from(JSON.stringify(nodes, null, 2), "utf8") };
    } catch {
      return f;
    }
  });
}
