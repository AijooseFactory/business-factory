import type { UIAdapterModule } from "../types";
import { parseOpenCodeStdoutLine } from "@paperclipai/adapter-opencode-local/ui";
import { OpenCodeLocalConfigFields } from "./config-fields";
import { buildOpenCodeLocalConfig } from "@paperclipai/adapter-opencode-local/ui";

export const openCodeLocalUIAdapter: UIAdapterModule = {
  type: "opencode_local",
  label: "OpenCode (local)",
  capabilities: {
    isLocal: true,
    hasCommand: true,
    defaultCommand: "opencode",
    modelRequired: true,
    groupByProvider: true,
    thinkingEffortKey: "variant",
    thinkingEffortOptions: [
      { id: "", label: "Auto" },
      { id: "minimal", label: "Minimal" },
      { id: "low", label: "Low" },
      { id: "medium", label: "Medium" },
      { id: "high", label: "High" },
      { id: "max", label: "Max" },
    ],
  },
  parseStdoutLine: parseOpenCodeStdoutLine,
  ConfigFields: OpenCodeLocalConfigFields,
  buildAdapterConfig: buildOpenCodeLocalConfig,
};
