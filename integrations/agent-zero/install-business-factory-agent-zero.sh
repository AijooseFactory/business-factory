#!/usr/bin/env bash
set -euo pipefail

DEFAULT_BACKUP_DIR_NAME=".business-factory-backup"
CONFIRM_INSTALL=1
BUSINESS_FACTORY_ROOT="${BUSINESS_FACTORY_ROOT:-}"
AGENT_ZERO_ROOT="${AGENT_ZERO_ROOT:-}"

prompt() {
  local message="$1"
  local default_value="${2:-}"
  local reply
  if [[ -n "$default_value" ]]; then
    read -r -p "$message [$default_value]: " reply
    printf '%s\n' "${reply:-$default_value}"
  else
    read -r -p "$message: " reply
    printf '%s\n' "$reply"
  fi
}

confirm() {
  local message="$1"
  local reply
  read -r -p "$message [y/N]: " reply
  [[ "$reply" =~ ^[Yy]([Ee][Ss])?$ ]]
}

is_business_factory_root() {
  local root="$1"
  [[ -d "$root/integrations/agent-zero/usr-extensions/Business Factory" ]] &&
    [[ -f "$root/package.json" ]]
}

is_agent_zero_root() {
  local root="$1"
  [[ -f "$root/agent.py" ]] &&
    [[ -d "$root/python/api" ]] &&
    [[ -d "$root/usr/extensions" ]] &&
    [[ -d "$root/webui/components/welcome" ]]
}

resolve_business_factory_root_from_script() {
  local dir
  dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  while [[ "$dir" != "/" ]]; do
    if is_business_factory_root "$dir"; then
      printf '%s\n' "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

usage() {
  cat <<'EOF'
Usage:
  install-business-factory-agent-zero.sh [--yes] [--business-factory-root <path>] [--agent-zero-root <path>]

This script installs the Business Factory Agent Zero integration into an existing Agent Zero instance.
It only touches the Business Factory extension files, the Agent Zero api_message bootstrap shim,
and the welcome-screen overrides required for project activation.
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --yes)
        CONFIRM_INSTALL=0
        shift
        ;;
      --business-factory-root)
        BUSINESS_FACTORY_ROOT="${2:-}"
        shift 2
        ;;
      --agent-zero-root)
        AGENT_ZERO_ROOT="${2:-}"
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo "Unknown argument: $1" >&2
        usage >&2
        exit 1
        ;;
    esac
  done
}

resolve_roots() {
  if [[ -z "$BUSINESS_FACTORY_ROOT" ]]; then
    BUSINESS_FACTORY_ROOT="$(resolve_business_factory_root_from_script || true)"
  fi
  if [[ -z "$BUSINESS_FACTORY_ROOT" ]] && is_business_factory_root "$PWD"; then
    BUSINESS_FACTORY_ROOT="$PWD"
  fi
  if [[ -z "$AGENT_ZERO_ROOT" ]] && is_agent_zero_root "$PWD"; then
    AGENT_ZERO_ROOT="$PWD"
  fi

  if [[ -z "$BUSINESS_FACTORY_ROOT" ]]; then
    BUSINESS_FACTORY_ROOT="$(prompt "Business Factory root")"
  fi
  if [[ -z "$AGENT_ZERO_ROOT" ]]; then
    AGENT_ZERO_ROOT="$(prompt "Agent Zero root")"
  fi
}

require_business_factory_root() {
  local root="$1"
  if ! is_business_factory_root "$root"; then
    echo "Expected Business Factory root to contain integrations/agent-zero: $root" >&2
    exit 1
  fi
}

require_agent_zero_root() {
  local root="$1"
  if ! is_agent_zero_root "$root"; then
    echo "Expected Agent Zero root to contain agent.py, python/api, usr/extensions, and webui/components/welcome: $root" >&2
    exit 1
  fi
}

backup_file_once() {
  local root="$1"
  local target_file="$2"
  local backup_file="$root/$DEFAULT_BACKUP_DIR_NAME/${target_file#"$root/"}"
  if [[ ! -f "$target_file" ]]; then
    return
  fi
  mkdir -p "$(dirname "$backup_file")"
  if [[ ! -f "$backup_file" ]]; then
    cp "$target_file" "$backup_file"
    echo "Backed up $target_file -> $backup_file"
  fi
}

install_file() {
  local source_file="$1"
  local target_file="$2"
  mkdir -p "$(dirname "$target_file")"
  cp "$source_file" "$target_file"
  echo "Installed $(basename "$target_file") -> $target_file"
}

install_tree() {
  local source_dir="$1"
  local target_dir="$2"
  mkdir -p "$target_dir"
  rsync -a --delete "$source_dir/" "$target_dir/"
  echo "Synced $source_dir -> $target_dir"
}

main() {
  parse_args "$@"
  resolve_roots
  require_business_factory_root "$BUSINESS_FACTORY_ROOT"
  require_agent_zero_root "$AGENT_ZERO_ROOT"

  local integration_root="$BUSINESS_FACTORY_ROOT/integrations/agent-zero"
  local agent_zero_extensions_root="$AGENT_ZERO_ROOT/usr/extensions"
  local welcome_root="$AGENT_ZERO_ROOT/webui/components/welcome"

  echo "Business Factory root: $BUSINESS_FACTORY_ROOT"
  echo "Agent Zero root: $AGENT_ZERO_ROOT"

  if [[ "$CONFIRM_INSTALL" -eq 1 ]]; then
    if ! confirm "Install the Business Factory Agent Zero integration into this Agent Zero instance?"; then
      echo "Cancelled."
      exit 0
    fi
  fi

  backup_file_once "$AGENT_ZERO_ROOT" "$AGENT_ZERO_ROOT/python/api/api_message.py"
  backup_file_once "$AGENT_ZERO_ROOT" "$AGENT_ZERO_ROOT/usr/extensions/agent_init/00_local_host_system_patch.py"
  backup_file_once "$AGENT_ZERO_ROOT" "$AGENT_ZERO_ROOT/usr/extensions/agent_init/00_mac_system_patch.py"
  backup_file_once "$AGENT_ZERO_ROOT" "$AGENT_ZERO_ROOT/usr/extensions/agent_init/_10_initial_message.py"
  backup_file_once "$AGENT_ZERO_ROOT" "$welcome_root/welcome-projects.mjs"
  backup_file_once "$AGENT_ZERO_ROOT" "$welcome_root/welcome-store.js"
  backup_file_once "$AGENT_ZERO_ROOT" "$welcome_root/welcome-screen.html"

  install_tree \
    "$integration_root/usr-extensions/Business Factory" \
    "$agent_zero_extensions_root/Business Factory"

  install_file \
    "$integration_root/usr-extensions/agent_init/00_local_host_system_patch.py" \
    "$agent_zero_extensions_root/agent_init/00_local_host_system_patch.py"

  install_file \
    "$integration_root/usr-extensions/agent_init/_10_initial_message.py" \
    "$agent_zero_extensions_root/agent_init/_10_initial_message.py"

  if [[ -f "$agent_zero_extensions_root/agent_init/00_mac_system_patch.py" ]]; then
    rm -f "$agent_zero_extensions_root/agent_init/00_mac_system_patch.py"
    echo "Removed legacy 00_mac_system_patch.py"
  fi

  install_file \
    "$integration_root/python-overrides/api_message.py" \
    "$AGENT_ZERO_ROOT/python/api/api_message.py"

  install_file \
    "$integration_root/webui-overrides/components/welcome/welcome-projects.mjs" \
    "$welcome_root/welcome-projects.mjs"

  install_file \
    "$integration_root/webui-overrides/components/welcome/welcome-store.js" \
    "$welcome_root/welcome-store.js"

  install_file \
    "$integration_root/webui-overrides/components/welcome/welcome-screen.html" \
    "$welcome_root/welcome-screen.html"

  cat <<EOF

Business Factory Agent Zero integration installed.

What changed:
- Business Factory extension files under usr/extensions/Business Factory
- Business Factory local-host patch under usr/extensions/agent_init/00_local_host_system_patch.py
- Agent Zero bootstrap shims for initial message and /api_message
- Welcome-screen project activation files only

What did not change:
- Agent Zero models
- Agent Zero API keys
- Agent Zero user settings and other unrelated extensions

Next steps:
1. Restart Agent Zero so the new python/api and web UI files load.
2. Verify the project appears in the Agent Zero dropdown and can be activated.
3. Verify Paperclip-assigned runs use the issue title and description as the task without asking the user to restate it.

EOF
}

main "$@"
