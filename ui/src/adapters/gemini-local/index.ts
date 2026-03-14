import type { UIAdapterModule } from "../types";
import { parseGeminiStdoutLine } from "@business-factory/adapter-gemini-local/ui";
import { GeminiLocalConfigFields } from "./config-fields";
import { buildGeminiLocalConfig } from "@business-factory/adapter-gemini-local/ui";
import { DEFAULT_GEMINI_LOCAL_MODEL } from "@business-factory/adapter-gemini-local";

export const geminiLocalUIAdapter: UIAdapterModule = {
  type: "gemini_local",
  label: "Gemini CLI (local)",
  capabilities: {
    isLocal: true,
    hasCommand: true,
    defaultCommand: "gemini",
    defaultModel: DEFAULT_GEMINI_LOCAL_MODEL,
  },
  parseStdoutLine: parseGeminiStdoutLine,
  ConfigFields: GeminiLocalConfigFields,
  buildAdapterConfig: buildGeminiLocalConfig,
};
