import type { ServerAdapterModule } from "@business-factory/adapter-utils";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";

export const agentZeroAdapter: ServerAdapterModule = {
  type: "agent_zero",
  execute,
  testEnvironment,
  usesServerLocalWorkspace: false,
  models: [],
  agentConfigurationDoc: `# Agent Zero Adapter Configuration

## Overview

The Agent Zero adapter enables Business Factory to dispatch tasks to Agent Zero instances and receive results back. This is a standard HTTP-based adapter that communicates via Agent Zero's API.

## Configuration Fields

### URL (Required)
The endpoint URL for your Agent Zero instance.
- Example: \`http://ajf-einstein:8090/\`
- Must be an HTTP or HTTPS URL
- Should include the trailing slash

### API Key (Optional)
An optional API key if your Agent Zero instance requires authentication.
- Passed as \`X-API-KEY\` header in requests

## Communication Pattern

1. **Business Factory → Agent Zero**: HTTP POST to \`/api_message\` endpoint
2. **Agent Zero → Business Factory**: Webhook POST to \`/api/agent-zero/:agentId/webhook\`

## Result Format

Agent Zero should include \`BUSINESS_FACTORY_RESULT_JSON\` in its response to signal task completion:

\`\`\`
BUSINESS_FACTORY_RESULT_JSON
\`\`\`json
{
  "status": "done",
  "summary": "Task completed successfully",
  "comment": "Additional details about the work done"
}
\`\`\`

Valid statuses: \`backlog\`, \`todo\`, \`in_progress\`, \`in_review\`, \`blocked\`, \`done\`, \`cancelled\`

## Webhook Events

Agent Zero can push updates to Business Factory via webhook:
- \`task_complete\`: Report task completion with result
- \`status_update\`: Update run status
- \`approval_request\`: Request human approval
- \`heartbeat\`: Keepalive ping

## Environment Variables

Agent Zero receives these environment variables from Business Factory:
- \`BUSINESS_FACTORY_API_URL\`: Business Factory API endpoint
- \`BUSINESS_FACTORY_API_KEY\`: Authentication token
- \`BUSINESS_FACTORY_COMPANY_ID\`: Company identifier
- \`BUSINESS_FACTORY_AGENT_ID\`: Agent identifier
- \`BUSINESS_FACTORY_PROJECT_ID\`: Project identifier (when assigned)
- \`BUSINESS_FACTORY_RUN_ID\`: Run identifier (during active execution)
- \`BUSINESS_FACTORY_ISSUE_ID\`: Issue identifier (when assigned)

## Migration from Python Extensions

If upgrading from the previous Python extension-based integration:
1. Remove any installed Python extensions from Agent Zero
2. Remove \`.a0proj/\` bridge directories from project workspaces
3. Configure Agent Zero to call Business Factory webhooks instead of relying on filesystem sync
4. Update Agent Zero's API endpoint in Business Factory agent configuration
`,
};
