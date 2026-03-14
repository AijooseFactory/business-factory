# CLI Reference

Business Factory CLI now supports both:

- instance setup/diagnostics (`onboard`, `doctor`, `configure`, `env`, `allowed-hostname`)
- control-plane client operations (issues, approvals, agents, activity, dashboard)

## Base Usage

Use repo script in development:

```sh
pnpm business-factoryai --help
```

First-time local bootstrap + run:

```sh
pnpm business-factoryai run
```

Choose local instance:

```sh
pnpm business-factoryai run --instance dev
```

## Deployment Modes

Mode taxonomy and design intent are documented in `doc/DEPLOYMENT-MODES.md`.

Current CLI behavior:

- `business-factoryai onboard` and `business-factoryai configure --section server` set deployment mode in config
- runtime can override mode with `PAPERCLIP_DEPLOYMENT_MODE`
- `business-factoryai run` and `business-factoryai doctor` do not yet expose a direct `--mode` flag

Target behavior (planned) is documented in `doc/DEPLOYMENT-MODES.md` section 5.

Allow an authenticated/private hostname (for example custom Tailscale DNS):

```sh
pnpm business-factoryai allowed-hostname dotta-macbook-pro
```

All client commands support:

- `--data-dir <path>`
- `--api-base <url>`
- `--api-key <token>`
- `--context <path>`
- `--profile <name>`
- `--json`

Company-scoped commands also support `--company-id <id>`.

Use `--data-dir` on any CLI command to isolate all default local state (config/context/db/logs/storage/secrets) away from `~/.business-factory`:

```sh
pnpm business-factoryai run --data-dir ./tmp/business-factory-dev
pnpm business-factoryai issue list --data-dir ./tmp/business-factory-dev
```

## Context Profiles

Store local defaults in `~/.business-factory/context.json`:

```sh
pnpm business-factoryai context set --api-base http://localhost:3100 --company-id <company-id>
pnpm business-factoryai context show
pnpm business-factoryai context list
pnpm business-factoryai context use default
```

To avoid storing secrets in context, set `apiKeyEnvVarName` and keep the key in env:

```sh
pnpm business-factoryai context set --api-key-env-var-name PAPERCLIP_API_KEY
export PAPERCLIP_API_KEY=...
```

## Company Commands

```sh
pnpm business-factoryai company list
pnpm business-factoryai company get <company-id>
pnpm business-factoryai company delete <company-id-or-prefix> --yes --confirm <same-id-or-prefix>
```

Examples:

```sh
pnpm business-factoryai company delete PAP --yes --confirm PAP
pnpm business-factoryai company delete 5cbe79ee-acb3-4597-896e-7662742593cd --yes --confirm 5cbe79ee-acb3-4597-896e-7662742593cd
```

Notes:

- Deletion is server-gated by `PAPERCLIP_ENABLE_COMPANY_DELETION`.
- With agent authentication, company deletion is company-scoped. Use the current company ID/prefix (for example via `--company-id` or `PAPERCLIP_COMPANY_ID`), not another company.

## Issue Commands

```sh
pnpm business-factoryai issue list --company-id <company-id> [--status todo,in_progress] [--assignee-agent-id <agent-id>] [--match text]
pnpm business-factoryai issue get <issue-id-or-identifier>
pnpm business-factoryai issue create --company-id <company-id> --title "..." [--description "..."] [--status todo] [--priority high]
pnpm business-factoryai issue update <issue-id> [--status in_progress] [--comment "..."]
pnpm business-factoryai issue comment <issue-id> --body "..." [--reopen]
pnpm business-factoryai issue checkout <issue-id> --agent-id <agent-id> [--expected-statuses todo,backlog,blocked]
pnpm business-factoryai issue release <issue-id>
```

## Agent Commands

```sh
pnpm business-factoryai agent list --company-id <company-id>
pnpm business-factoryai agent get <agent-id>
pnpm business-factoryai agent local-cli <agent-id-or-shortname> --company-id <company-id>
```

`agent local-cli` is the quickest way to run local Claude/Codex manually as a Business Factory agent:

- creates a new long-lived agent API key
- installs missing Business Factory skills into `~/.codex/skills` and `~/.claude/skills`
- prints `export ...` lines for `PAPERCLIP_API_URL`, `PAPERCLIP_COMPANY_ID`, `PAPERCLIP_AGENT_ID`, and `PAPERCLIP_API_KEY`

Example for shortname-based local setup:

```sh
pnpm business-factoryai agent local-cli codexcoder --company-id <company-id>
pnpm business-factoryai agent local-cli claudecoder --company-id <company-id>
```

## Approval Commands

```sh
pnpm business-factoryai approval list --company-id <company-id> [--status pending]
pnpm business-factoryai approval get <approval-id>
pnpm business-factoryai approval create --company-id <company-id> --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]
pnpm business-factoryai approval approve <approval-id> [--decision-note "..."]
pnpm business-factoryai approval reject <approval-id> [--decision-note "..."]
pnpm business-factoryai approval request-revision <approval-id> [--decision-note "..."]
pnpm business-factoryai approval resubmit <approval-id> [--payload '{"...":"..."}']
pnpm business-factoryai approval comment <approval-id> --body "..."
```

## Activity Commands

```sh
pnpm business-factoryai activity list --company-id <company-id> [--agent-id <agent-id>] [--entity-type issue] [--entity-id <id>]
```

## Dashboard Commands

```sh
pnpm business-factoryai dashboard get --company-id <company-id>
```

## Heartbeat Command

`heartbeat run` now also supports context/api-key options and uses the shared client stack:

```sh
pnpm business-factoryai heartbeat run --agent-id <agent-id> [--api-base http://localhost:3100] [--api-key <token>]
```

## Local Storage Defaults

Default local instance root is `~/.business-factory/instances/default`:

- config: `~/.business-factory/instances/default/config.json`
- embedded db: `~/.business-factory/instances/default/db`
- logs: `~/.business-factory/instances/default/logs`
- storage: `~/.business-factory/instances/default/data/storage`
- secrets key: `~/.business-factory/instances/default/secrets/master.key`

Override base home or instance with env vars:

```sh
PAPERCLIP_HOME=/custom/home PAPERCLIP_INSTANCE_ID=dev pnpm business-factoryai run
```

## Storage Configuration

Configure storage provider and settings:

```sh
pnpm business-factoryai configure --section storage
```

Supported providers:

- `local_disk` (default; local single-user installs)
- `s3` (S3-compatible object storage)
