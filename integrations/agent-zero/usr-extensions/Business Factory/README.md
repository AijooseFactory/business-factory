Business Factory Agent Zero extensions live here.

This folder is the source of truth for Business Factory-specific Agent Zero runtime behavior.
Agent Zero only auto-loads extension classes from concrete extension-point folders such as
`/a0/usr/extensions/agent_init`, so small shim files in those folders import the actual
implementation from this directory.
