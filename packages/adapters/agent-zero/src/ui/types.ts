import type { FC } from "react";
import type { CreateConfigValues, StdoutLineParser } from "@business-factory/adapter-utils";
import type { Agent } from "@business-factory/shared";

export interface AdapterCapabilities {
  isLocal?: boolean;
  modelRequired?: boolean;
  groupByProvider?: boolean;
  defaultModel?: string;
  defaultCommand?: string;
  defaultAdapterConfig?: Record<string, unknown>;
  thinkingEffortKey?: string;
  thinkingEffortOptions?: ReadonlyArray<{ id: string; label: string }>;
}

export interface AdapterConfigFieldProps {
  mode: "create" | "edit";
  adapterType: string;
  values: CreateConfigValues | null;
  set: ((patch: Partial<CreateConfigValues>) => void) | null;
  config: Record<string, unknown>;
  eff: <T>(group: "adapterConfig", field: string, original: T) => T;
  mark: (group: "adapterConfig", field: string, value: unknown) => void;
  models: Array<{ id: string; label: string; providerId?: string | null }>;
  isCreate: boolean;
}

export interface UIAdapterModule {
  type: string;
  label: string;
  capabilities?: AdapterCapabilities;
  parseStdoutLine: StdoutLineParser;
  ConfigFields: FC<AdapterConfigFieldProps>;
  buildAdapterConfig: (values: CreateConfigValues) => Record<string, unknown>;
}
