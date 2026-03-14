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

All packages under `@paperclipai/*` are renamed to `@business-factory/*`. Every `import` statement across the entire codebase is updated accordingly. The `.changeset/config.json` fixed group AND ignore list are updated.

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
- `cli/package.json` — name, bin field, keywords, repository URLs → `github.com/AijooseFactory/business-factory`
- `server/package.json`, `ui/package.json`, `packages/db/package.json`, `packages/shared/package.json`, `packages/adapter-utils/package.json`
- All `packages/adapters/*/package.json` (8 adapter packages + agent-zero)
- `.changeset/config.json` — `fixed` group updated to `[["@business-factory/*", "business-factory"]]`; `ignore` list updated from `@paperclipai/ui` to `@business-factory/ui`
- All TypeScript source files with `import ... from "@paperclipai/..."` (~505 files)
- `pnpm-workspace.yaml` if it filters by scope
- `packages/shared/src/config-schema.ts` — exported types `paperclipConfigSchema` → `businessFactoryConfigSchema`, `PaperclipConfig` → `BusinessFactoryConfig` (old names re-exported as aliases)
- `packages/shared/src/index.ts` — re-export aliases updated
- `scripts/generate-npm-package-json.mjs` — hardcoded `@paperclipai/server` → `@business-factory/server`

---

## Layer 2 — Environment Variables + Backward Compatibility

All `PAPERCLIP_*` environment variables are renamed to `BUSINESS_FACTORY_*`. Backward compatibility is preserved through two mechanisms:

### Category 1: Server reads from environment (~40 vars)
Every `process.env.PAPERCLIP_X` read in server/cli code becomes:
```ts
process.env.BUSINESS_FACTORY_X ?? process.env.PAPERCLIP_X
```
This means existing `.env` files with `PAPERCLIP_*` names continue to work without any changes.

### Category 2: Injected into agent processes at runtime (~15 vars)
Both `BUSINESS_FACTORY_X` and `PAPERCLIP_X` are injected into every agent process environment. Agents running old scripts that read `PAPERCLIP_*` vars still work.

### Complete variable list (server-read)
`BUSINESS_FACTORY_HOME`, `BUSINESS_FACTORY_INSTANCE_ID`, `BUSINESS_FACTORY_CONFIG`, `BUSINESS_FACTORY_CONTEXT`, `BUSINESS_FACTORY_DEPLOYMENT_MODE`, `BUSINESS_FACTORY_DEPLOYMENT_EXPOSURE`, `BUSINESS_FACTORY_PUBLIC_URL`, `BUSINESS_FACTORY_LISTEN_HOST`, `BUSINESS_FACTORY_LISTEN_PORT`, `BUSINESS_FACTORY_API_URL`, `BUSINESS_FACTORY_SECRETS_MASTER_KEY`, `BUSINESS_FACTORY_SECRETS_MASTER_KEY_FILE`, `BUSINESS_FACTORY_SECRETS_STRICT_MODE`, `BUSINESS_FACTORY_SECRETS_PROVIDER`, `BUSINESS_FACTORY_AGENT_JWT_SECRET`, `BUSINESS_FACTORY_AGENT_JWT_TTL_SECONDS`, `BUSINESS_FACTORY_AGENT_JWT_ISSUER`, `BUSINESS_FACTORY_AGENT_JWT_AUDIENCE`, `BUSINESS_FACTORY_STORAGE_PROVIDER`, `BUSINESS_FACTORY_STORAGE_LOCAL_DIR`, `BUSINESS_FACTORY_STORAGE_S3_BUCKET`, `BUSINESS_FACTORY_STORAGE_S3_REGION`, `BUSINESS_FACTORY_STORAGE_S3_ENDPOINT`, `BUSINESS_FACTORY_STORAGE_S3_PREFIX`, `BUSINESS_FACTORY_STORAGE_S3_FORCE_PATH_STYLE`, `BUSINESS_FACTORY_DB_BACKUP_ENABLED`, `BUSINESS_FACTORY_DB_BACKUP_INTERVAL_MINUTES`, `BUSINESS_FACTORY_DB_BACKUP_RETENTION_DAYS`, `BUSINESS_FACTORY_DB_BACKUP_DIR`, `BUSINESS_FACTORY_LOG_DIR`, `BUSINESS_FACTORY_ALLOWED_HOSTNAMES`, `BUSINESS_FACTORY_ALLOWED_ATTACHMENT_TYPES`, `BUSINESS_FACTORY_ATTACHMENT_MAX_BYTES`, `BUSINESS_FACTORY_OPEN_ON_LISTEN`, `BUSINESS_FACTORY_UI_DEV_MIDDLEWARE`, `BUSINESS_FACTORY_MIGRATION_PROMPT`, `BUSINESS_FACTORY_MIGRATION_AUTO_APPLY`, `BUSINESS_FACTORY_EMBEDDED_POSTGRES_VERBOSE`, `BUSINESS_FACTORY_ENABLE_COMPANY_DELETION`, `BUSINESS_FACTORY_AUTH_BASE_URL_MODE`, `BUSINESS_FACTORY_AUTH_PUBLIC_BASE_URL`, `BUSINESS_FACTORY_AUTH_DISABLE_SIGN_UP`, `BUSINESS_FACTORY_AGENT_ZERO_PROJECTS_ROOT`, `BUSINESS_FACTORY_AGENT_ZERO_API_URL`, `BUSINESS_FACTORY_AGENT_ZERO_SYNC_COMPANY_ID`, `BUSINESS_FACTORY_SHARED_PROJECT_PATH_ALIASES`, `BUSINESS_FACTORY_WORKSPACE_CWD`, `BUSINESS_FACTORY_IN_WORKTREE`, `BUSINESS_FACTORY_WORKTREE_NAME`, `BUSINESS_FACTORY_WORKTREE_COLOR`, `BUSINESS_FACTORY_INTERNAL_API_URL`, `BUSINESS_FACTORY_WORKSPACE_CWD`

### Complete variable list (agent-injected — both names emitted)
`BUSINESS_FACTORY_AGENT_ID`, `BUSINESS_FACTORY_COMPANY_ID`, `BUSINESS_FACTORY_API_URL`, `BUSINESS_FACTORY_API_KEY`, `BUSINESS_FACTORY_PROJECT_ID`, `BUSINESS_FACTORY_RUN_ID`, `BUSINESS_FACTORY_TASK_ID`, `BUSINESS_FACTORY_ISSUE_ID`, `BUSINESS_FACTORY_ISSUE_IDENTIFIER`, `BUSINESS_FACTORY_ISSUE_TITLE`, `BUSINESS_FACTORY_WAKE_REASON`, `BUSINESS_FACTORY_WAKE_COMMENT_ID`, `BUSINESS_FACTORY_WORKSPACE_PATH`, `BUSINESS_FACTORY_WORKSPACE_WORKTREE_PATH`, `BUSINESS_FACTORY_WORKSPACE_BRANCH`, `BUSINESS_FACTORY_WORKSPACE_BASE_CWD`, `BUSINESS_FACTORY_WORKSPACE_REPO_ROOT`, `BUSINESS_FACTORY_WORKSPACE_SOURCE`, `BUSINESS_FACTORY_WORKSPACE_REPO_REF`, `BUSINESS_FACTORY_WORKSPACE_REPO_URL`, `BUSINESS_FACTORY_WORKSPACE_CREATED`, `BUSINESS_FACTORY_PROJECT_WORKSPACE_ID`, `BUSINESS_FACTORY_AGENT_NAME`

### JWT issuer/audience backward compat (critical)
The defaults for `BUSINESS_FACTORY_AGENT_JWT_ISSUER` and `BUSINESS_FACTORY_AGENT_JWT_AUDIENCE` change from `"paperclip"` / `"paperclip-api"` to `"business-factory"` / `"business-factory-api"`. However, JWTs have a TTL of up to 48 hours. To avoid rejecting live agent tokens on server restart, the JWT **verify** path must accept both the old (`"paperclip"` / `"paperclip-api"`) and new values during a transition period. Implementation: pass both values as an array to the `audience`/`issuer` verify options, or explicitly check both.

### Other changes in this layer
- **HTTP header:** `x-paperclip-run-id` → `x-business-factory-run-id`; old header also sent for compat
- **`PaperclipApiClient` class:** Renamed to `BusinessFactoryApiClient`; old name kept as type alias
- **`buildPaperclipEnv()` function:** Renamed to `buildBusinessFactoryEnv()`; old name re-exported as alias
- **HTML comment markers** in `ui-branding.ts`: `<!-- PAPERCLIP_FAVICON_START -->` etc. → `<!-- BUSINESS_FACTORY_FAVICON_START -->`
- **`ui/index.html` HTML comment markers:** Updated to match `ui-branding.ts` new marker names
- **S3 bucket default:** `"paperclip"` → `"business-factory"`

### Key files
- `packages/adapter-utils/src/server-utils.ts` — `buildPaperclipEnv()`, all injected vars, `PAPERCLIP_SKILL_ROOT_RELATIVE_CANDIDATES`
- `server/src/config.ts` — ~20 server-read vars
- `server/src/home-paths.ts` — `BUSINESS_FACTORY_HOME`, `BUSINESS_FACTORY_INSTANCE_ID`
- `server/src/index.ts` — startup, listen host/port assignment
- `server/src/services/workspace-runtime.ts` — workspace injection vars
- `server/src/services/agent-zero-project-sync.ts` — agent-zero bridge vars
- `server/src/agent-auth-jwt.ts` — JWT config + backward-compat verify
- `server/src/ui-branding.ts` — HTML comment markers, worktree vars
- `server/src/middleware/logger.ts` — log dir
- `server/src/paths.ts` — config path (`BUSINESS_FACTORY_CONFIG ?? PAPERCLIP_CONFIG`)
- `server/src/secrets/local-encrypted-provider.ts` — secrets master key
- `server/src/auth/better-auth.ts` — public URL
- `server/src/startup-banner.ts` — JWT secret check
- `cli/src/client/http.ts` — HTTP header, `PaperclipApiClient` class
- `cli/src/config/store.ts`, `cli/src/config/data-dir.ts`, `cli/src/commands/worktree.ts`, `cli/src/commands/worktree-lib.ts`, `cli/src/client/context.ts` — `BUSINESS_FACTORY_CONFIG ?? PAPERCLIP_CONFIG`, `BUSINESS_FACTORY_CONTEXT ?? PAPERCLIP_CONTEXT`
- `scripts/provision-worktree.sh` — `PAPERCLIP_WORKSPACE_*` → `BUSINESS_FACTORY_WORKSPACE_*` (read with fallback)
- `scripts/docker-onboard-smoke.sh` — `PAPERCLIP_HOME` → `BUSINESS_FACTORY_HOME` (with fallback)

---

## Layer 3 — Config, Docker, Directories & Protocol Markers

| What | Old | New |
|------|-----|-----|
| Config file name | `paperclip.config.json` | `business-factory.config.json` |
| Config search path | `.paperclip/config.json` (walked up dir tree) | `.business-factory/config.json` |
| Default data directory | `~/.paperclip/` | `~/.business-factory/` |
| Shared schema default paths | `~/.paperclip/instances/...` (in Zod defaults) | `~/.business-factory/instances/...` |
| Docker service name | `paperclip` | `business-factory` |
| Docker volume | `paperclip-data` | `business-factory-data` |
| Postgres user/password/db | `paperclip:paperclip@.../paperclip` | `business-factory:business-factory@.../business-factory` |
| Vite virtual module | `virtual:paperclip-plugins` | `virtual:business-factory-plugins` |
| Vite plugin name | `vite-plugin-paperclip` | `vite-plugin-business-factory` |
| Sentinel value | `/__paperclip_repo_only__` | `/__business_factory_repo_only__` |
| Bridge instructions file | `paperclip-bridge.md` | `business-factory-bridge.md` |
| Worktree name prefix | `paperclip-` | `business-factory-` |
| Service worker cache key | `"paperclip-v2"` | `"business-factory-v1"` (intentional cache bust) |
| localStorage theme key | `"paperclip.theme"` | `"business-factory.theme"` (users lose persisted theme — acceptable) |
| Result JSON marker | `PAPERCLIP_RESULT_JSON` | `BUSINESS_FACTORY_RESULT_JSON` (see note below) |

**Backward compat:**
- Config path search falls back to `.paperclip/config.json` if `.business-factory/config.json` is not found
- `~/.paperclip/` is checked as a fallback data directory if `~/.business-factory/` does not exist
- Existing configs that already have literal `~/.paperclip/...` paths in them are **not** auto-migrated; those paths remain valid since the directory fallback covers them
- Worktrees created with the `paperclip-` prefix are **not** auto-discovered under the new prefix — operators must rename or re-register them

**`PAPERCLIP_RESULT_JSON` / `BUSINESS_FACTORY_RESULT_JSON` protocol marker (critical coordination):**
This marker string is embedded into agent prompts by `packages/adapters/agent-zero/src/server/execute.ts` and parsed by the Python extension in `integrations/`. Both sides must change together in the same commit. The TypeScript side and the Python `integrations/agent-zero/` side are updated in sync in this layer. The old marker string is retained as a secondary match in the Python parser during transition.

### Key files
- `server/src/paths.ts` — config search path + fallback
- `packages/shared/src/config-schema.ts` — Zod default paths (`~/.business-factory/instances/...`)
- `packages/db/src/runtime-config.ts` — default home directory + fallback
- `packages/db/src/backup.ts` — backup path defaults
- `docker-compose.yml` — service, volume, Postgres credentials
- `docker-compose.quickstart.yml` — service name, env var names
- `Dockerfile` — build commands, paths
- `ui/vite-plugin-paperclip.ts` → `ui/vite-plugin-business-factory.ts` — filename rename, virtual module ID, plugin name, config file search
- `server/src/services/projects.ts` — sentinel constant
- `server/src/services/agent-zero-project-sync.ts` — bridge file constant
- `cli/src/commands/worktree.ts` — `WORKTREE_NAME_PREFIX`, `~/.paperclip` fallback in help text
- `paperclip.config.json` → `business-factory.config.json`
- `ui/public/sw.js` — service worker cache key
- `ui/index.html` — localStorage key reference, HTML comment markers
- `ui/src/context/ThemeContext.tsx` — `THEME_STORAGE_KEY`
- `packages/adapters/agent-zero/src/server/execute.ts` — `PAPERCLIP_RESULT_JSON` marker
- `packages/adapters/agent-zero/src/server/utils.ts` — marker constant
- `integrations/agent-zero/usr-extensions/Business Factory/business_factory/request_flags.py` — context markers, `is_paperclip_assigned_request` function renamed, `ASSIGNED_TASK_MARKERS` string literal

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
- `.claude/skills/paperclip` symlink — remove and recreate pointing to `skills/business-factory`
- `packages/adapter-utils/src/server-utils.ts` — constant and function rename
- `server/src/__tests__/paperclip-skill-utils.test.ts` — rename file, update imports and test names
- `server/src/__tests__/paperclip-env.test.ts` — rename file, update imports and test names
- `.claude/skills/design-guide/SKILL.md` — audit for any Paperclip references

---

## Layer 5 — Docs & UI Text

All remaining user-visible "Paperclip" display text is updated to "Business Factory".

### Files and changes
- `README.md` — all "Paperclip" display text → "Business Factory"
- `AGENTS.md` — "Paperclip is a control plane..." → "Business Factory is a control plane..."
- `docs/start/what-is-paperclip.md` → renamed `what-is-business-factory.md`; all content updated
- All other `docs/` files — display text "Paperclip" → "Business Factory"
- `doc/` internal plans — "Paperclip" references → "Business Factory"
- `cli/src/commands/onboard.ts` — banner text `paperclipai onboard` → `business-factory onboard`
- `cli/src/commands/run.ts` — banner text `paperclipai run` → `business-factory run`
- `cli/src/index.ts` — CLI help text, `.name()` call
- `server/src/routes/access.ts` — instructional strings updated to new var/header names
- `server/src/services/agent-zero-project-sync.ts` — bridge instruction prose updated
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
- Existing configs with literal `~/.paperclip/...` paths (covered by directory fallback)

---

## Intentionally Remaining "paperclip" Occurrences After Completion

The following are expected to still contain "paperclip" after all layers are complete:

1. `releases/` — historical changelogs
2. Backward-compat alias code — `PAPERCLIP_*` fallback reads and alias exports (by design)
3. Any comment or string documenting the backward-compat aliases themselves
4. `packages/adapters/agent-zero/src/server/utils.ts` — old marker string retained as secondary match during transition (documented)

---

## Success Criteria

1. `pnpm install` completes cleanly after all package renames
2. `pnpm build` succeeds across all packages
3. All existing tests pass (renamed test files included)
4. Server starts and serves the UI
5. An agent heartbeat cycle completes successfully with `BUSINESS_FACTORY_*` vars
6. An agent heartbeat cycle also completes with legacy `PAPERCLIP_*` vars only (backward compat verified)
7. A JWT signed under old issuer/audience (`"paperclip"` / `"paperclip-api"`) is still accepted by the server after rename
8. No "Paperclip" references remain in: package names, skill file frontmatter/content, user-facing docs, CLI banners, Docker config, or UI display text — **except** in the intentionally remaining occurrences listed above
9. `releases/` files are the only non-backward-compat source of legacy "paperclip" text
