#!/bin/bash
set -Eeuo pipefail

DEST_DIR="$1"
PORT="$2"
ROLLBACK_DIR="$3"
HEALTHCHECK_ATTEMPTS="${HEALTHCHECK_ATTEMPTS:-10}"
HEALTHCHECK_SLEEP_SECONDS="${HEALTHCHECK_SLEEP_SECONDS:-2}"

restart_app() {
  cd "$DEST_DIR"
  if npx pm2 describe 'boomer-engine' >/dev/null 2>&1; then
    PORT="$PORT" npx pm2 restart 'boomer-engine' --update-env
  else
    PORT="$PORT" npx pm2 start server.js --name 'boomer-engine'
  fi
  npx pm2 save
}

wait_for_health() {
  local attempt status
  for ((attempt = 1; attempt <= HEALTHCHECK_ATTEMPTS; attempt++)); do
    status="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/" || true)"
    case "$status" in
      200|401)
        echo "✅ Health check local aprovado: HTTP $status (tentativa $attempt)."
        return 0
        ;;
    esac
    sleep "$HEALTHCHECK_SLEEP_SECONDS"
  done
  return 1
}

if restart_app && wait_for_health; then
  exit 0
fi

echo "⚠️ Nova versão não ficou saudável; iniciando rollback." >&2
if [ -f "$ROLLBACK_DIR/server.js" ]; then
  rsync -a --delete --exclude='.tmp/' "$ROLLBACK_DIR/" "$DEST_DIR/"
  if restart_app && wait_for_health; then
    echo "✅ Rollback restaurou a versão anterior. O deploy novo permanece marcado como falho." >&2
    exit 1
  fi
fi

echo "❌ Deploy e rollback não produziram uma aplicação saudável na porta $PORT." >&2
npx pm2 logs 'boomer-engine' --nostream --lines 40 >&2 || true
exit 1
