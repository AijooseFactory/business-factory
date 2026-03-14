import fs from "node:fs/promises";
import path from "node:path";
import { registerAdapter } from "./registry.js";
import type { ServerAdapterModule } from "./types.js";

// Utility to find an object matching ServerAdapterModule contract
function findServerAdapterExports(mod: Record<string, any>): ServerAdapterModule | null {
  if (mod.type && typeof mod.execute === "function" && typeof mod.testEnvironment === "function") {
    return mod as ServerAdapterModule;
  }
  if (mod.default && mod.default.type && typeof mod.default.execute === "function") {
    return mod.default as ServerAdapterModule;
  }
  for (const exp of Object.values(mod)) {
    if (exp && typeof exp === "object" && "type" in exp && "execute" in exp) {
      if (typeof (exp as any).execute === "function") {
        return exp as ServerAdapterModule;
      }
    }
  }
  return null;
}

export async function loadPlugins(cwd = process.cwd()): Promise<void> {
  const configPath = path.resolve(cwd, "paperclip.config.json");
  let plugins: string[] = [];
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(raw);
    if (Array.isArray(config.plugins)) {
      plugins = config.plugins;
    }
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      console.warn(`[Paperclip Plugins] Failed to read ${configPath}:`, err.message);
    }
    return;
  }

  if (plugins.length === 0) return;

  console.log(`[Paperclip Plugins] Discovering plugins from ${configPath}...`);
  for (const pluginPkg of plugins) {
    try {
      // Import the server entrypoint of the plugin.
      // E.g. "@business-factory/adapter-agent-zero/server"
      const modulePath = pluginPkg.endsWith("/server") ? pluginPkg : `${pluginPkg}/server`;
      const mod = await import(modulePath);
      const adapter = findServerAdapterExports(mod);
      if (adapter) {
        registerAdapter(adapter);
      } else {
        console.warn(`[Paperclip Plugins] Warning: Plugin '${pluginPkg}' did not export a valid ServerAdapterModule.`);
      }
    } catch (err: any) {
      console.error(`[Paperclip Plugins] Error loading plugin '${pluginPkg}':`, err);
    }
  }
}
