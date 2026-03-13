# Agent Zero Integration

This directory contains the Business Factory integration layer for Agent Zero.

It is intentionally split from the Business Factory core app so the Paperclip-derived
Node/React code and the Agent Zero runtime customizations can evolve separately.

## Layout

- `usr-extensions/Business Factory`
  The real Business Factory Agent Zero extension package.
- `usr-extensions/agent_init/_10_initial_message.py`
  Thin shim that lets Agent Zero load the Business Factory initial-message behavior
  through its normal extension discovery path.
- `python-overrides/api_message.py`
  Thin bootstrap shim for Agent Zero's `/api_message` handler.
  Agent Zero does not expose an early-enough extension hook for this endpoint,
  so the override only imports the Business Factory implementation and keeps
  the business logic out of the core file itself.
- `webui-overrides/components/welcome/*`
  Business Factory welcome-screen project launcher for Agent Zero.
- `tests/*`
  Focused regression tests for the reusable integration logic.

## Install

Agent Zero must already be installed.

Run from the Business Factory repo:

```bash
./scripts/install-agent-zero-business-factory.sh
```

Or run the portable installer directly and point it at whichever side is missing:

```bash
./integrations/agent-zero/install-business-factory-agent-zero.sh --business-factory-root /path/to/business-factory --agent-zero-root /path/to/agent-zero --yes
```

The installer:

- can resolve roots from either the Business Factory side or the Agent Zero side
- locates or prompts for the Agent Zero root and the Business Factory root as needed
- validates the expected Agent Zero folders exist
- backs up the original `python/api/api_message.py` plus the overridden welcome-screen files
- installs the Business Factory extension files and only the specific welcome-screen overrides required for project activation
- avoids touching user settings, models, or API keys

## Notes

- The Business Factory extension is intentionally named `Business Factory` to match
  Agent Zero's `usr/extensions` layout.
- The `api_message.py` bootstrap shim is a compatibility constraint, not a forking strategy.
  The behavior lives in `usr-extensions/Business Factory/business_factory/api_message.py`.
