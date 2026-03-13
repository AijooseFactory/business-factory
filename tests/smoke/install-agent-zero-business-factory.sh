#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/integrations/agent-zero/install-business-factory-agent-zero.sh"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

BUSINESS_FACTORY_ROOT="$TMP_DIR/business-factory"
AGENT_ZERO_ROOT="$TMP_DIR/agent-zero"

mkdir -p "$BUSINESS_FACTORY_ROOT/integrations/agent-zero/usr-extensions/Business Factory/business_factory"
mkdir -p "$BUSINESS_FACTORY_ROOT/integrations/agent-zero/usr-extensions/agent_init"
mkdir -p "$BUSINESS_FACTORY_ROOT/integrations/agent-zero/python-overrides"
mkdir -p "$BUSINESS_FACTORY_ROOT/integrations/agent-zero/webui-overrides/components/welcome"
touch "$BUSINESS_FACTORY_ROOT/package.json"

cat > "$BUSINESS_FACTORY_ROOT/integrations/agent-zero/usr-extensions/Business Factory/business_factory/__init__.py" <<'EOF'
print("business factory")
EOF

cat > "$BUSINESS_FACTORY_ROOT/integrations/agent-zero/usr-extensions/agent_init/_10_initial_message.py" <<'EOF'
print("init")
EOF

cat > "$BUSINESS_FACTORY_ROOT/integrations/agent-zero/python-overrides/api_message.py" <<'EOF'
print("api")
EOF

cat > "$BUSINESS_FACTORY_ROOT/integrations/agent-zero/webui-overrides/components/welcome/welcome-projects.mjs" <<'EOF'
export const marker = "projects";
EOF

cat > "$BUSINESS_FACTORY_ROOT/integrations/agent-zero/webui-overrides/components/welcome/welcome-store.js" <<'EOF'
export const marker = "store";
EOF

cat > "$BUSINESS_FACTORY_ROOT/integrations/agent-zero/webui-overrides/components/welcome/welcome-screen.html" <<'EOF'
<div>screen</div>
EOF

mkdir -p "$AGENT_ZERO_ROOT/python/api"
mkdir -p "$AGENT_ZERO_ROOT/usr/extensions/agent_init"
mkdir -p "$AGENT_ZERO_ROOT/webui/components/welcome"
mkdir -p "$AGENT_ZERO_ROOT/usr/settings"

cat > "$AGENT_ZERO_ROOT/agent.py" <<'EOF'
print("agent zero")
EOF

cat > "$AGENT_ZERO_ROOT/python/api/api_message.py" <<'EOF'
print("original api")
EOF

cat > "$AGENT_ZERO_ROOT/usr/extensions/agent_init/_10_initial_message.py" <<'EOF'
print("original init")
EOF

cat > "$AGENT_ZERO_ROOT/webui/components/welcome/welcome-projects.mjs" <<'EOF'
export const original = "projects";
EOF

cat > "$AGENT_ZERO_ROOT/webui/components/welcome/welcome-store.js" <<'EOF'
export const original = "store";
EOF

cat > "$AGENT_ZERO_ROOT/webui/components/welcome/welcome-screen.html" <<'EOF'
<div>original</div>
EOF

cat > "$AGENT_ZERO_ROOT/usr/settings/preferences.json" <<'EOF'
{"keep":"me"}
EOF

(
  cd "$BUSINESS_FACTORY_ROOT"
  "$SCRIPT" --yes --business-factory-root "$BUSINESS_FACTORY_ROOT" --agent-zero-root "$AGENT_ZERO_ROOT"
)

test -f "$AGENT_ZERO_ROOT/usr/extensions/Business Factory/business_factory/__init__.py"
test -f "$AGENT_ZERO_ROOT/.business-factory-backup/python/api/api_message.py"
test -f "$AGENT_ZERO_ROOT/.business-factory-backup/webui/components/welcome/welcome-screen.html"
grep -q 'api' "$AGENT_ZERO_ROOT/python/api/api_message.py"
grep -q '"keep":"me"' "$AGENT_ZERO_ROOT/usr/settings/preferences.json"

(
  cd "$AGENT_ZERO_ROOT"
  "$SCRIPT" --yes --business-factory-root "$BUSINESS_FACTORY_ROOT"
)

grep -q 'projects' "$AGENT_ZERO_ROOT/webui/components/welcome/welcome-projects.mjs"
