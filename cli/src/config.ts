import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface StoredConfig {
  apiKey?: string;
  email?: string;
  apiUrl?: string;
}

export function configPath(): string {
  const base = process.env.XDG_CONFIG_HOME || (process.platform === "win32" ? process.env.APPDATA : undefined) || join(homedir(), ".config");
  return join(base!, "memecub", "config.json");
}

export async function loadConfig(): Promise<StoredConfig> {
  try {
    return JSON.parse(await readFile(configPath(), "utf8")) as StoredConfig;
  } catch {
    return {};
  }
}

/** Written readable by the owner only, since it holds the API key. */
export async function saveConfig(c: StoredConfig): Promise<void> {
  const path = configPath();
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, JSON.stringify(c, null, 2) + "\n", { mode: 0o600 });
  await chmod(path, 0o600).catch(() => undefined);
}

export async function clearConfig(): Promise<void> {
  await rm(configPath(), { force: true });
}
