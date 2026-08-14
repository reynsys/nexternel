import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import type { EsphomeDeviceBuilderConfig } from "@nexternel/domain";
import { builderYamlFileName } from "./generate.js";

const ESPHOME_DIRS = ["/esphome", join(process.cwd(), "..", "..", "esphome")];

async function resolveEsphomeDir(): Promise<string> {
  for (const dir of ESPHOME_DIRS) {
    try {
      await mkdir(dir, { recursive: true });
      return dir;
    } catch {
      /* try next */
    }
  }
  throw new Error("ESPHome configuration directory is not available");
}

/**
 * Managed devices are stored as root-level `esphome/<slug>.yaml` so the ESPHome
 * dashboard lists them (ESPHome does not show YAML in subfolders on the home page).
 */
export async function writeManagedEsphomeYaml(
  config: EsphomeDeviceBuilderConfig,
  yaml: string
): Promise<{ relativePath: string; absolutePath: string }> {
  const root = await resolveEsphomeDir();
  await mkdir(root, { recursive: true });
  const fileName = builderYamlFileName(config);
  const absolutePath = join(root, fileName);
  await writeFile(absolutePath, yaml, "utf8");
  return { relativePath: fileName, absolutePath };
}

export async function writeDeviceYamlFile(
  relativePath: string,
  yaml: string
): Promise<{ relativePath: string; absolutePath: string }> {
  const root = await resolveEsphomeDir();
  const clean = relativePath.replace(/^\/+/, "");
  const absolutePath = join(root, clean);
  await writeFile(absolutePath, yaml, "utf8");
  return { relativePath: clean, absolutePath };
}
