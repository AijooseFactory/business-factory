# Business Factory Rebranding Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the entire codebase from Paperclip to Business Factory across 5 sequential layers, preserving full backward compatibility for existing PAPERCLIP_* env vars, configs, and agent JWTs.

**Architecture:** Five ordered layers — each committed separately and verifiable before the next begins. Layers are: (1) package names & imports, (2) environment variables & backward-compat shims, (3) config/docker/protocol markers, (4) runtime skills, (5) docs & UI text. Each layer builds on a stable foundation.

**Tech Stack:** TypeScript, pnpm workspaces, Node.js ≥20, Vitest, Python (integrations/), Docker, Zod, pnpm 9.x

**Spec:** `docs/superpowers/specs/2026-03-13-business-factory-rebranding-design.md`

---

## File Map

### Layer 1 — Package Names & npm Scope
| File | Change |
|------|--------|
| `package.json` | `name`, `scripts.dev:server`, `scripts.dev:ui`, `scripts.db:*`, `scripts.paperclipai` → `scripts.business-factory` |
| `cli/package.json` | `name`, `bin`, `keywords`, `repository.url`, `homepage` |
| `server/package.json` | `name` + all `@paperclipai/*` deps |
| `ui/package.json` | `name` + all `@paperclipai/*` deps |
| `packages/db/package.json` | `name` + deps |
| `packages/shared/package.json` | `name` + deps |
| `packages/adapter-utils/package.json` | `name` + deps |
| `packages/adapters/*/package.json` (8 files) | `name` + deps |
| `packages/adapters/agent-zero/package.json` | `name` from `@aijoosefactory/paperclip-plugin-agent-zero` → `@business-factory/adapter-agent-zero` |
| `.changeset/config.json` | `fixed` group, `ignore` list |
| `scripts/generate-npm-package-json.mjs` | Hardcoded `@paperclipai/server` reference |
| All `*.ts`, `*.tsx`, `*.mts` source files (~500) | `import ... from "@paperclipai/..."` → `@business-factory/...` |
| `packages/shared/src/config-schema.ts` | Primary type names renamed: `paperclipConfigSchema` → `businessFactoryConfigSchema`, `PaperclipConfig` → `BusinessFactoryConfig`; old names kept as deprecated aliases |
| `packages/shared/src/index.ts` | Export new primary names + deprecated aliases |
| `packages/adapter-utils/src/server-utils.ts` | `PaperclipSkillEntry` → `BusinessFactorySkillEntry` (old name kept as alias) |

### Layer 2 — Environment Variables & Backward Compat
| File | Change |
|------|--------|
| `packages/adapter-utils/src/server-utils.ts` | `buildPaperclipEnv()` → `buildBusinessFactoryEnv()`, inject both `BUSINESS_FACTORY_*` and `PAPERCLIP_*` |
| `server/src/adapters/utils.ts` | Add `buildBusinessFactoryEnv` to re-exports; keep `buildPaperclipEnv` alias |
| `server/src/agent-auth-jwt.ts` | Env var reads + backward-compat dual-issuer/audience verify |
| `server/src/attachment-types.ts` | Env var reads with `?? PAPERCLIP_*` fallbacks |
| `server/src/auth/better-auth.ts` | Env var reads with fallbacks |
| `server/src/config.ts` | All ~20 env var reads with fallbacks |
| `server/src/home-paths.ts` | `PAPERCLIP_HOME`, `PAPERCLIP_INSTANCE_ID` with fallbacks |
| `server/src/index.ts` | Env var reads + assignments (assignments also set `PAPERCLIP_*` mirror) |
| `server/src/middleware/logger.ts` | `PAPERCLIP_LOG_DIR` with fallback |
| `server/src/paths.ts` | `PAPERCLIP_CONFIG` read with fallback |
| `server/src/routes/agents.ts` | `PAPERCLIP_SECRETS_STRICT_MODE` with fallback |
| `server/src/routes/approvals.ts` | `PAPERCLIP_SECRETS_STRICT_MODE` with fallback |
| `server/src/routes/secrets.ts` | `PAPERCLIP_SECRETS_PROVIDER` with fallback |
| `server/src/secrets/local-encrypted-provider.ts` | `PAPERCLIP_SECRETS_MASTER_KEY*` with fallbacks |
| `server/src/services/agent-zero-project-sync.ts` | All `PAPERCLIP_AGENT_ZERO_*` and injected vars |
| `server/src/services/company-portability.ts` | `PAPERCLIP_WORKSPACE_CWD` with fallback |
| `server/src/services/shared-project-paths.ts` | Two env var reads with fallbacks |
| `server/src/services/workspace-runtime.ts` | All injected vars (inject both new and old names) |
| `server/src/startup-banner.ts` | `PAPERCLIP_AGENT_JWT_SECRET` with fallback |
| `server/src/ui-branding.ts` | Env var reads + HTML comment marker constants |
| `ui/index.html` | HTML comment markers (must sync with ui-branding.ts) |
| `cli/src/client/http.ts` | Header name, `PaperclipApiClient` → `BusinessFactoryApiClient` |
| `cli/src/client/context.ts` | `PAPERCLIP_CONTEXT` with fallback |
| `cli/src/config/store.ts` | `PAPERCLIP_CONFIG` with fallback |
| `cli/src/config/data-dir.ts` | `PAPERCLIP_CONFIG`, `PAPERCLIP_HOME` with fallbacks |
| `cli/src/commands/worktree.ts` | `PAPERCLIP_CONFIG`, `PAPERCLIP_CONTEXT` with fallbacks |
| `cli/src/commands/worktree-lib.ts` | `PAPERCLIP_CONTEXT` with fallback |
| `scripts/provision-worktree.sh` | `PAPERCLIP_WORKSPACE_*` reads with `${NEW:-$OLD}` fallback syntax |
| `scripts/docker-onboard-smoke.sh` | `PAPERCLIP_HOME` with fallback |
| `server/src/__tests__/business-factory-env.test.ts` | Renamed from `paperclip-env.test.ts`; new JWT + env injection tests added |

### Layer 3 — Config, Docker & Protocol Markers
| File | Change |
|------|--------|
| `paperclip.config.json` | Rename to `business-factory.config.json` |
| `server/src/paths.ts` | Config search: `.business-factory/` first, `.paperclip/` fallback |
| `packages/shared/src/config-schema.ts` | Zod default paths `~/.paperclip/` → `~/.business-factory/` |
| `packages/db/src/runtime-config.ts` | Default home dir + fallback to `~/.paperclip` if `~/.business-factory` absent |
| `packages/db/src/backup.ts` | Backup path defaults |
| `docker-compose.yml` | Service name, volume, Postgres credentials |
| `docker-compose.quickstart.yml` | Service name, env var names |
| `Dockerfile` | Build filter args, paths |
| `ui/vite-plugin-paperclip.ts` | Rename → `vite-plugin-business-factory.ts`; update virtual module ID, plugin name, config file search |
| `ui/vite.config.ts` | Import updated plugin file |
| `server/src/services/projects.ts` | Sentinel constant |
| `server/src/services/agent-zero-project-sync.ts` | Bridge file constant + prose |
| `cli/src/commands/worktree.ts` | `WORKTREE_NAME_PREFIX` |
| `ui/public/sw.js` | Cache key |
| `ui/src/context/ThemeContext.tsx` | `THEME_STORAGE_KEY` |
| `packages/adapters/agent-zero/src/server/execute.ts` | `PAPERCLIP_RESULT_JSON` marker, bridge text |
| `packages/adapters/agent-zero/src/server/utils.ts` | Marker constant |
| `integrations/agent-zero/usr-extensions/Business Factory/business_factory/request_flags.py` | Context markers, function name, assigned task markers |

### Layer 4 — Runtime Skills
| File | Change |
|------|--------|
| `skills/paperclip/` (whole dir) | Rename to `skills/business-factory/` |
| `skills/paperclip-create-agent/` (whole dir) | Rename to `skills/business-factory-create-agent/` |
| `.claude/skills/paperclip` (symlink) | Remove + recreate as `.claude/skills/business-factory` |
| All `skills/business-factory*/**/*.md` | Content update: "Paperclip" → "Business Factory", env vars, headers, CLI |
| `packages/adapter-utils/src/server-utils.ts` | `PAPERCLIP_SKILL_ROOT_RELATIVE_CANDIDATES` → `BUSINESS_FACTORY_SKILL_ROOT_RELATIVE_CANDIDATES`; `listPaperclipSkillEntries` → `listBusinessFactorySkillEntries`; `PaperclipSkillEntry` → `BusinessFactorySkillEntry` (old names as aliases) |
| `server/src/__tests__/business-factory-skill-utils.test.ts` | Renamed from `paperclip-skill-utils.test.ts`; updated imports + assertions |

### Layer 5 — Docs & UI Text
| File | Change |
|------|--------|
| `README.md` | All "Paperclip" display text |
| `AGENTS.md` | Opening description |
| `docs/start/what-is-paperclip.md` | Rename → `what-is-business-factory.md` + full content |
| `docs/docs.json` | Title, nav links |
| All other `docs/**/*.md` | "Paperclip" display text |
| `doc/**/*.md` | "Paperclip" display text |
| `cli/src/commands/onboard.ts` | Banner string |
| `cli/src/commands/run.ts` | Banner string |
| `cli/src/index.ts` | `.name()`, help text |
| `server/src/routes/access.ts` | Instructional strings |
| `server/src/services/agent-zero-project-sync.ts` | Bridge instruction prose |

---

## Chunk 1: Layer 1 — Package Names & npm Scope

### Task 1.1: Update all package.json files

**Files:** All `package.json` files, `.changeset/config.json`, `scripts/generate-npm-package-json.mjs`

- [ ] **Step 1: Bulk rename @paperclipai scope in all package.json files**

```bash
find . -name "package.json" \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  | xargs sed -i '' 's/@paperclipai\//@business-factory\//g'
```

This handles `@paperclipai/server` → `@business-factory/server` etc. in all package files. The root-level CLI binary entry `"paperclipai": "..."` is NOT affected (no `@` prefix match).

- [ ] **Step 2: Update root package.json: name, scripts, binary key**

Open `package.json` and make these targeted edits:
```json
{
  "name": "business-factory",
  "scripts": {
    "dev:server": "pnpm --filter @business-factory/server dev",
    "dev:ui": "pnpm --filter @business-factory/ui dev",
    "db:generate": "pnpm --filter @business-factory/db generate",
    "db:migrate": "pnpm --filter @business-factory/db migrate",
    "business-factory": "node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts"
  }
}
```
Remove the old `"paperclipai"` script key and add `"business-factory"` in its place.

- [ ] **Step 3: Update cli/package.json: name, bin, keywords, URLs**

```json
{
  "name": "business-factory",
  "bin": {
    "business-factory": "./dist/index.js"
  },
  "keywords": ["business-factory"],
  "repository": {
    "type": "git",
    "url": "https://github.com/AijooseFactory/business-factory.git"
  },
  "homepage": "https://github.com/AijooseFactory/business-factory"
}
```

- [ ] **Step 4: Rename agent-zero adapter package name**

In `packages/adapters/agent-zero/package.json`:
```json
"name": "@business-factory/adapter-agent-zero"
```
The bulk sed in Step 1 already renamed `@paperclipai/adapter-utils` and `@paperclipai/shared` in its deps. The old `@aijoosefactory/paperclip-plugin-agent-zero` name is not matched by the Step 1 sed; this step handles it explicitly.

- [ ] **Step 5: Overwrite .changeset/config.json (do not rely on Step 1 partial mutation)**

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.3/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [["@business-factory/*", "business-factory"]],
  "linked": [],
  "access": "public",
  "baseBranch": "master",
  "updateInternalDependencies": "patch",
  "ignore": ["@business-factory/ui"]
}
```

- [ ] **Step 6: Update scripts/generate-npm-package-json.mjs**

```bash
grep -n "paperclipai\|paperclip" scripts/generate-npm-package-json.mjs
# Find all references, then replace:
sed -i '' 's/@paperclipai\/server/@business-factory\/server/g' \
  scripts/generate-npm-package-json.mjs
# Also check for any other @paperclipai references:
grep "@paperclipai" scripts/generate-npm-package-json.mjs
# Fix any remaining occurrences manually
```

- [ ] **Step 7: Verify no @paperclipai scope remains in package files**

```bash
grep -r '"@paperclipai' --include="package.json" | grep -v node_modules
grep "@aijoosefactory/paperclip" --include="package.json" -r | grep -v node_modules
# Both should return no results
```

---

### Task 1.2: Bulk rename @paperclipai imports in all TypeScript source files

- [ ] **Step 1: Rename @paperclipai scope in TypeScript/TSX/MTS source files**

```bash
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.mts" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  | xargs sed -i '' 's|@paperclipai/|@business-factory/|g'
```

- [ ] **Step 2: Rename @aijoosefactory/paperclip-plugin-agent-zero imports**

```bash
find . \( -name "*.ts" -o -name "*.tsx" \) \
  -not -path "*/node_modules/*" -not -path "*/dist/*" \
  | xargs grep -l "aijoosefactory/paperclip-plugin-agent-zero" \
  | xargs sed -i '' \
    's|@aijoosefactory/paperclip-plugin-agent-zero|@business-factory/adapter-agent-zero|g'
```

- [ ] **Step 3: Verify no @paperclipai imports remain**

```bash
grep -r "@paperclipai" \
  --include="*.ts" --include="*.tsx" --include="*.mts" \
  -l | grep -v node_modules | grep -v dist
# Must return no results
```

---

### Task 1.3: Rename exported types in shared package — primary names, with deprecated aliases

**Files:**
- Modify: `packages/shared/src/config-schema.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/adapter-utils/src/server-utils.ts`

> **Critical:** The new names become primary; the old names become deprecated aliases. This is the reverse of "add an alias" — all consuming code will eventually use the new names. The aliases ensure nothing breaks immediately.

- [ ] **Step 1: Rename primary exports in config-schema.ts and add deprecated aliases**

At the bottom of `packages/shared/src/config-schema.ts`, **rename** `paperclipConfigSchema` to `businessFactoryConfigSchema` and `PaperclipConfig` to `BusinessFactoryConfig` throughout the file, then add deprecated aliases:

```bash
# Rename the primary declarations
sed -i '' \
  -e 's/export const paperclipConfigSchema/export const businessFactoryConfigSchema/g' \
  -e 's/export type PaperclipConfig/export type BusinessFactoryConfig/g' \
  packages/shared/src/config-schema.ts
```

Then append to the end of the file:
```typescript
/** @deprecated Use businessFactoryConfigSchema */
export const paperclipConfigSchema = businessFactoryConfigSchema;
/** @deprecated Use BusinessFactoryConfig */
export type PaperclipConfig = BusinessFactoryConfig;
```

- [ ] **Step 2: Update packages/shared/src/index.ts to export new primary names**

```bash
sed -i '' \
  -e 's/paperclipConfigSchema/businessFactoryConfigSchema/g' \
  -e 's/PaperclipConfig/BusinessFactoryConfig/g' \
  packages/shared/src/index.ts
```

Then add re-exports for the deprecated aliases (so consumers importing by old name still work):
```typescript
export { paperclipConfigSchema, type PaperclipConfig } from "./config-schema.js";
```

- [ ] **Step 3: Add BusinessFactorySkillEntry as primary in server-utils.ts**

In `packages/adapter-utils/src/server-utils.ts`, rename `PaperclipSkillEntry` to `BusinessFactorySkillEntry` in the declaration, then add alias:
```typescript
export interface BusinessFactorySkillEntry {
  name: string;
  source: string;
}
/** @deprecated Use BusinessFactorySkillEntry */
export type PaperclipSkillEntry = BusinessFactorySkillEntry;
```

---

### Task 1.4: Reinstall and verify build

- [ ] **Step 1: Clean install — remove all nested node_modules**

```bash
find . -name "node_modules" \
  -not -path "*/.git/*" \
  -prune -exec rm -rf {} + \
  2>/dev/null; echo "cleanup done"
pnpm install
```

- [ ] **Step 2: Run typecheck across all packages**

```bash
pnpm typecheck
```

Expected: no type errors. If errors appear, they will be in files that imported `PaperclipConfig` by old name — update those callsites to `BusinessFactoryConfig`.

- [ ] **Step 3: Run test suite**

```bash
pnpm test:run
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit Layer 1**

```bash
git add -A
git commit -m "feat: rebrand package names from @paperclipai to @business-factory (Layer 1)"
```

---

## Chunk 2: Layer 2 — Environment Variables & Backward Compatibility

> **Approach for env var renames:** We use two targeted passes rather than a complex regex:
> 1. A simple sed to rename `process.env.PAPERCLIP_X` reads → `process.env.BUSINESS_FACTORY_X`
> 2. A Node.js script to add `?? process.env.PAPERCLIP_X` fallbacks to read expressions only (not assignments)
>
> Assignments (`process.env.PAPERCLIP_X = value`) are handled separately — they get BOTH old and new assigned.

### Task 2.1: Rename existing test file before creating new tests

**Files:**
- Rename: `server/src/__tests__/paperclip-env.test.ts` → `server/src/__tests__/business-factory-env.test.ts`

- [ ] **Step 1: Rename the test file and update its existing imports**

```bash
mv server/src/__tests__/paperclip-env.test.ts \
   server/src/__tests__/business-factory-env.test.ts
```

Update any import of `buildPaperclipEnv` within the renamed file to use the server-local shim path (matching the file's existing pattern):
```typescript
// In business-factory-env.test.ts, existing imports look like:
import { buildPaperclipEnv } from "../adapters/utils.js";
// Leave as-is for now — Task 2.3 will add the new export there
```

- [ ] **Step 2: Verify the renamed test still runs**

```bash
pnpm test:run server/src/__tests__/business-factory-env.test.ts
```

Expected: same results as before rename (may fail if existing tests reference old env var names — that's fine, we'll fix those below).

---

### Task 2.2: Implement buildBusinessFactoryEnv with backward-compat injection

**Files:**
- Modify: `packages/adapter-utils/src/server-utils.ts` (function at ~line 133)
- Modify: `server/src/adapters/utils.ts`

- [ ] **Step 1: Add tests for backward-compat injection to business-factory-env.test.ts**

Append to `server/src/__tests__/business-factory-env.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildBusinessFactoryEnv } from "../adapters/utils.js";

describe("buildBusinessFactoryEnv — backward-compat injection", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.BUSINESS_FACTORY_LISTEN_HOST;
    delete process.env.BUSINESS_FACTORY_LISTEN_PORT;
    delete process.env.BUSINESS_FACTORY_API_URL;
    delete process.env.PAPERCLIP_LISTEN_HOST;
    delete process.env.PAPERCLIP_LISTEN_PORT;
    delete process.env.PAPERCLIP_API_URL;
  });

  afterEach(() => {
    Object.assign(process.env, savedEnv);
  });

  it("injects BUSINESS_FACTORY_AGENT_ID and PAPERCLIP_AGENT_ID", () => {
    const env = buildBusinessFactoryEnv({ id: "agent-1", companyId: "co-1" });
    expect(env.BUSINESS_FACTORY_AGENT_ID).toBe("agent-1");
    expect(env.PAPERCLIP_AGENT_ID).toBe("agent-1");
  });

  it("injects BUSINESS_FACTORY_COMPANY_ID and PAPERCLIP_COMPANY_ID", () => {
    const env = buildBusinessFactoryEnv({ id: "agent-1", companyId: "co-1" });
    expect(env.BUSINESS_FACTORY_COMPANY_ID).toBe("co-1");
    expect(env.PAPERCLIP_COMPANY_ID).toBe("co-1");
  });

  it("injects BUSINESS_FACTORY_API_URL and PAPERCLIP_API_URL", () => {
    process.env.BUSINESS_FACTORY_API_URL = "http://test:9999";
    const env = buildBusinessFactoryEnv({ id: "a", companyId: "c" });
    expect(env.BUSINESS_FACTORY_API_URL).toBe("http://test:9999");
    expect(env.PAPERCLIP_API_URL).toBe("http://test:9999");
  });

  it("reads PAPERCLIP_API_URL as fallback when BUSINESS_FACTORY_API_URL not set", () => {
    process.env.PAPERCLIP_API_URL = "http://legacy:8888";
    const env = buildBusinessFactoryEnv({ id: "a", companyId: "c" });
    expect(env.BUSINESS_FACTORY_API_URL).toBe("http://legacy:8888");
    expect(env.PAPERCLIP_API_URL).toBe("http://legacy:8888");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test:run server/src/__tests__/business-factory-env.test.ts \
  --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL — `buildBusinessFactoryEnv` not exported from `utils.js`.

- [ ] **Step 3: Rename and update the function in server-utils.ts**

Replace the `buildPaperclipEnv` function (lines 133–151) in `packages/adapter-utils/src/server-utils.ts`:
```typescript
export function buildBusinessFactoryEnv(agent: { id: string; companyId: string }): Record<string, string> {
  const resolveHostForUrl = (rawHost: string): string => {
    const host = rawHost.trim();
    if (!host || host === "0.0.0.0" || host === "::") return "localhost";
    if (host.includes(":") && !host.startsWith("[") && !host.endsWith("]")) return `[${host}]`;
    return host;
  };
  const runtimeHost = resolveHostForUrl(
    process.env.BUSINESS_FACTORY_LISTEN_HOST ?? process.env.PAPERCLIP_LISTEN_HOST ?? process.env.HOST ?? "localhost",
  );
  const runtimePort =
    process.env.BUSINESS_FACTORY_LISTEN_PORT ?? process.env.PAPERCLIP_LISTEN_PORT ?? process.env.PORT ?? "3100";
  const apiUrl =
    process.env.BUSINESS_FACTORY_API_URL ?? process.env.PAPERCLIP_API_URL ?? `http://${runtimeHost}:${runtimePort}`;

  return {
    BUSINESS_FACTORY_AGENT_ID: agent.id,
    BUSINESS_FACTORY_COMPANY_ID: agent.companyId,
    BUSINESS_FACTORY_API_URL: apiUrl,
    // Backward-compat aliases — existing agent scripts reading PAPERCLIP_* still work
    PAPERCLIP_AGENT_ID: agent.id,
    PAPERCLIP_COMPANY_ID: agent.companyId,
    PAPERCLIP_API_URL: apiUrl,
  };
}

/** @deprecated Use buildBusinessFactoryEnv */
export const buildPaperclipEnv = buildBusinessFactoryEnv;
```

- [ ] **Step 4: Add buildBusinessFactoryEnv to server/src/adapters/utils.ts re-exports**

In `server/src/adapters/utils.ts`, add `buildBusinessFactoryEnv` to the existing export list (do NOT replace the whole block — add to it):
```typescript
export {
  // ... all existing exports ...
  buildPaperclipEnv,      // keep existing
  buildBusinessFactoryEnv, // add new
} from "@business-factory/adapter-utils/server-utils";
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test:run server/src/__tests__/business-factory-env.test.ts \
  --reporter=verbose 2>&1 | tail -20
```

Expected: PASS for all 4 new tests.

---

### Task 2.3: Add backward-compat JWT dual-issuer/audience verify

**Files:**
- Modify: `server/src/agent-auth-jwt.ts`

- [ ] **Step 1: Add JWT backward-compat tests to business-factory-env.test.ts**

Append to `server/src/__tests__/business-factory-env.test.ts`:
```typescript
import { createLocalAgentJwt, verifyLocalAgentJwt } from "../agent-auth-jwt.js";

describe("JWT backward compat — dual issuer/audience", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    // Use new env var name to configure JWT
    process.env.BUSINESS_FACTORY_AGENT_JWT_SECRET = "test-secret-32-chars-exactly!!!!!";
    delete process.env.PAPERCLIP_AGENT_JWT_SECRET;
    delete process.env.BUSINESS_FACTORY_AGENT_JWT_ISSUER;
    delete process.env.BUSINESS_FACTORY_AGENT_JWT_AUDIENCE;
    delete process.env.PAPERCLIP_AGENT_JWT_ISSUER;
    delete process.env.PAPERCLIP_AGENT_JWT_AUDIENCE;
  });

  afterEach(() => {
    process.env = { ...savedEnv };
    Object.assign(process.env, savedEnv);
  });

  it("reads BUSINESS_FACTORY_AGENT_JWT_SECRET to configure signing", () => {
    const token = createLocalAgentJwt("agent-1", "co-1", "claude", "run-1");
    expect(token).not.toBeNull();
  });

  it("accepts token signed with old paperclip issuer after server rebrand", () => {
    // Simulate: token was created with old default issuer "paperclip"
    process.env.BUSINESS_FACTORY_AGENT_JWT_ISSUER = "paperclip";
    process.env.BUSINESS_FACTORY_AGENT_JWT_AUDIENCE = "paperclip-api";
    const token = createLocalAgentJwt("agent-1", "co-1", "claude", "run-1");
    expect(token).not.toBeNull();

    // Server restarts with new defaults
    delete process.env.BUSINESS_FACTORY_AGENT_JWT_ISSUER;
    delete process.env.BUSINESS_FACTORY_AGENT_JWT_AUDIENCE;

    const result = verifyLocalAgentJwt(token!);
    expect(result).not.toBeNull();
    expect(result?.sub).toBe("agent-1");
  });

  it("accepts token signed with new business-factory issuer", () => {
    const token = createLocalAgentJwt("agent-1", "co-1", "claude", "run-1");
    const result = verifyLocalAgentJwt(token!);
    expect(result).not.toBeNull();
  });

  it("reads PAPERCLIP_AGENT_JWT_SECRET as fallback", () => {
    delete process.env.BUSINESS_FACTORY_AGENT_JWT_SECRET;
    process.env.PAPERCLIP_AGENT_JWT_SECRET = "test-secret-32-chars-exactly!!!!!";
    const token = createLocalAgentJwt("agent-1", "co-1", "claude", "run-1");
    expect(token).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test:run server/src/__tests__/business-factory-env.test.ts \
  --reporter=verbose 2>&1 | grep -E "FAIL|PASS|✓|✗"
```

Expected: JWT tests FAIL — `BUSINESS_FACTORY_AGENT_JWT_SECRET` not read.

- [ ] **Step 3: Update jwtConfig() to read new env vars with PAPERCLIP_* fallbacks**

Replace `jwtConfig()` in `server/src/agent-auth-jwt.ts` (lines 28–38):
```typescript
function jwtConfig() {
  const secret =
    process.env.BUSINESS_FACTORY_AGENT_JWT_SECRET ?? process.env.PAPERCLIP_AGENT_JWT_SECRET;
  if (!secret) return null;

  return {
    secret,
    ttlSeconds: parseNumber(
      process.env.BUSINESS_FACTORY_AGENT_JWT_TTL_SECONDS ?? process.env.PAPERCLIP_AGENT_JWT_TTL_SECONDS,
      60 * 60 * 48,
    ),
    issuer:
      process.env.BUSINESS_FACTORY_AGENT_JWT_ISSUER ??
      process.env.PAPERCLIP_AGENT_JWT_ISSUER ??
      "business-factory",
    audience:
      process.env.BUSINESS_FACTORY_AGENT_JWT_AUDIENCE ??
      process.env.PAPERCLIP_AGENT_JWT_AUDIENCE ??
      "business-factory-api",
  };
}
```

- [ ] **Step 4: Update verifyLocalAgentJwt to accept both old and new issuer/audience**

Replace lines 125–128 in `server/src/agent-auth-jwt.ts` (the issuer/audience checks):
```typescript
  const issuer = typeof claims.iss === "string" ? claims.iss : undefined;
  const audience = typeof claims.aud === "string" ? claims.aud : undefined;

  // Accept both legacy "paperclip"/"paperclip-api" and new "business-factory" values.
  // Tokens can live up to 48h, so we must accept old-issuer tokens after a server restart.
  const validIssuers = new Set(["paperclip", "business-factory", config.issuer]);
  const validAudiences = new Set(["paperclip-api", "business-factory-api", config.audience]);

  if (issuer && !validIssuers.has(issuer)) return null;
  if (audience && !validAudiences.has(audience)) return null;
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test:run server/src/__tests__/business-factory-env.test.ts \
  --reporter=verbose 2>&1 | tail -20
```

Expected: all JWT tests PASS.

---

### Task 2.4: Rename all PAPERCLIP_ env var reads across server and CLI

> **Strategy:** Two-pass approach using a helper Node.js script.
> - Pass 1: Rename `process.env.PAPERCLIP_X` → `process.env.BUSINESS_FACTORY_X` (simple, safe sed)
> - Pass 2: Run a Node.js script to add `?? process.env.PAPERCLIP_X` fallbacks to read-expressions only

- [ ] **Step 1: Write the fallback-adder script**

Create `scripts/add-env-fallbacks.mjs`:
```javascript
#!/usr/bin/env node
// Transforms: process.env.BUSINESS_FACTORY_X  (in read positions)
// into:       process.env.BUSINESS_FACTORY_X ?? process.env.PAPERCLIP_X
// Skips assignment lines: process.env.BUSINESS_FACTORY_X =

import { readFileSync, writeFileSync } from "node:fs";
import { argv } from "node:process";

const files = argv.slice(2);
let changed = 0;

for (const file of files) {
  const original = readFileSync(file, "utf8");
  const lines = original.split("\n");
  const updated = lines.map((line) => {
    // Skip assignment lines
    if (/process\.env\.BUSINESS_FACTORY_[A-Z_]+ =/.test(line)) return line;
    // Skip lines that already have the fallback
    if (/\?\? process\.env\.PAPERCLIP_/.test(line)) return line;
    // Add fallback to read expressions
    return line.replace(
      /process\.env\.(BUSINESS_FACTORY_([A-Z_]+))/g,
      (match, fullKey, suffix) => `process.env.${fullKey} ?? process.env.PAPERCLIP_${suffix}`,
    );
  });
  const result = updated.join("\n");
  if (result !== original) {
    writeFileSync(file, result, "utf8");
    changed++;
    console.log("Updated:", file);
  }
}
console.log(`Done. ${changed} files updated.`);
```

- [ ] **Step 2: Pass 1 — rename PAPERCLIP_ reads to BUSINESS_FACTORY_ in server/src and cli/src**

```bash
find server/src cli/src packages/adapter-utils/src \
  \( -name "*.ts" -o -name "*.tsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  | xargs sed -i '' 's/process\.env\.PAPERCLIP_/process.env.BUSINESS_FACTORY_/g'
```

Note: This also renames assignment lines (`process.env.PAPERCLIP_X = value`) to `process.env.BUSINESS_FACTORY_X = value`. That's intentional for the assignment side — we want the server to set the new name. Step 4 below handles mirroring.

- [ ] **Step 3: Pass 2 — add ?? fallbacks to read expressions**

```bash
find server/src cli/src \
  \( -name "*.ts" -o -name "*.tsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  | xargs node scripts/add-env-fallbacks.mjs
```

- [ ] **Step 4: Mirror assignments — add PAPERCLIP_* alias after each process.env.BUSINESS_FACTORY_X = assignment**

In `server/src/index.ts`, the server sets three env vars at startup so they're available globally:
```typescript
// Before:
process.env.BUSINESS_FACTORY_LISTEN_HOST = runtimeListenHost;
process.env.BUSINESS_FACTORY_LISTEN_PORT = String(listenPort);
process.env.BUSINESS_FACTORY_API_URL = `http://${runtimeApiHost}:${listenPort}`;

// After (add aliases immediately below each):
process.env.BUSINESS_FACTORY_LISTEN_HOST = runtimeListenHost;
process.env.PAPERCLIP_LISTEN_HOST = runtimeListenHost;
process.env.BUSINESS_FACTORY_LISTEN_PORT = String(listenPort);
process.env.PAPERCLIP_LISTEN_PORT = String(listenPort);
process.env.BUSINESS_FACTORY_API_URL = `http://${runtimeApiHost}:${listenPort}`;
process.env.PAPERCLIP_API_URL = `http://${runtimeApiHost}:${listenPort}`;
```

Also check `server/src/index.ts` for lines that set `BUSINESS_FACTORY_SECRETS_*` from config — add `PAPERCLIP_SECRETS_*` mirrors after each.

- [ ] **Step 5: Update workspace-runtime.ts to inject both var sets**

In `server/src/services/workspace-runtime.ts`, for every `env.BUSINESS_FACTORY_X = value` assignment, add a matching `env.PAPERCLIP_X = value` immediately after. Example pattern:
```typescript
// Generated by Pass 1 sed:
env.BUSINESS_FACTORY_WORKSPACE_CWD = input.worktreePath;
// Add after each:
env.PAPERCLIP_WORKSPACE_CWD = input.worktreePath;
```

Do this for all ~15 workspace/agent vars in that file.

- [ ] **Step 6: Add test for workspace-runtime dual injection**

Append to `server/src/__tests__/business-factory-env.test.ts`:
```typescript
// Import workspace-runtime's injection helper if exported,
// or test via the heartbeat service's env construction.
// At minimum verify the mirror pattern with a direct check:
it("workspace-runtime injects both BUSINESS_FACTORY_* and PAPERCLIP_* vars", async () => {
  // Dynamically import to get the actual export shape
  const { buildWorkspaceEnv } = await import("../services/workspace-runtime.js");
  const env = buildWorkspaceEnv({
    worktreePath: "/test/path",
    branchName: "main",
    // ... minimal required fields
  });
  expect(env.BUSINESS_FACTORY_WORKSPACE_CWD).toBe("/test/path");
  expect(env.PAPERCLIP_WORKSPACE_CWD).toBe("/test/path");
});
```

> **Note:** If `buildWorkspaceEnv` is not exported, add `export` to the function declaration in `workspace-runtime.ts` for testability, or test at a higher integration level.

- [ ] **Step 7: Update HTML comment markers in ui-branding.ts AND ui/index.html (must be in sync)**

In `server/src/ui-branding.ts`:
```typescript
const FAVICON_BLOCK_START = "<!-- BUSINESS_FACTORY_FAVICON_START -->";
const FAVICON_BLOCK_END = "<!-- BUSINESS_FACTORY_FAVICON_END -->";
const RUNTIME_BRANDING_BLOCK_START = "<!-- BUSINESS_FACTORY_RUNTIME_BRANDING_START -->";
const RUNTIME_BRANDING_BLOCK_END = "<!-- BUSINESS_FACTORY_RUNTIME_BRANDING_END -->";
```

In `ui/index.html` (must match, same commit):
```html
<!-- BUSINESS_FACTORY_FAVICON_START -->
<!-- BUSINESS_FACTORY_FAVICON_END -->
<!-- BUSINESS_FACTORY_RUNTIME_BRANDING_START -->
<!-- BUSINESS_FACTORY_RUNTIME_BRANDING_END -->
```

Both files MUST be updated together. If they're out of sync between commits, favicon injection will silently fail.

- [ ] **Step 8: Update bash scripts with fallback syntax**

In `scripts/provision-worktree.sh`, replace bare `${PAPERCLIP_*}` reads:
```bash
WORKSPACE_CWD="${BUSINESS_FACTORY_WORKSPACE_CWD:-${PAPERCLIP_WORKSPACE_CWD}}"
WORKSPACE_BASE_CWD="${BUSINESS_FACTORY_WORKSPACE_BASE_CWD:-${PAPERCLIP_WORKSPACE_BASE_CWD}}"
# Repeat for every PAPERCLIP_WORKSPACE_* var used in the file
```

In `scripts/docker-onboard-smoke.sh`:
```bash
HOME_DIR="${BUSINESS_FACTORY_HOME:-${PAPERCLIP_HOME:-$HOME/.business-factory}}"
```

- [ ] **Step 9: Rename PaperclipApiClient and update HTTP header in cli/src/client/http.ts**

```typescript
export class BusinessFactoryApiClient {
  // same body, no other changes needed
}
/** @deprecated Use BusinessFactoryApiClient */
export const PaperclipApiClient = BusinessFactoryApiClient;
```

For the header:
```typescript
if (this.runId) {
  headers["x-business-factory-run-id"] = this.runId;
  headers["x-paperclip-run-id"] = this.runId; // backward compat
}
```

- [ ] **Step 10: Run typecheck and full test suite**

```bash
pnpm typecheck
pnpm test:run
```

Expected: all pass. If typecheck fails on any `PAPERCLIP_*` reference that was a string literal rather than `process.env`, fix manually.

- [ ] **Step 11: Commit Layer 2**

```bash
git add -A
git commit -m "feat: rename PAPERCLIP_* env vars to BUSINESS_FACTORY_* with backward-compat fallbacks (Layer 2)"
```

---

## Chunk 3: Layer 3 — Config, Docker & Protocol Markers

### Task 3.1: Rename config file and update config path search

**Files:**
- Rename: `paperclip.config.json` → `business-factory.config.json`
- Modify: `server/src/paths.ts`

- [ ] **Step 1: Write tests for config path fallback**

Append to `server/src/__tests__/business-factory-env.test.ts`:
```typescript
import { resolvePaperclipConfigPath } from "../paths.js";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

describe("config path resolution", () => {
  it("finds .business-factory/config.json when present", () => {
    const tmp = path.join(tmpdir(), "bf-test-" + Date.now());
    mkdirSync(path.join(tmp, ".business-factory"), { recursive: true });
    writeFileSync(path.join(tmp, ".business-factory", "config.json"), "{}");
    const result = resolvePaperclipConfigPath(undefined, tmp);
    expect(result).toContain(".business-factory");
    rmSync(tmp, { recursive: true });
  });

  it("falls back to .paperclip/config.json when .business-factory not found", () => {
    const tmp = path.join(tmpdir(), "bf-test-" + Date.now());
    mkdirSync(path.join(tmp, ".paperclip"), { recursive: true });
    writeFileSync(path.join(tmp, ".paperclip", "config.json"), "{}");
    const result = resolvePaperclipConfigPath(undefined, tmp);
    expect(result).toContain(".paperclip");
    rmSync(tmp, { recursive: true });
  });
});
```

Note: This requires `resolvePaperclipConfigPath` to accept an optional `startDir` parameter. We add that in the next step.

- [ ] **Step 2: Run to confirm they fail**

```bash
pnpm test:run server/src/__tests__/business-factory-env.test.ts 2>&1 | tail -10
```

Expected: FAIL — function signature doesn't accept `startDir`.

- [ ] **Step 3: Update server/src/paths.ts**

Replace the full file content:
```typescript
import fs from "node:fs";
import path from "node:path";
import { resolveDefaultConfigPath } from "./home-paths.js";

const CONFIG_BASENAME = "config.json";
const ENV_FILENAME = ".env";

function findConfigFileFromAncestors(startDir: string): string | null {
  const absoluteStartDir = path.resolve(startDir);
  let currentDir = absoluteStartDir;

  while (true) {
    // Search .business-factory/ first, fall back to .paperclip/ for backward compat
    for (const dirname of [".business-factory", ".paperclip"]) {
      const candidate = path.resolve(currentDir, dirname, CONFIG_BASENAME);
      if (fs.existsSync(candidate)) return candidate;
    }
    const nextDir = path.resolve(currentDir, "..");
    if (nextDir === currentDir) break;
    currentDir = nextDir;
  }

  return null;
}

export function resolvePaperclipConfigPath(overridePath?: string, startDir?: string): string {
  if (overridePath) return path.resolve(overridePath);
  const envConfig = process.env.BUSINESS_FACTORY_CONFIG ?? process.env.PAPERCLIP_CONFIG;
  if (envConfig) return path.resolve(envConfig);
  return findConfigFileFromAncestors(startDir ?? process.cwd()) ?? resolveDefaultConfigPath();
}

export function resolvePaperclipEnvPath(overrideConfigPath?: string): string {
  return path.resolve(
    path.dirname(resolvePaperclipConfigPath(overrideConfigPath)),
    ENV_FILENAME,
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test:run server/src/__tests__/business-factory-env.test.ts 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 5: Rename the config file**

```bash
mv paperclip.config.json business-factory.config.json
```

---

### Task 3.2: Update Zod schema defaults and DB runtime config

**Files:**
- Modify: `packages/shared/src/config-schema.ts`
- Modify: `packages/db/src/runtime-config.ts`
- Modify: `packages/db/src/backup.ts`

- [ ] **Step 1: Update Zod default paths in config-schema.ts**

```bash
sed -i '' 's|~/.paperclip/instances/|~/.business-factory/instances/|g' \
  packages/shared/src/config-schema.ts
```

Verify:
```bash
grep "paperclip" packages/shared/src/config-schema.ts | grep -v "@deprecated" | grep -v "PaperclipConfig"
# Should show no path defaults — only the deprecated alias declarations
```

- [ ] **Step 2: Update default home dir in packages/db/src/runtime-config.ts**

Find the line with `.paperclip` default and update to prefer new dir, fall back to old:
```typescript
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

// Prefer ~/.business-factory; fall back to ~/.paperclip if it exists (upgrade path)
const newDefaultHome = path.resolve(os.homedir(), ".business-factory");
const legacyDefaultHome = path.resolve(os.homedir(), ".paperclip");
const DEFAULT_HOME =
  existsSync(newDefaultHome) ? newDefaultHome :
  existsSync(legacyDefaultHome) ? legacyDefaultHome :
  newDefaultHome;
```

Replace the existing single-line default with this logic.

- [ ] **Step 3: Update backup.ts default Postgres connection string**

```bash
sed -i '' \
  's|postgres://paperclip:paperclip@localhost:5432/paperclip|postgres://business-factory:business-factory@localhost:5432/business-factory|g' \
  packages/db/src/backup.ts
```

---

### Task 3.3: Update Docker files

**Files:**
- Modify: `docker-compose.yml`
- Modify: `docker-compose.quickstart.yml`
- Modify: `Dockerfile`

- [ ] **Step 1: Update docker-compose.yml — Postgres credentials, volume, service name**

Open `docker-compose.yml` and make these changes:
```yaml
# Service name: paperclip → business-factory
# POSTGRES_USER: paperclip → business-factory
# POSTGRES_PASSWORD: paperclip → business-factory
# POSTGRES_DB: paperclip → business-factory
# pg_isready -U paperclip -d paperclip → pg_isready -U business-factory -d business-factory
# DATABASE_URL: postgres://paperclip:paperclip@db:5432/paperclip → postgres://business-factory:business-factory@db:5432/business-factory
# Volume mount: paperclip-data:/paperclip → business-factory-data:/business-factory
# Volume declaration: paperclip-data: → business-factory-data:
```

Use sed or edit directly:
```bash
sed -i '' \
  -e 's/  paperclip:/  business-factory:/g' \
  -e 's/POSTGRES_USER: paperclip/POSTGRES_USER: business-factory/g' \
  -e 's/POSTGRES_PASSWORD: paperclip/POSTGRES_PASSWORD: business-factory/g' \
  -e 's/POSTGRES_DB: paperclip/POSTGRES_DB: business-factory/g' \
  -e 's|-U paperclip -d paperclip|-U business-factory -d business-factory|g' \
  -e 's|postgres://paperclip:paperclip@|postgres://business-factory:business-factory@|g' \
  -e 's|/paperclip$|/business-factory|g' \
  -e 's|paperclip-data:|business-factory-data:|g' \
  docker-compose.yml
```

Review diff: `git diff docker-compose.yml`

- [ ] **Step 2: Update docker-compose.quickstart.yml**

```bash
sed -i '' \
  -e 's/^  paperclip:/  business-factory:/g' \
  -e 's/PAPERCLIP_PORT/BUSINESS_FACTORY_PORT/g' \
  -e 's/PAPERCLIP_HOME/BUSINESS_FACTORY_HOME/g' \
  -e 's/PAPERCLIP_DEPLOYMENT_MODE/BUSINESS_FACTORY_DEPLOYMENT_MODE/g' \
  -e 's/PAPERCLIP_DEPLOYMENT_EXPOSURE/BUSINESS_FACTORY_DEPLOYMENT_EXPOSURE/g' \
  -e 's/PAPERCLIP_PUBLIC_URL/BUSINESS_FACTORY_PUBLIC_URL/g' \
  -e 's/PAPERCLIP_DATA_DIR/BUSINESS_FACTORY_DATA_DIR/g' \
  docker-compose.quickstart.yml
```

- [ ] **Step 3: Update Dockerfile**

```bash
sed -i '' \
  -e 's/@paperclipai\//@business-factory\//g' \
  -e 's|WORKDIR /paperclip|WORKDIR /business-factory|g' \
  -e 's|ENV PAPERCLIP_|ENV BUSINESS_FACTORY_|g' \
  Dockerfile
```

Review `git diff Dockerfile` to ensure no third-party paths were corrupted.

---

### Task 3.4: Rename Vite plugin and update UI files

**Files:**
- Rename: `ui/vite-plugin-paperclip.ts` → `ui/vite-plugin-business-factory.ts`
- Modify: `ui/vite.config.ts`
- Modify: `ui/src/context/ThemeContext.tsx`
- Modify: `ui/public/sw.js`

> `ui/index.html` HTML comment markers were already updated in Layer 2 Task 2.4 Step 7 to stay in sync with `ui-branding.ts`.

- [ ] **Step 1: Rename Vite plugin file and update its internals**

```bash
mv ui/vite-plugin-paperclip.ts ui/vite-plugin-business-factory.ts
```

In `ui/vite-plugin-business-factory.ts`, replace:
- `"virtual:paperclip-plugins"` → `"virtual:business-factory-plugins"`
- `"vite-plugin-paperclip"` → `"vite-plugin-business-factory"`
- `"paperclip.config.json"` → `"business-factory.config.json"`
- Any warning message mentioning "paperclip.config.json" → "business-factory.config.json"

```bash
sed -i '' \
  -e 's/virtual:paperclip-plugins/virtual:business-factory-plugins/g' \
  -e 's/vite-plugin-paperclip/vite-plugin-business-factory/g' \
  -e 's/paperclip\.config\.json/business-factory.config.json/g' \
  ui/vite-plugin-business-factory.ts
```

- [ ] **Step 2: Update ui/vite.config.ts import**

```bash
sed -i '' \
  -e 's/vite-plugin-paperclip/vite-plugin-business-factory/g' \
  -e 's/paperclipPlugin/businessFactoryPlugin/g' \
  ui/vite.config.ts
```

- [ ] **Step 3: Update ui/index.html title and apple-mobile title**

```bash
sed -i '' \
  -e 's/content="Paperclip"/content="Business Factory"/g' \
  -e 's|<title>Paperclip</title>|<title>Business Factory</title>|g' \
  ui/index.html
```

Also update the localStorage theme key inline reference if present:
```bash
sed -i '' 's/"paperclip\.theme"/"business-factory.theme"/g' ui/index.html
```

- [ ] **Step 4: Update ThemeContext.tsx**

```bash
sed -i '' 's/"paperclip\.theme"/"business-factory.theme"/g' \
  ui/src/context/ThemeContext.tsx
```

- [ ] **Step 5: Update service worker cache key**

```bash
sed -i '' 's/"paperclip-v2"/"business-factory-v1"/g' ui/public/sw.js
```

---

### Task 3.5: Update protocol markers and remaining constants

**Files:**
- Modify: `server/src/services/projects.ts`
- Modify: `server/src/services/agent-zero-project-sync.ts`
- Modify: `cli/src/commands/worktree.ts`
- Modify: `packages/adapters/agent-zero/src/server/utils.ts`
- Modify: `packages/adapters/agent-zero/src/server/execute.ts`
- Modify: `integrations/agent-zero/usr-extensions/Business Factory/business_factory/request_flags.py`

- [ ] **Step 1: Update sentinel in projects.ts**

```bash
sed -i '' \
  's|/__paperclip_repo_only__|/__business_factory_repo_only__|g' \
  server/src/services/projects.ts
```

- [ ] **Step 2: Update bridge file constant in agent-zero-project-sync.ts**

```bash
sed -i '' \
  -e 's/PAPERCLIP_BRIDGE_INSTRUCTIONS_FILENAME/BUSINESS_FACTORY_BRIDGE_INSTRUCTIONS_FILENAME/g' \
  -e 's/"paperclip-bridge\.md"/"business-factory-bridge.md"/g' \
  server/src/services/agent-zero-project-sync.ts
```

Then update the bridge instruction prose text — find all string literals mentioning "Paperclip" in that file and update to "Business Factory". Also update any `PAPERCLIP_*` var names in the instructional text strings to `BUSINESS_FACTORY_*`.

- [ ] **Step 3: Update worktree name prefix in cli/src/commands/worktree.ts**

```bash
sed -i '' \
  's/const WORKTREE_NAME_PREFIX = "paperclip-"/const WORKTREE_NAME_PREFIX = "business-factory-"/g' \
  cli/src/commands/worktree.ts
```

Add a comment on the line: `// Note: existing "paperclip-" prefix worktrees must be manually renamed by operators`

- [ ] **Step 4: Update PAPERCLIP_RESULT_JSON marker (TypeScript side)**

In `packages/adapters/agent-zero/src/server/utils.ts`:
```typescript
export const RESULT_MARKER = "BUSINESS_FACTORY_RESULT_JSON";
export const LEGACY_RESULT_MARKER = "PAPERCLIP_RESULT_JSON"; // backward compat: also accept this
```

In `packages/adapters/agent-zero/src/server/execute.ts`, update all protocol strings:
```bash
sed -i '' \
  -e 's/PAPERCLIP_RESULT_JSON/BUSINESS_FACTORY_RESULT_JSON/g' \
  -e 's/paperclip context:/business factory context:/g' \
  -e 's/paperclip bridge:/business factory bridge:/g' \
  -e 's/paperclip run:/business factory run:/g' \
  -e 's/Paperclip/Business Factory/g' \
  -e 's/buildPaperclipBridgeText/buildBusinessFactoryBridgeText/g' \
  packages/adapters/agent-zero/src/server/execute.ts
```

Review diff carefully — protocol strings in prompts must match what the Python side parses.

- [ ] **Step 5: Update Python integration (must match TypeScript exactly)**

In `integrations/agent-zero/usr-extensions/Business Factory/business_factory/request_flags.py`:

```python
# New primary markers (must match execute.ts strings exactly)
BUSINESS_FACTORY_CONTEXT_MARKERS = (
    "business factory context:",
    "business factory bridge:",
    "business factory run:",
    "business_factory_api_url",
    "business_factory_issue_id",
)

# Legacy markers kept for transition — accept both old and new
PAPERCLIP_CONTEXT_MARKERS = (
    "paperclip context:",
    "paperclip bridge:",
    "paperclip run:",
    "paperclip_api_url",
    "paperclip_issue_id",
)

CONTEXT_MARKERS = BUSINESS_FACTORY_CONTEXT_MARKERS + PAPERCLIP_CONTEXT_MARKERS

ASSIGNED_TASK_MARKERS = (
    "treat the assigned business factory issue title and description above as the task to execute",
    "treat the assigned paperclip issue title and description above as the task to execute",  # legacy
)


def is_business_factory_assigned_request(message: str) -> bool:
    lower = message.lower()
    return any(m in lower for m in ASSIGNED_TASK_MARKERS)


# Backward-compat alias — update callers over time
is_paperclip_assigned_request = is_business_factory_assigned_request
```

Also update all prose strings in that file: "Paperclip already assigned the task" → "Business Factory already assigned the task".

- [ ] **Step 6: Run typecheck and tests**

```bash
pnpm typecheck && pnpm test:run
```

Expected: all pass.

- [ ] **Step 7: Commit Layer 3**

```bash
git add -A
git commit -m "feat: rename config/docker/protocol markers to business-factory (Layer 3)"
```

---

## Chunk 4: Layer 4 — Runtime Skills

### Task 4.1: Rename skill directories and update all content

- [ ] **Step 1: Rename skill directories**

```bash
mv skills/paperclip skills/business-factory
mv skills/paperclip-create-agent skills/business-factory-create-agent
```

- [ ] **Step 2: Update skill frontmatter**

In `skills/business-factory/SKILL.md`, change `name: paperclip` → `name: business-factory`.
In `skills/business-factory-create-agent/SKILL.md`, change `name: paperclip-create-agent` → `name: business-factory-create-agent`.

- [ ] **Step 3: Bulk update skill content**

```bash
find skills/business-factory skills/business-factory-create-agent -name "*.md" \
  | xargs sed -i '' \
    -e 's/Paperclip/Business Factory/g' \
    -e 's/PAPERCLIP_/BUSINESS_FACTORY_/g' \
    -e 's/X-Paperclip-Run-Id/X-Business-Factory-Run-Id/g' \
    -e 's/paperclipai agent/business-factory agent/g' \
    -e 's/paperclip-create-agent/business-factory-create-agent/g'
```

- [ ] **Step 4: Review skill content diff**

```bash
git diff skills/
```

Read every changed line — skill content is injected into agent context verbatim. Verify every "Business Factory" reference makes semantic sense and every env var name is correct.

---

### Task 4.2: Update .claude/skills symlink

- [ ] **Step 1: Remove old symlink and create new one**

```bash
rm .claude/skills/paperclip
ln -s ../../skills/business-factory .claude/skills/business-factory
```

- [ ] **Step 2: Verify symlink**

```bash
ls -la .claude/skills/
readlink .claude/skills/business-factory
# Must output: ../../skills/business-factory
```

---

### Task 4.3: Rename skill loader function and constant in server-utils.ts

**Files:**
- Modify: `packages/adapter-utils/src/server-utils.ts`
- Rename: `server/src/__tests__/paperclip-skill-utils.test.ts` → `business-factory-skill-utils.test.ts`

- [ ] **Step 1: Rename the test file**

```bash
mv server/src/__tests__/paperclip-skill-utils.test.ts \
   server/src/__tests__/business-factory-skill-utils.test.ts
```

Update imports and test descriptions inside — replace `listPaperclipSkillEntries` with `listBusinessFactorySkillEntries`, update any `skills/paperclip` directory references to `skills/business-factory`.

- [ ] **Step 2: Run renamed test to confirm existing behavior still passes**

```bash
pnpm test:run server/src/__tests__/business-factory-skill-utils.test.ts
```

Expected: tests pass (they still call the old function name which is still aliased).

- [ ] **Step 3: Rename constant and function in server-utils.ts**

In `packages/adapter-utils/src/server-utils.ts`:

```typescript
// Rename constant:
const BUSINESS_FACTORY_SKILL_ROOT_RELATIVE_CANDIDATES = [
  "../../skills",
  "../../../../../skills",
];

// Rename function (keep old body, just update name and internal constant reference):
export async function listBusinessFactorySkillEntries(moduleDir: string): Promise<BusinessFactorySkillEntry[]> {
  // ... same body, replace PAPERCLIP_SKILL_ROOT_RELATIVE_CANDIDATES with BUSINESS_FACTORY_SKILL_ROOT_RELATIVE_CANDIDATES
}

/** @deprecated Use listBusinessFactorySkillEntries */
export const listPaperclipSkillEntries = listBusinessFactorySkillEntries;
```

- [ ] **Step 4: Update test to use new function name**

In `server/src/__tests__/business-factory-skill-utils.test.ts`, update imports:
```typescript
import { listBusinessFactorySkillEntries } from "@business-factory/adapter-utils/server-utils";
```
Update all callsites in the test from `listPaperclipSkillEntries` → `listBusinessFactorySkillEntries`.

- [ ] **Step 5: Run tests**

```bash
pnpm test:run server/src/__tests__/business-factory-skill-utils.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Layer 4**

```bash
git add -A
git commit -m "feat: rename runtime skills from paperclip to business-factory (Layer 4)"
```

---

## Chunk 5: Layer 5 — Docs & UI Text

### Task 5.1: Update README.md and AGENTS.md

- [ ] **Step 1: Bulk replace display text**

```bash
sed -i '' \
  -e 's/Paperclip/Business Factory/g' \
  -e 's/paperclipai/business-factory/g' \
  README.md AGENTS.md
```

- [ ] **Step 2: Fix any GitHub URLs that should point to the new repo**

```bash
grep "paperclip" README.md
# Fix any github.com/paperclipai/paperclip URLs → github.com/AijooseFactory/business-factory
sed -i '' \
  's|github.com/paperclipai/paperclip|github.com/AijooseFactory/business-factory|g' \
  README.md
```

- [ ] **Step 3: Review diffs**

```bash
git diff README.md AGENTS.md
```

Verify no code blocks or technical references were incorrectly changed.

---

### Task 5.2: Update docs/ and doc/ directories

- [ ] **Step 1: Rename what-is-paperclip.md**

```bash
mv docs/start/what-is-paperclip.md docs/start/what-is-business-factory.md
```

- [ ] **Step 2: Bulk update all markdown in docs/ and doc/**

```bash
find docs doc -name "*.md" -o -name "*.json" | xargs sed -i '' \
  -e 's/Paperclip/Business Factory/g' \
  -e 's/paperclipai/business-factory/g' \
  -e 's/what-is-paperclip/what-is-business-factory/g'
```

- [ ] **Step 3: Verify docs/docs.json navigation is correct**

```bash
cat docs/docs.json | grep -i "paperclip"
# Should return no results
```

---

### Task 5.3: Update CLI banners and server instructional strings

- [ ] **Step 1: Update CLI banner strings**

```bash
sed -i '' \
  -e 's/paperclipai onboard/business-factory onboard/g' \
  cli/src/commands/onboard.ts

sed -i '' \
  -e 's/paperclipai run/business-factory run/g' \
  cli/src/commands/run.ts

sed -i '' \
  -e 's/\.name("paperclipai")/.name("business-factory")/g' \
  cli/src/index.ts
```

Also update help text strings in `cli/src/index.ts` that reference "Paperclip" or "paperclipai":
```bash
sed -i '' \
  -e 's/Paperclip/Business Factory/g' \
  -e 's/paperclipai/business-factory/g' \
  cli/src/index.ts
```

- [ ] **Step 2: Update server/src/routes/access.ts instructional strings**

```bash
grep -n "PAPERCLIP_\|Paperclip\|paperclip" server/src/routes/access.ts | grep -v "BUSINESS_FACTORY"
```

For each match, update the string literal to use `BUSINESS_FACTORY_*` var names and "Business Factory" branding.

- [ ] **Step 3: Run full test suite**

```bash
pnpm typecheck && pnpm test:run
```

Expected: all pass.

- [ ] **Step 4: Final paperclip reference audit**

```bash
# Check display text areas are clean:
grep -rin "paperclip" \
  README.md AGENTS.md docs/ doc/ \
  cli/src/commands/onboard.ts cli/src/commands/run.ts cli/src/index.ts \
  server/src/routes/access.ts \
  | grep -iv "business.factory" \
  | grep -iv "backward.compat\|deprecated\|legacy\|alias\|# paperclip"
# Should return no results (or only intentional backward-compat code comments)

# Confirm releases/ still has paperclip refs (expected — historical):
grep -c "paperclip" releases/*.md
```

- [ ] **Step 5: Commit Layer 5**

```bash
git add -A
git commit -m "feat: update all docs, UI text, and CLI banners to Business Factory (Layer 5)"
```

---

## Final Verification

- [ ] **Step 1: Clean install from scratch**

```bash
find . -name "node_modules" -not -path "*/.git/*" -prune -exec rm -rf {} + 2>/dev/null
pnpm install
```

- [ ] **Step 2: Full build**

```bash
pnpm build
```

Expected: all packages build successfully.

- [ ] **Step 3: Run full test suite**

```bash
pnpm test:run
```

Expected: all tests pass.

- [ ] **Step 4: Spot check backward compat**

```bash
# Verify legacy PAPERCLIP_HOME env var is respected:
PAPERCLIP_HOME=/tmp/bf-compat-test pnpm --filter @business-factory/server \
  exec node -e "
    const { resolvePaperclipHomeDir } = await import('./src/home-paths.js');
    console.assert(resolvePaperclipHomeDir().includes('bf-compat-test'), 'PAPERCLIP_HOME fallback works');
    console.log('OK');
  "
```

- [ ] **Step 5: Tag the completion commit**

```bash
git tag v-rebrand-business-factory-complete
git push origin main --tags
```
