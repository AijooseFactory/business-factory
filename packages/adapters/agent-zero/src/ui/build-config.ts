import type { CreateConfigValues } from "@paperclipai/adapter-utils";

export function buildAgentZeroConfig(values: CreateConfigValues): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  if (values.url) config.url = values.url;
  if (values.apiKey) config.apiKey = values.apiKey;
  return config;
}
