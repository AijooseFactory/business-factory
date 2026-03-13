import type { ComponentType } from "react";
import type { CreateConfigValues } from "@paperclipai/adapter-utils";

// Re-export shared types so local consumers don't need to change imports
export type { TranscriptEntry, StdoutLineParser, CreateConfigValues } from "@paperclipai/adapter-utils";

export interface AdapterConfigFieldsProps {
  mode: "create" | "edit";
  isCreate: boolean;
  adapterType: string;
  /** Create mode: raw form values */
  values: CreateConfigValues | null;
  /** Create mode: setter for form values */
  set: ((patch: Partial<CreateConfigValues>) => void) | null;
  /** Edit mode: original adapterConfig from agent */
  config: Record<string, unknown>;
  /** Edit mode: read effective value */
  eff: <T>(group: "adapterConfig", field: string, original: T) => T;
  /** Edit mode: mark field dirty */
  mark: (group: "adapterConfig", field: string, value: unknown) => void;
  /** Available models for dropdowns */
  models: { id: string; label: string }[];
}

export interface AdapterCapabilities {
  /** True if this is a local CLI-based adapter (e.g. requires cwd, command, promptTemplate) */
  isLocal?: boolean;
  /** True if the adapter supports a configurable command override */
  hasCommand?: boolean;
  /** The default CLI command if hasCommand is true */
  defaultCommand?: string;
  /** The default model ID for when the adapter is first selected */
  defaultModel?: string;
  /** Whether model selection is strictly required (false = allow "Default" auto-selection) */
  modelRequired?: boolean;
  /** The key used in adapterConfig to store the thinking/reasoning effort (e.g., 'effort', 'mode') */
  thinkingEffortKey?: string;
  /** The available options for the thinking effort dropdown */
  thinkingEffortOptions?: { id: string; label: string }[];
  /** Whether the model dropdown should visually group by provider (e.g. OpenCode) */
  groupByProvider?: boolean;
  /** Custom defaults for the adapterConfig when created */
  defaultAdapterConfig?: Record<string, unknown>;
}

export interface UIAdapterModule {
  type: string;
  label: string;
  capabilities?: AdapterCapabilities;
  parseStdoutLine: (line: string, ts: string) => import("@paperclipai/adapter-utils").TranscriptEntry[];
  ConfigFields: ComponentType<AdapterConfigFieldsProps>;
  buildAdapterConfig: (values: CreateConfigValues) => Record<string, unknown>;
}
