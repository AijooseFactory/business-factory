# Business Factory Changelog

All notable changes to Business Factory (formerly Paperclip) are documented in this file.

## [Unreleased] - 2026-03-14

### Breaking Changes: Paperclip → Business Factory Rebranding

Business Factory is the new name for Paperclip. This rebranding affects all user-facing strings, configuration, and package names.

### Package Names

All npm packages have been renamed from `@paperclipai/*` to `@business-factory/*`:

| Old Package | New Package |
|-------------|-------------|
| `@paperclipai/adapter-agent-zero` | `@business-factory/adapter-agent-zero` |
| `@paperclipai/adapter-claude-local` | `@business-factory/adapter-claude-local` |
| `@paperclipai/adapter-codex-local` | `@business-factory/adapter-codex-local` |
| `@paperclipai/adapter-cursor-local` | `@business-factory/adapter-cursor-local` |
| `@paperclipai/adapter-gemini-local` | `@business-factory/adapter-gemini-local` |
| `@paperclipai/adapter-opencode-local` | `@business-factory/adapter-opencode-local` |
| `@paperclipai/adapter-openclaw-gateway` | `@business-factory/adapter-openclaw-gateway` |
| `@paperclipai/adapter-pi-local` | `@business-factory/adapter-pi-local` |
| `@paperclipai/adapter-utils` | `@business-factory/adapter-utils` |
| `@paperclipai/db` | `@business-factory/db` |
| `@paperclipai/shared` | `@business-factory/shared` |

### Environment Variables

Most environment variables remain the same for backward compatibility, but new `BUSINESS_FACTORY_*` variants are now preferred:

| Old Variable | New Variable | Notes |
|--------------|--------------|-------|
| `PAPERCLIP_API_URL` | `BUSINESS_FACTORY_API_URL` | Both work |
| `PAPERCLIP_API_KEY` | `BUSINESS_FACTORY_API_KEY` | Both work |
| `PAPERCLIP_COMPANY_ID` | `BUSINESS_FACTORY_COMPANY_ID` | Both work |
| `PAPERCLIP_AGENT_ID` | `BUSINESS_FACTORY_AGENT_ID` | Both work |
| `PAPERCLIP_RUN_ID` | `BUSINESS_FACTORY_RUN_ID` | Both work |
| `PAPERCLIP_PROJECT_ID` | `BUSINESS_FACTORY_PROJECT_ID` | Both work |
| `PAPERCLIP_ISSUE_ID` | `BUSINESS_FACTORY_ISSUE_ID` | Both work |

### Result Format

Agent result markers have changed:

| Old | New |
|-----|-----|
| `PAPERCLIP_RESULT_JSON` | `BUSINESS_FACTORY_RESULT_JSON` |

Both markers are supported for backward compatibility.

### Removed: Agent Zero Python Extensions

The Agent Zero integration has been converted from a Python-extension based integration to a **standard native HTTP adapter**. This removes the need for:

- Installing Python files into Agent Zero's runtime
- `.a0proj/` bridge directories in project workspaces
- Filesystem synchronization between Business Factory and Agent Zero

**Migration steps for existing Agent Zero users:**
1. Remove Python extensions from Agent Zero's `usr/extensions/` directory
2. Remove `.a0proj/` directories from project workspaces
3. Update Agent Zero configuration to use Business Factory API URL
4. Configure webhook endpoint for 2-way communication (optional)

### Added: Agent Zero Webhook Endpoint

New endpoint for Agent Zero to push updates to Business Factory:

```
POST /api/agent-zero/:agentId/webhook
```

Payload types:
- `task_complete` - Report task completion
- `status_update` - Update run status
- `approval_request` - Request human approval
- `heartbeat` - Keepalive ping

### Changed: UI Branding

- Application name changed from "Paperclip" to "Business Factory"
- Logos and branding assets updated
- Documentation references updated

### Changed: CLI Tool

- Binary name remains `paperclip` for backward compatibility
- Internal references updated to Business Factory
- Environment variable support for both naming conventions

### Files Changed Summary

**Deleted:**
```
integrations/agent-zero/                          # Python extensions
server/src/services/agent-zero-project-sync.ts     # Filesystem sync
```

**Modified:**
```
server/src/routes/projects.ts                      # Removed Agent Zero sync calls
server/src/services/heartbeat.ts                   # Removed Agent Zero bridge logic
server/src/index.ts                                # Removed project sync startup
packages/adapters/agent-zero/src/server/index.ts  # Enhanced documentation
```

**Created:**
```
server/src/routes/agent-zero-webhook.ts           # Webhook endpoint
CHANGELOG.md                                       # This file
```

---

## Previous Releases

### [0.x] - Pre-Rebrand

For changes prior to the Business Factory rebranding, see git history. Key features included:

- Multi-adapter support (Claude, Cursor, Codex, OpenCode, Gemini, Agent Zero, etc.)
- Issue-backed agent execution
- Real-time WebSocket events
- Project and workspace management
- Agent hiring and approval workflows
- Cost tracking and token usage
- OpenClaw gateway integration
- Local and authenticated deployment modes