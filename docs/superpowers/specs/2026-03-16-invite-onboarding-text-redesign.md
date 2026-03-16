# Invite Onboarding Text Redesign - Design Spec

**Date:** 2026-03-16
**Status:** Approved

## Overview

Redesign the invite onboarding text document to support multiple agent types (Agent Zero and OpenClaw Gateway) with clear sectioning, Business Factory branding (replacing Paperclip), and 2-way communication support for Agent Zero.

## Goals

1. Support Agent Zero onboarding with full 2-way communication
2. Support OpenClaw Gateway onboarding (existing, updated)
3. Replace all "Paperclip" references with "Business Factory"
4. Add company name and role to the header
5. Provide clear, agent-type-specific instructions

## Structure

```
# You're invited to join [COMPANY NAME] in the Ai Business Factory Office Space

Your role: [TEAM_ROLE]

## Connectivity Check
- List of URLs to try
- How to test each one
- What to do if none work (allowed-hostname command)

## Agent Zero Onboarding
## This onboarding flow is for Agent Zero ONLY.

- Step 0: Gather required info
- Step 1: Submit join request (adapterType: "agent_zero")
- Step 2: Wait for approval
- Step 3: Claim API key
- Step 4: Configure 2-way communication (webhooks, heartbeat)

## OpenClaw Gateway Onboarding
## This onboarding flow is for OpenClaw Gateway ONLY.

- Step 0: Get gateway auth token
- Step 1: Submit join request (adapterType: "openclaw_gateway")
- Step 2: Wait for approval
- Step 3: Claim API key
- Step 4: Install Business Factory skill

## Helpful Endpoints
```

## Agent Zero Configuration

### Join Request Payload

```json
{
  "requestType": "agent",
  "agentName": "Your Agent Zero Name",
  "adapterType": "agent_zero",
  "capabilities": "Agent Zero native HTTP adapter",
  "agentDefaultsPayload": {
    "url": "http://your-agent-zero-host:8090/",
    "businessFactoryApiUrl": "https://reachable-business-factory-host:3100",
    "sessionKeyStrategy": "issue",
    "role": "operator",
    "scopes": ["operator.admin"]
  }
}
```

### 2-Way Communication

Agent Zero must push updates back to Business Factory via webhook:

```
POST /api/agent-zero/{agentId}/webhook
```

Payload types:
- `task_complete` - Report task completion with result
- `status_update` - Update run status (running/paused/error)
- `approval_request` - Request human approval
- `heartbeat` - Keepalive ping

### Result Format

When Agent Zero completes a task, include in response:
```
BUSINESS_FACTORY_RESULT_JSON
```
```json
{
  "status": "done",
  "summary": "Short factual summary",
  "comment": "Markdown notes"
}
```

Valid statuses: `backlog`, `todo`, `in_progress`, `in_review`, `blocked`, `done`, `cancelled`

## OpenClaw Gateway Configuration (Updated)

### Changes from Existing

1. Replace all "Paperclip" references with "Business Factory"
2. Replace "paperclipApiUrl" with "businessFactoryApiUrl"
3. Update environment variables: `PAPERCLIP_API_KEY` → `BUSINESS_FACTORY_API_KEY`
4. Update file paths: `~/.openclaw/workspace/paperclip-claimed-api-key.json` → `~/.openclaw/workspace/business-factory-claimed-api-key.json`

## Connectivity Section

### URLs to Try

- http://localhost:3100/api/invites/{token}/onboarding.txt
- http://0.0.0.0:3100/api/invites/{token}/onboarding.txt
- http://ajf-business-factory-server:3100/api/invites/{token}/onboarding.txt
- http://ajf-oliver-wendell:3100/api/invites/{token}/onboarding.txt
- http://oliver-wendell:3100/api/invites/{token}/onboarding.txt
- http://agent-zero:3100/api/invites/{token}/onboarding.txt
- http://172.25.0.3:3100/api/invites/{token}/onboarding.txt
- http://172.25.0.4:3100/api/invites/{token}/onboarding.txt
- http://host.docker.internal:3100/api/invites/{token}/onboarding.txt

### Test Command

```bash
curl -fsS <base-url>/api/health
```

### If None Work

```bash
pnpm businessfactoryai allowed-hostname <host>
```

Then verify with: `curl -fsS <base-url>/api/health`

## Implementation Notes

- Update `buildInviteOnboardingTextDocument` in `server/src/routes/access.ts`
- Add company name and role extraction from invite defaultsPayload
- Conditionally render sections based on invite configuration or include both
- Update test file `server/src/__tests__/invite-onboarding-text.test.ts`
- Ensure all "Paperclip" → "Business Factory" replacements are complete