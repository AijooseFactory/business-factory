import type { ServerAdapterModule } from "@business-factory/adapter-utils";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";

export const agentZeroAdapter: ServerAdapterModule = {
  type: "agent_zero",
  execute,
  testEnvironment,
  usesServerLocalWorkspace: false,
  models: [],
  agentConfigurationDoc: `# Agent Zero configuration

Adapter: agent_zero

Configure the Endpoint URL to point to your Agent Zero instance (e.g. http://ajf-einstein:8090/ ).
`,
};
