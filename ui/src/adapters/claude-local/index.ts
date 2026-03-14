import type { UIAdapterModule } from "../types";
import { parseClaudeStdoutLine } from "@business-factory/adapter-claude-local/ui";
import { ClaudeLocalConfigFields } from "./config-fields";
import { buildClaudeLocalConfig } from "@business-factory/adapter-claude-local/ui";

export const claudeLocalUIAdapter: UIAdapterModule = {
  type: "claude_local",
  label: "Claude Code (local)",
  capabilities: {
    isLocal: true,
    hasCommand: true,
    defaultCommand: "claude",
    thinkingEffortKey: "effort",
    thinkingEffortOptions: [
      { id: "", label: "Auto" },
      { id: "low", label: "Low" },
      { id: "medium", label: "Medium" },
      { id: "high", label: "High" },
    ],
  },
  parseStdoutLine: parseClaudeStdoutLine,
  ConfigFields: ClaudeLocalConfigFields,
  buildAdapterConfig: buildClaudeLocalConfig,
};
