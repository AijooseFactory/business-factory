import type { UIAdapterModule } from "./types";
import { uiPlugins } from "virtual:paperclip-plugins";
import { claudeLocalUIAdapter } from "./claude-local";
import { codexLocalUIAdapter } from "./codex-local";
import { cursorLocalUIAdapter } from "./cursor";
import { geminiLocalUIAdapter } from "./gemini-local";
import { openCodeLocalUIAdapter } from "./opencode-local";
import { piLocalUIAdapter } from "./pi-local";
import { openClawGatewayUIAdapter } from "./openclaw-gateway";
import { processUIAdapter } from "./process";
import { httpUIAdapter } from "./http";

const uiAdaptersByType = new Map<string, UIAdapterModule>(
  [
    claudeLocalUIAdapter,
    codexLocalUIAdapter,
    openCodeLocalUIAdapter,
    piLocalUIAdapter,
    cursorLocalUIAdapter,
    geminiLocalUIAdapter,
    openClawGatewayUIAdapter,
    processUIAdapter,
    httpUIAdapter,
  ].map((a) => [a.type, a]),
);

for (const pluginRaw of uiPlugins) {
  let uiAdapter: UIAdapterModule | null = null;
  if (pluginRaw.type && pluginRaw.label && typeof pluginRaw.buildAdapterConfig === 'function') {
    uiAdapter = pluginRaw as unknown as UIAdapterModule;
  } else if (pluginRaw.default && pluginRaw.default.type && typeof pluginRaw.default.buildAdapterConfig === 'function') {
    uiAdapter = pluginRaw.default as unknown as UIAdapterModule;
  } else {
    for (const val of Object.values(pluginRaw)) {
      if (val && typeof val === "object" && "type" in val && "label" in val && "buildAdapterConfig" in val) {
        uiAdapter = val as unknown as UIAdapterModule;
        break;
      }
    }
  }

  if (uiAdapter) {
    uiAdaptersByType.set(uiAdapter.type, uiAdapter);
  }
}

export function getUIAdapter(type: string): UIAdapterModule {
  return uiAdaptersByType.get(type) ?? processUIAdapter;
}
