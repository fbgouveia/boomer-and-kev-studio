#!/bin/bash
set -Eeuo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# DEPLOY SCRIPT: BOOMER & KEV STUDIO -> HOSTINGER VPS (Next.js Standalone)
# ─────────────────────────────────────────────────────────────────────────────

VPS_IP="${VPS_IP:-2.25.182.106}"
VPS_USER="${VPS_USER:-root}"
DEST_DIR="${DEST_DIR:-/var/www/boomerandkev.fgss.io}"
PORT="${PORT:-3001}" # Porta sugerida para a Engine (a porta 3000 deve estar com outro app)
DEPLOY_ENV_FILE="${DEPLOY_ENV_FILE:-}"

echo "🚀 Iniciando processo de deploy para Hostinger ($VPS_IP)..."

# 1. Build do projeto
echo "📦 1. Compilando o Frontend/Backend (Next.js Standalone)..."
npm run build
npm run verify:standalone

# 2. Preparando diretório na VPS
echo "🛠️ 2. Criando diretório na VPS caso não exista..."
ssh "$VPS_USER@$VPS_IP" "mkdir -p '$DEST_DIR'"

# 3. Sync dos arquivos Standalone para a VPS
echo "🌐 3. Fazendo upload dos arquivos via Rsync..."
# Copiamos o miolo do servidor (standalone)
rsync -avz --delete --exclude='.tmp/' .next/standalone/ "$VPS_USER@$VPS_IP:$DEST_DIR/"
# Copiamos os assets estáticos (necessário para o standalone)
rsync -avz --delete .next/static/ "$VPS_USER@$VPS_IP:$DEST_DIR/.next/static/"
rsync -avz --delete public/ "$VPS_USER@$VPS_IP:$DEST_DIR/public/"

if [ -n "$DEPLOY_ENV_FILE" ]; then
  if [ ! -f "$DEPLOY_ENV_FILE" ]; then
    echo "❌ DEPLOY_ENV_FILE não encontrado: $DEPLOY_ENV_FILE"
    exit 1
  fi
  echo "🔐 Sincronizando ambiente explicitamente informado..."
  rsync -avz "$DEPLOY_ENV_FILE" "$VPS_USER@$VPS_IP:$DEST_DIR/.env"
else
  echo "🔐 Ambiente remoto preservado (defina DEPLOY_ENV_FILE para substituí-lo)."
fi

# 4. Restarting the App
echo "🔄 4. Reiniciando a aplicação com PM2..."
ssh "$VPS_USER@$VPS_IP" bash -s -- "$DEST_DIR" "$PORT" <<'REMOTE'
set -Eeuo pipefail

DEST_DIR="$1"
PORT="$2"
cd "$DEST_DIR"

if npx pm2 describe 'boomer-engine' >/dev/null 2>&1; then
  PORT="$PORT" npx pm2 restart 'boomer-engine' --update-env
else
  PORT="$PORT" npx pm2 start server.js --name 'boomer-engine'
fi
npx pm2 save

for attempt in 1 2 3 4 5 6 7 8 9 10; do
  status="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/" || true)"
  case "$status" in
    200|401)
      echo "✅ Health check local aprovado: HTTP $status (tentativa $attempt)."
      exit 0
      ;;
  esac
  sleep 2
done

echo "❌ Aplicação não ficou saudável na porta $PORT." >&2
npx pm2 logs 'boomer-engine' --nostream --lines 40 >&2 || true
exit 1
REMOTE

echo "✅ Deploy concluído com sucesso!"
echo "A Engine de Boomer & Kev está rodando no background da sua VPS na porta $PORT."
