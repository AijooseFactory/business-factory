import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

export default function paperclipPlugins(): Plugin {
  const virtualModuleId = 'virtual:paperclip-plugins';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;

  return {
    name: 'vite-plugin-paperclip',
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        // process.cwd() is usually source/ui or source/
        let configPath = "";
        let currentDir = process.cwd();
        for (let i = 0; i < 5; i++) {
          const candidate = path.resolve(currentDir, "paperclip.config.json");
          if (fs.existsSync(candidate)) {
            configPath = candidate;
            break;
          }
          const parent = path.resolve(currentDir, "..");
          if (parent === currentDir) break;
          currentDir = parent;
        }

        let plugins: string[] = [];
        if (configPath) {
          try {
            const raw = fs.readFileSync(configPath, "utf-8");
            const config = JSON.parse(raw);
            if (Array.isArray(config.plugins)) {
              plugins = config.plugins;
            }
          } catch (err: any) {
            console.warn("[Vite Plugin] Failed to read paperclip.config.json:", err.message);
          }
        }
        
        // Generate imports. We must make sure to resolve external peer deps properly but Vite handles bare imports.
        const imports = plugins.map((pkg, i) => {
          const modPath = pkg.endsWith("/ui") ? pkg : `${pkg}/ui`;
          return `import * as Plugin${i} from "${modPath}";`;
        }).join("\n");
        const exports = `export const uiPlugins = [\n` +
          plugins.map((_, i) => `  Plugin${i}`).join(",\n") + 
          `\n];\n`;
          
        return `${imports}\n${exports}`;
      }
    }
  };
}
