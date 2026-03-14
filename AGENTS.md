# AGENTS.md

Guidance for human and AI contributors working in this repository.

---

## CURRENT STATUS — READ THIS FIRST

**Branch:** `rebrand/business-factory`

**Active initiative:** Full rebranding from "Paperclip" to "Business Factory"
- Design spec: `docs/superpowers/specs/2026-03-13-business-factory-rebranding-design.md`
- Implementation plan: `docs/superpowers/plans/2026-03-13-business-factory-rebranding.md`

**Layer progress:**

| Layer | Scope | Status | Commit |
|-------|-------|--------|--------|
| 1 — Package names & type aliases | `@paperclipai/*` → `@business-factory/*`, type renames with deprecated aliases | ✅ Done | `1c16aa5` |
| 2 — Env vars & runtime wiring | `PAPERCLIP_*` → `BUSINESS_FACTORY_*` reads with `??` fallbacks, dual injection into agents, JWT dual-issuer compat, HTML markers sync | ⏳ Next | — |
| 3 — Config paths, Docker, protocol markers | `.paperclip/` → `.business-factory/` fallback, Zod defaults, Docker image names, RESULT_JSON marker (TS + Python coordinated), Vite plugin rename, UI strings | ⬜ Pending | — |
| 4 — Skills & symlinks | Rename `skills/paperclip/` → `skills/business-factory/`, update SKILL.md, recreate `.claude/skills/business-factory` symlink | ⬜ Pending | — |
| 5 — Docs, README, CLI banners | README.md, doc/ directory strings, CLI banners, server instructional strings, final audit | ⬜ Pending | — |

**Critical backward-compat rules (do not break these):**
- Server reads env vars as: `process.env.BUSINESS_FACTORY_X ?? process.env.PAPERCLIP_X`
- Agent processes receive BOTH `BUSINESS_FACTORY_*` and `PAPERCLIP_*` vars (dual injection)
- JWT valid issuers: `Set(["paperclip", "business-factory", config.issuer])`
- Config path: search `.business-factory/` first, fall back to `.paperclip/`
- Deprecated TypeScript aliases (`PaperclipConfig`, `buildPaperclipEnv`, etc.) must remain exported

**Do not merge this branch to main until all 5 layers are complete and:**
```sh
pnpm -r typecheck   # must pass
pnpm test:run       # must pass (366+ tests)
pnpm build          # must pass
```

---

## AI DEVELOPER ORIENTATION

This project is worked on by multiple AI agents. Each agent that picks up work MUST:

1. Check the Layer progress table above to know what is done vs. pending
2. Read the current design spec and plan files before making any changes
3. Work only on `rebrand/business-factory` branch — NEVER commit directly to `main`
4. After completing a layer, update the Layer progress table in this file

### Agent-specific notes

**Claude Code (claude-code):**
- Superpowers skills are available via the `Skill` tool — use them
- For Layer execution: use `superpowers:subagent-driven-development`
- Typecheck with `pnpm -r typecheck` after every significant change
- User git identity: `george@aijoosefactory.com` / `George`

**Codex (OpenAI):**
- No interactive terminal — write full shell commands in script blocks
- Read the full plan (`docs/superpowers/plans/2026-03-13-business-factory-rebranding.md`) for exact commands per task
- Use `pnpm -r typecheck && pnpm test:run` to verify work before committing

**Antigravity:**
- Follow the same layer sequencing; layers are NOT parallelizable (each builds on the previous)
- All file renames must happen before content patches in the same layer

**Agent Zero:**
- The Python integrations live in `integrations/agent-zero/` and must be coordinated with TypeScript changes in Layer 3 (RESULT_JSON protocol marker)
- Do not change Python files independently of the TypeScript side

**Openclaw:**
- This is a pnpm workspace monorepo — run `pnpm install` from repo root after any package.json changes
- After any `node_modules` clean, run `find . -name "node_modules" -prune -exec rm -rf {} + && pnpm install`

---

## 1. Purpose

Business Factory is a control plane for AI-agent companies.
The current implementation target is V1 and is defined in `doc/SPEC-implementation.md`.

> **Origin note:** Business Factory is a rebrand of the Paperclip open-source project. During the rebranding period (branch `rebrand/business-factory`), both `BUSINESS_FACTORY_*` and `PAPERCLIP_*` namespaces are active. Do not remove the `PAPERCLIP_*` compatibility layer — agents and integrations may still rely on it.

## 2. Read This First

Before making changes, read in this order:

1. `doc/GOAL.md`
2. `doc/PRODUCT.md`
3. `doc/SPEC-implementation.md`
4. `doc/DEVELOPING.md`
5. `doc/DATABASE.md`

`doc/SPEC.md` is long-horizon product context.
`doc/SPEC-implementation.md` is the concrete V1 build contract.

## 3. Repo Map

- `server/`: Express REST API and orchestration services
- `ui/`: React + Vite board UI
- `packages/db/`: Drizzle schema, migrations, DB clients
- `packages/shared/`: shared types, constants, validators, API path constants
- `packages/adapter-utils/`: shared utilities for adapter packages
- `packages/adapter-*/`: individual agent adapter packages
- `skills/`: runtime skill directories (being renamed in Layer 4)
- `integrations/`: third-party agent integration files (Agent Zero, etc.)
- `doc/`: operational and product docs
- `docs/superpowers/`: design specs and implementation plans

## 4. Dev Setup (Auto DB)

Use embedded PGlite in dev by leaving `DATABASE_URL` unset.

```sh
pnpm install
pnpm dev
```

This starts:

- API: `http://localhost:3100`
- UI: `http://localhost:3100` (served by API server in dev middleware mode)

Quick checks:

```sh
curl http://localhost:3100/api/health
curl http://localhost:3100/api/companies
```

Reset local dev DB:

```sh
rm -rf data/pglite
pnpm dev
```

## 5. Core Engineering Rules

1. Keep changes company-scoped.
Every domain entity should be scoped to a company and company boundaries must be enforced in routes/services.

2. Keep contracts synchronized.
If you change schema/API behavior, update all impacted layers:
- `packages/db` schema and exports
- `packages/shared` types/constants/validators
- `server` routes/services
- `ui` API clients and pages

3. Preserve control-plane invariants.
- Single-assignee task model
- Atomic issue checkout semantics
- Approval gates for governed actions
- Budget hard-stop auto-pause behavior
- Activity logging for mutating actions

4. Do not replace strategic docs wholesale unless asked.
Prefer additive updates. Keep `doc/SPEC.md` and `doc/SPEC-implementation.md` aligned.

5. Keep plan docs dated and centralized.
New plan documents belong in `docs/superpowers/plans/` and should use `YYYY-MM-DD-slug.md` filenames.

## 6. Database Change Workflow

When changing data model:

1. Edit `packages/db/src/schema/*.ts`
2. Ensure new tables are exported from `packages/db/src/schema/index.ts`
3. Generate migration:

```sh
pnpm db:generate
```

4. Validate compile:

```sh
pnpm -r typecheck
```

Notes:
- `packages/db/drizzle.config.ts` reads compiled schema from `dist/schema/*.js`
- `pnpm db:generate` compiles `packages/db` first

## 7. Verification Before Hand-off

Run this full check before claiming done:

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

If anything cannot be run, explicitly report what was not run and why.

## 8. API and Auth Expectations

- Base path: `/api`
- Board access is treated as full-control operator context
- Agent access uses bearer API keys (`agent_api_keys`), hashed at rest
- Agent keys must not access other companies

When adding endpoints:

- apply company access checks
- enforce actor permissions (board vs agent)
- write activity log entries for mutations
- return consistent HTTP errors (`400/401/403/404/409/422/500`)

## 9. UI Expectations

- Keep routes and nav aligned with available API surface
- Use company selection context for company-scoped pages
- Surface failures clearly; do not silently ignore API errors

## 10. Definition of Done

A change is done when all are true:

1. Behavior matches `doc/SPEC-implementation.md`
2. Typecheck, tests, and build pass
3. Contracts are synced across db/shared/server/ui
4. Docs updated when behavior or commands change
