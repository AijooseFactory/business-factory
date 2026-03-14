# Business Factory Rebranding Design

**Date:** 2026-03-13
**Status:** Approved
**Scope:** Full codebase rebranding from Paperclip to Business Factory

---

## Overview

This document specifies the complete rebranding of the Business Factory codebase from its Paperclip origins. The project is an independent clone and inspiration project based on Paperclip. All user-facing, operational, and internal branding must change to "Business Factory" while preserving full backward compatibility so existing agent configs, scripts, and `.env` files using `PAPERCLIP_*` names continue to work.

**Primary slug:** `business-factory`
**npm scope:** `@business-factory/*`
**CLI command:** `business-factory`
**Env var prefix:** `BUSINESS_FACTORY_*`
**Default data dir:** `~/.business-factory/`

---

## Approach: Layered by Concern

Changes are executed in 5 ordered layers, each committed separately and verifiable before proceeding to the next. This ensures each layer is testable and git-bisectable if something breaks.

---

## Layer 1 — Package Names & npm Scope

All packages under `@paperclipai/*` are renamed to `@business-factory/*`. Every `import` statement across the entire codebase is updated accordingly. The `.changeset/config.json` fixed group is updated.

### Full rename map

| Old | New |
|-----|-----|
| `paperclip` (root monorepo) | `business-factory` |
| `paperclipai` (CLI binary name) | `business-factory` |
| `@paperclipai/server` | `@business-factory/server` |
| `@paperclipai/ui` | `@business-factory/ui` |
| `@paperclipai/db` | `@business-factory/db` |
| `@paperclipai/shared` | `@business-factory/shared` |
| `@paperclipai/adapter-utils` | `@business-factory/adapter-utils` |
| `@paperclipai/adapter-claude-local` | `@business-factory/adapter-claude-local` |
| `@paperclipai/adapter-codex-local` | `@business-factory/adapter-codex-local` |
| `@paperclipai/adapter-cursor-local` | `@business-factory/adapter-cursor-local` |
| `@paperclipai/adapter-gemini-local` | `@business-factory/adapter-gemini-local` |
| `@paperclipai/adapter-opencode-local` | `@business-factory/adapter-opencode-local` |
| `@paperclipai/adapter-pi-local` | `@business-factory/adapter-pi-local` |
| `@paperclipai/adapter-openclaw-gateway` | `@business-factory/adapter-openclaw-gateway` |
| `@aijoosefactory/paperclip-plugin-agent-zero` | `@business-factory/adapter-agent-zero` |

### Files affected
- Root `package.json` — name, scripts
- `cli/package.json` — name, bin field, keywords, repository URLs
- `server/package.json`, `ui/package.json`, `packages/db/package.json`, `packages/shared/package.json`, `packages/adapter-utils/package.json`
- All `packages/adapters/*/package.json` (8 adapter packages + agent-zero)
- `.changeset/config.json` — fixed versioning group
- All TypeScript source files with `import ... from "@paperclipai/..."` (~505 files)
- `pnpm-workspace.yaml` if it filters by scope

---

## Layer 2 — Environment Variables + Backward Compatibility

All `PAPERCLIP_*` environment variables are renamed to `BUSINESS_FACTORY_*`. Backward compatibility is preserved through two mechanisms:

### Category 1: Server reads from environment (~40 vars)
Every `process.env.PAPERCLIP_X` read in server code becomes:
```ts
process.env.BUSINESS_FACTORY_X ?? process.env.PAPERCLIP_X
```
This means existing `.env` files with `PAPERCLIP_*` names continue to work without any changes.

### Category 2: Injected into agent processes at runtime (~15 vars)
Both `BUSINESS_FACTORY_X` and `PAPERCLIP_X` are injected into every agent process environment. Agents running old scripts that read `PAPERCLIP_*` vars still work.

### Complete variable list (non-exhaustive — full enumeration in implementation plan)

**Server-read vars:** `BUSINESS_FACTORY_HOME`, `BUSINESS_FACTORY_INSTANCE_ID`, `BUSINESS_FACTORY_CONFIG`, `BUSINESS_FACTORY_DEPLOYMENT_MODE`, `BUSINESS_FACTORY_DEPLOYMENT_EXPOSURE`, `BUSINESS_FACTORY_PUBLIC_URL`, `BUSINESS_FACTORY_LISTEN_HOST`, `BUSINESS_FACTORY_LISTEN_PORT`, `BUSINESS_FACTORY_API_URL`, `BUSINESS_FACTORY_SECRETS_MASTER_KEY`, `BUSINESS_FACTORY_SECRETS_MASTER_KEY_FILE`, `BUSINESS_FACTORY_SECRETS_STRICT_MODE`, `BUSINESS_FACTORY_SECRETS_PROVIDER`, `BUSINESS_FACTORY_AGENT_JWT_SECRET`, `BUSINESS_FACTORY_AGENT_JWT_TTL_SECONDS`, `BUSINESS_FACTORY_AGENT_JWT_ISSUER`, `BUSINESS_FACTORY_AGENT_JWT_AUDIENCE`, `BUSINESS_FACTORY_STORAGE_PROVIDER`, `BUSINESS_FACTORY_STORAGE_LOCAL_DIR`, `BUSINESS_FACTORY_STORAGE_S3_*` (5 vars), `BUSINESS_FACTORY_DB_BACKUP_*` (4 vars), `BUSINESS_FACTORY_LOG_DIR`, `BUSINESS_FACTORY_ALLOWED_HOSTNAMES`, `BUSINESS_FACTORY_ALLOWED_ATTACHMENT_TYPES`, `BUSINESS_FACTORY_ATTACHMENT_MAX_BYTES`, `BUSINESS_FACTORY_OPEN_ON_LISTEN`, `BUSINESS_FACTORY_UI_DEV_MIDDLEWARE`, `BUSINESS_FACTORY_MIGRATION_*` (2 vars), `BUSINESS_FACTORY_EMBEDDED_POSTGRES_VERBOSE`, `BUSINESS_FACTORY_ENABLE_COMPANY_DELETION`, `BUSINESS_FACTORY_AUTH_*` (3 vars), `BUSINESS_FACTORY_AGENT_ZERO_*` (3 vars), `BUSINESS_FACTORY_SHARED_PROJECT_PATH_ALIASES`, `BUSINESS_FACTORY_WORKSPACE_CWD`, `BUSINESS_FACTORY_IN_WORKTREE`, `BUSINESS_FACTORY_WORKTREE_*` (2 vars), `BUSINESS_FACTORY_INTERNAL_API_URL`

**Agent-injected vars:** `BUSINESS_FACTORY_AGENT_ID`, `BUSINESS_FACTORY_COMPANY_ID`, `BUSINESS_FACTORY_API_URL`, `BUSINESS_FACTORY_API_KEY`, `BUSINESS_FACTORY_PROJECT_ID`, `BUSINESS_FACTORY_RUN_ID`, `BUSINESS_FACTORY_TASK_ID`, `BUSINESS_FACTORY_ISSUE_*` (3 vars), `BUSINESS_FACTORY_WAKE_*` (2 vars), `BUSINESS_FACTORY_WORKSPACE_*` (9 vars), `BUSINESS_FACTORY_AGENT_NAME`

### Other changes in this layer
- **HTTP header:** `x-paperclip-run-id` → `x-business-factory-run-id`; old header also sent for compat
- **`PaperclipApiClient` class:** Renamed to `BusinessFactoryApiClient`; old name kept as type alias
- **`buildPaperclipEnv()` function:** Renamed to `buildBusinessFactoryEnv()`; old name re-exported as alias
- **HTML comment markers** in `ui-branding.ts`: `<!-- PAPERCLIP_FAVICON_START -->` etc. → `<!-- BUSINESS_FACTORY_FAVICON_START -->`
- **JWT issuer/audience defaults:** `"paperclip"` / `"paperclip-api"` → `"business-factory"` / `"business-factory-api"`
- **S3 bucket default:** `"paperclip"` → `"business-factory"`

### Key files
- `packages/adapter-utils/src/server-utils.ts` — `buildPaperclipEnv()`, all injected vars
- `server/src/config.ts` — ~20 server-read vars
- `server/src/home-paths.ts` — `PAPERCLIP_HOME`, `PAPERCLIP_INSTANCE_ID`
- `server/src/index.ts` — startup, listen host/port assignment
- `server/src/services/workspace-runtime.ts` — workspace injection vars
- `server/src/services/agent-zero-project-sync.ts` — agent-zero bridge vars
- `server/src/agent-auth-jwt.ts` — JWT config
- `server/src/ui-branding.ts` — HTML comment markers, worktree vars
- `server/src/middleware/logger.ts` — log dir
- `server/src/paths.ts` — config path
- `server/src/secrets/local-encrypted-provider.ts` — secrets master key
- `server/src/auth/better-auth.ts` — public URL
- `server/src/startup-banner.ts` — JWT secret check
- `cli/src/client/http.ts` — HTTP header, `PaperclipApiClient` class

---

## Layer 3 — Config, Docker & Default Directories

| What | Old | New |
|------|-----|-----|
| Config file name | `paperclip.config.json` | `business-factory.config.json` |
| Config search path | `.paperclip/config.json` (walked up dir tree) | `.business-factory/config.json` |
| Default data directory | `~/.paperclip/` | `~/.business-factory/` |
| Docker service name | `paperclip` | `business-factory` |
| Docker volume | `paperclip-data` | `business-factory-data` |
| Postgres user/password/db | `paperclip:paperclip@.../paperclip` | `business-factory:business-factory@.../business-factory` |
| Vite virtual module | `virtual:paperclip-plugins` | `virtual:business-factory-plugins` |
| Vite plugin name | `vite-plugin-paperclip` | `vite-plugin-business-factory` |
| Sentinel value | `/__paperclip_repo_only__` | `/__business_factory_repo_only__` |
| Bridge instructions file | `paperclip-bridge.md` | `business-factory-bridge.md` |

**Backward compat:** Config path search falls back to `.paperclip/config.json` if `.business-factory/config.json` is not found. `~/.paperclip/` is checked as a fallback data directory if `~/.business-factory/` does not exist.

### Key files
- `server/src/paths.ts` — config search path
- `packages/db/src/runtime-config.ts` — default home directory
- `packages/db/src/backup.ts` — backup path defaults
- `docker-compose.yml` — service, volume, Postgres credentials
- `docker-compose.quickstart.yml` — service name, `PAPERCLIP_*` env var names
- `Dockerfile` — build commands, paths
- `ui/vite-plugin-paperclip.ts` — filename rename, virtual module ID, plugin name, config file search
- `server/src/services/projects.ts` — sentinel constant
- `server/src/services/agent-zero-project-sync.ts` — bridge file constant
- `paperclip.config.json` → `business-factory.config.json`

---

## Layer 4 — Runtime Skills

| What | Old | New |
|------|-----|-----|
| Skill directory | `skills/paperclip/` | `skills/business-factory/` |
| Skill directory | `skills/paperclip-create-agent/` | `skills/business-factory-create-agent/` |
| Symlink | `.claude/skills/paperclip` | `.claude/skills/business-factory` |
| Skill name (frontmatter) | `name: paperclip` | `name: business-factory` |
| Skill name (frontmatter) | `name: paperclip-create-agent` | `name: business-factory-create-agent` |
| SKILL.md content | All "Paperclip" references, env var names, header names, CLI command names | "Business Factory" equivalents |
| Skill root constant | `PAPERCLIP_SKILL_ROOT_RELATIVE_CANDIDATES` | `BUSINESS_FACTORY_SKILL_ROOT_RELATIVE_CANDIDATES` |
| Skill loader function | `listPaperclipSkillEntries()` | `listBusinessFactorySkillEntries()` |
| Test file | `paperclip-skill-utils.test.ts` | `business-factory-skill-utils.test.ts` |
| Test file | `paperclip-env.test.ts` | `business-factory-env.test.ts` |

### Key files
- `skills/paperclip/SKILL.md` and `skills/paperclip/references/api-reference.md` — rename dir, update content
- `skills/paperclip-create-agent/SKILL.md` and references — rename dir, update content
- `.claude/skills/paperclip` symlink — remove and recreate pointing to new directory
- `packages/adapter-utils/src/server-utils.ts` — constant and function rename
- `server/src/__tests__/paperclip-skill-utils.test.ts` — rename file, update imports and test names
- `server/src/__tests__/paperclip-env.test.ts` — rename file, update imports and test names
- `.claude/skills/design-guide/SKILL.md` — check for any Paperclip references

---

## Layer 5 — Docs & UI Text

All remaining user-visible "Paperclip" text is updated to "Business Factory".

### Files and changes
- `README.md` — all "Paperclip" display text → "Business Factory"
- `AGENTS.md` — "Paperclip is a control plane..." → "Business Factory is a control plane..."
- `docs/start/what-is-paperclip.md` → renamed `what-is-business-factory.md`; all content updated
- All other `docs/` files — display text "Paperclip" → "Business Factory"
- `doc/` internal plans — "Paperclip" references → "Business Factory"
- `cli/package.json` — `keywords`, `repository.url`, `homepage` updated to `github.com/AijooseFactory/business-factory`
- `cli/src/commands/onboard.ts` — banner text `paperclipai onboard` → `business-factory onboard`
- `cli/src/commands/run.ts` — banner text `paperclipai run` → `business-factory run`
- `cli/src/index.ts` — CLI help text, `.name()` call
- `server/src/routes/access.ts` — instructional strings with `PAPERCLIP_API_KEY`, `PAPERCLIP_API_URL` → new names
- `server/src/services/agent-zero-project-sync.ts` — bridge instruction text referencing Paperclip
- `docs/docs.json` — Mintlify config title and links
- `releases/` — left unchanged (historical record; upstream changelog links)

---

## What Does NOT Change

- Internal function logic and algorithm behavior
- Database schema (column names, table structure)
- API route paths (e.g. `/api/v1/...`) — these are URL contracts
- `releases/` changelog files — historical record
- `BETTER_AUTH_SECRET` and other non-Paperclip env vars
- Third-party package names and integrations

---

## Success Criteria

1. `pnpm install` completes cleanly after all package renames
2. `pnpm build` succeeds across all packages
3. All existing tests pass
4. Server starts and serves the UI
5. An agent heartbeat cycle completes successfully
6. Existing `.env` files with `PAPERCLIP_*` vars are still respected (backward compat)
7. No reference to "Paperclip" (case-insensitive) remains in user-facing text, docs, package names, or skill files
8. `releases/` files are the only remaining source of "paperclip" references
