#!/bin/sh
set -eu

# Con network_mode: host, escuchar fuera de loopback publicaría el Gateway en la red local.
host=127.0.0.1
while [ "$#" -gt 0 ]; do
  case "$1" in
    --host)
      [ "$#" -ge 2 ] || { echo "openclaw-entrypoint: falta el valor de --host" >&2; exit 64; }
      host="$2"; shift 2 ;;
    *) echo "openclaw-entrypoint: argumento desconocido: $1" >&2; exit 64 ;;
  esac
done
if [ "$host" != 127.0.0.1 ]; then
  echo "openclaw-entrypoint: el Gateway solo puede escuchar en 127.0.0.1" >&2
  exit 64
fi

profile_dir="$HOME/.openclaw-vita-demo"
mkdir -p "$profile_dir/agents"
if [ ! -f "$profile_dir/openclaw.json" ]; then
  cp /opt/openclaw/config.compose.json "$profile_dir/openclaw.json"
  chmod 600 "$profile_dir/openclaw.json"
fi
for agent in calendario documentos orquestador; do
  if [ ! -d "$profile_dir/agents/$agent" ]; then
    cp -R "/opt/openclaw/agents/$agent" "$profile_dir/agents/$agent"
  fi
done
node -e 'const fs = require("node:fs"); const path = process.argv[1]; const config = JSON.parse(fs.readFileSync(path, "utf8")); const port = Number(process.env.OPENCLAW_GATEWAY_PORT || 18789); if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("OPENCLAW_GATEWAY_PORT must be a valid TCP port"); config.gateway.port = port; config.gateway.bind = "loopback"; fs.writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 }); fs.chmodSync(path, 0o600)' "$profile_dir/openclaw.json"

exec node /opt/openclaw/node_modules/openclaw/openclaw.mjs \
  --profile vita-demo gateway run --port "${OPENCLAW_GATEWAY_PORT:-18789}"