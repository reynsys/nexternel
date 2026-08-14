import fs from "fs";

import path from "path";

import { execFile } from "child_process";

import { promisify } from "util";

import { config } from "../config.js";

import { mosquittoConfigDir } from "../backup/paths.js";

import { ensureDir } from "./paths.js";



const execFileAsync = promisify(execFile);



export type MosquittoCredentialSync = {

  ok: boolean;

  users: string[];

  error?: string;

};



/** Rebuild Mosquitto passwd from the installation MQTT user in .env. */

export async function syncMosquittoPasswdForInstallation(): Promise<MosquittoCredentialSync> {

  const username = config.mqttUsername().trim();

  const password = config.mqttPassword();



  if (!username || !password) {

    return {

      ok: false,

      users: [],

      error: "MQTT_USERNAME or MQTT_PASSWORD missing in environment",

    };

  }



  const dir = mosquittoConfigDir();

  const passwdPath = path.join(dir, "passwd");

  ensureDir(dir);

  try {

    fs.unlinkSync(passwdPath);

  } catch {

    /* fresh file */

  }



  try {

    await execFileAsync(

      "mosquitto_passwd",

      ["-b", "-c", passwdPath, username, password],

      { timeout: 30_000 }

    );

    fs.chmodSync(passwdPath, 0o644);

  } catch (err) {

    const msg = err instanceof Error ? err.message : String(err);

    return { ok: false, users: [], error: msg };

  }



  return { ok: true, users: [username] };

}



function passwdFileHasUser(passwdContent: string, username: string): boolean {

  return passwdContent

    .split("\n")

    .some((line) => line.trim().startsWith(`${username}:`));

}



export function mosquittoPasswdNeedsSync(): boolean {

  const username = config.mqttUsername().trim();

  if (!username || !config.mqttPassword()) return false;

  const passwdPath = path.join(mosquittoConfigDir(), "passwd");

  if (!fs.existsSync(passwdPath)) return true;

  const content = fs.readFileSync(passwdPath, "utf8");

  return !passwdFileHasUser(content, username);

}


