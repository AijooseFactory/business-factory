import type { UIAdapterModule } from "../types";
import { parseCodexStdoutLine } from "@paperclipai/adapter-codex-local/ui";
import { CodexLocalConfigFields } from "./config-fields";
import { buildCodexLocalConfig } from "@paperclipai/adapter-codex-local/ui";
import { DEFAULT_CODEX_LOCAL_MODEL, DEFAULT_CODEX_LOCAL_BYPASS_APPROVALS_AND_SANDBOX } from "@paperclipai/adapter-codex-local";

export const codexLocalUIAdapter: UIAdapterModule = {
  type: "codex_local",
  label: "Codex (local)",
  capabilities: {
    isLocal: true,
    hasCommand: true,
    defaultCommand: "codex",
    defaultModel: DEFAULT_CODEX_LOCAL_MODEL,
    thinkingEffortKey: "modelReasoningEffort",
    thinkingEffortOptions: [
      { id: "", label: "Auto" },
      { id: "minimal", label: "Minimal" },
      { id: "low", label: "Low" },
      { id: "medium", label: "Medium" },
      { id: "high", label: "High" },
    ],
    defaultAdapterConfig: {
      dangerouslyBypassApprovalsAndSandbox: DEFAULT_CODEX_LOCAL_BYPASS_APPROVALS_AND_SANDBOX
    }
  },
  parseStdoutLine: parseCodexStdoutLine,
  ConfigFields: CodexLocalConfigFields,
  buildAdapterConfig: buildCodexLocalConfig,
};
