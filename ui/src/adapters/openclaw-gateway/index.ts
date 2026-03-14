import type { UIAdapterModule } from "../types";
import { parseOpenClawGatewayStdoutLine } from "@business-factory/adapter-openclaw-gateway/ui";
import { buildOpenClawGatewayConfig } from "@business-factory/adapter-openclaw-gateway/ui";
import { OpenClawGatewayConfigFields } from "./config-fields";

export const openClawGatewayUIAdapter: UIAdapterModule = {
  type: "openclaw_gateway",
  label: "OpenClaw Gateway",
  capabilities: {},
  parseStdoutLine: parseOpenClawGatewayStdoutLine,
  ConfigFields: OpenClawGatewayConfigFields,
  buildAdapterConfig: buildOpenClawGatewayConfig,
};
