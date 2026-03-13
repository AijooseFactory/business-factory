import type { UIAdapterModule } from "./types.js";
import { parseAgentZeroStdoutLine } from "./parse-stdout.js";
import { AgentZeroConfigFields } from "./config-fields.js";
import { buildAgentZeroConfig } from "./build-config.js";

export const agentZeroUIAdapter: UIAdapterModule = {
  type: "agent_zero",
  label: "Agent Zero",
  capabilities: {
    isLocal: false,
    modelRequired: false,
  },
  parseStdoutLine: parseAgentZeroStdoutLine,
  ConfigFields: AgentZeroConfigFields,
  buildAdapterConfig: buildAgentZeroConfig,
};

export default agentZeroUIAdapter;
