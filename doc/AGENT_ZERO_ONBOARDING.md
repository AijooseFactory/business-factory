# Agent Zero Onboarding

This guide explains how to connect an Agent Zero instance to Business Factory as a native HTTP adapter.

## Overview

Agent Zero connects to Business Factory via HTTP requests. Unlike the previous Python extension integration, the native adapter approach:

- **No Python extensions** - No files to install in Agent Zero's runtime
- **No shared filesystem** - Works over HTTP, no `.a0proj/` bridge directories needed
- **Webhook support** - Agent Zero can push updates back to Business Factory

## Prerequisites

1. Business Factory running and accessible
2. Agent Zero instance running and accessible via HTTP
3. Network connectivity between Business Factory and Agent Zero

## Setup Steps

### 1. Start Business Factory

```bash
cd <business-factory-repo-root>
pnpm dev
```

Verify it's running:
```bash
curl -sS http://127.0.0.1:3100/api/health | jq
```

### 2. Create an Agent Zero Agent

In Business Factory UI:

1. Navigate to your company's Agents page
2. Click "Create Agent" or "Hire Agent"
3. Select "Agent Zero" as the adapter type
4. Configure the adapter:
   - **URL**: The base URL of your Agent Zero instance (e.g., `http://ajf-einstein:8090/`)
   - **API Key** (optional): If your Agent Zero requires authentication

### 3. Verify Connection

Test the adapter environment in Business Factory UI:
1. Go to the agent's settings
2. Click "Test Environment"
3. You should see a successful connection check

### 4. Assign Work to the Agent

Create an issue and assign it to the Agent Zero agent:
1. Navigate to Issues
2. Create a new issue with instructions
3. Assign it to your Agent Zero agent
4. The agent will pick up the work on its next heartbeat

## Communication Flow

### Business Factory → Agent Zero

1. Business Factory sends a POST request to Agent Zero's `/api_message` endpoint
2. The request includes:
   - The task message (from the assigned issue)
   - Context variables (company ID, agent ID, project ID, etc.)
   - Session continuity via `context_id`

### Agent Zero → Business Factory (Optional)

Agent Zero can push updates back via webhook:

```
POST /api/agent-zero/:agentId/webhook
```

Payload types:
- `task_complete` - Report task completion with result
- `status_update` - Update run status (running/paused/error)
- `approval_request` - Request human approval
- `heartbeat` - Keepalive ping

## Result Format

When Agent Zero completes a task, it should include a result marker in its response:

```
BUSINESS_FACTORY_RESULT_JSON
```json
{
  "status": "done",
  "summary": "Short factual summary of what was completed",
  "comment": "Markdown note explaining the work or follow-up items"
}
```

Valid statuses:
- `backlog`
- `todo`
- `in_progress`
- `in_review`
- `blocked`
- `done`
- `cancelled`

## Environment Variables

Business Factory passes these context values to Agent Zero:

| Variable | Description |
|----------|-------------|
| `BUSINESS_FACTORY_API_URL` | Business Factory API endpoint |
| `BUSINESS_FACTORY_API_KEY` | Authentication token |
| `BUSINESS_FACTORY_COMPANY_ID` | Company identifier |
| `BUSINESS_FACTORY_AGENT_ID` | Agent identifier |
| `BUSINESS_FACTORY_PROJECT_ID` | Project identifier (when assigned) |
| `BUSINESS_FACTORY_RUN_ID` | Run identifier (during active execution) |
| `BUSINESS_FACTORY_ISSUE_ID` | Issue identifier (when assigned) |
| `BUSINESS_FACTORY_ISSUE_IDENTIFIER` | Issue display ID (e.g., "ENG-123") |
| `BUSINESS_FACTORY_ISSUE_TITLE` | Issue title |

## Webhook Integration (Advanced)

If you want Agent Zero to push updates back to Business Factory:

### Task Completion Webhook

```bash
curl -X POST http://<business-factory-host>:3100/api/agent-zero/<agent-id>/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "<agent-id>",
    "runId": "<run-id>",
    "type": "task_complete",
    "data": {
      "result": {
        "status": "done",
        "summary": "Task completed successfully",
        "comment": "Details here"
      }
    }
  }'
```

### Status Update Webhook

```bash
curl -X POST http://<business-factory-host>:3100/api/agent-zero/<agent-id>/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "<agent-id>",
    "type": "status_update",
    "data": {
      "status": "running",
      "message": "Processing task..."
    }
  }'
```

## Migration from Python Extension Integration

If you were using the previous Agent Zero integration with Python extensions:

1. **Remove Python extensions** from Agent Zero's `usr/extensions/` directory
2. **Remove `.a0proj/` directories** from project workspaces (they're no longer needed)
3. **Update Agent Zero configuration** to use Business Factory API URL instead of filesystem bridge files
4. **Configure the native adapter** in Business Factory with your Agent Zero URL

The native adapter does NOT require:
- Installing files into Agent Zero's runtime
- Shared filesystem between Business Factory and Agent Zero
- Periodic filesystem sync

## Troubleshooting

### Connection Failed

- Verify Agent Zero URL is correct and accessible from Business Factory
- Check for firewall rules blocking HTTP requests
- Verify Agent Zero is running on the specified port

### Task Not Picked Up

- Check that the agent has a valid heartbeat schedule
- Verify the agent is not paused or in an error state
- Check Business Factory logs for adapter execution errors

### Results Not Updating

- Ensure Agent Zero is returning the `BUSINESS_FACTORY_RESULT_JSON` marker
- Check that the status is one of the valid values
- Verify the webhook endpoint is accessible from Agent Zero (if using webhooks)