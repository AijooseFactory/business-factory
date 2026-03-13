import type { UIAdapterModule } from "../types";
import { parseCursorStdoutLine } from "@paperclipai/adapter-cursor-local/ui";
import { CursorLocalConfigFields } from "./config-fields";
import { buildCursorLocalConfig } from "@paperclipai/adapter-cursor-local/ui";
import { DEFAULT_CURSOR_LOCAL_MODEL } from "@paperclipai/adapter-cursor-local";

export const cursorLocalUIAdapter: UIAdapterModule = {
  type: "cursor",
  label: "Cursor CLI (local)",
  capabilities: {
    isLocal: true,
    hasCommand: true,
    defaultCommand: "agent",
    defaultModel: DEFAULT_CURSOR_LOCAL_MODEL,
    thinkingEffortKey: "mode",
    thinkingEffortOptions: [
      { id: "", label: "Auto" },
      { id: "plan", label: "Plan" },
      { id: "ask", label: "Ask" },
    ],
  },
  parseStdoutLine: parseCursorStdoutLine,
  ConfigFields: CursorLocalConfigFields,
  buildAdapterConfig: buildCursorLocalConfig,
};
