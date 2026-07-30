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
ROLLBACK_DIR="${ROLLBACK_DIR:-${DEST_DIR}.rollback}"

if [ -n "$DEPLOY_ENV_FILE" ] && [ ! -f "$DEPLOY_ENV_FILE" ]; then
  echo "❌ DEPLOY_ENV_FILE não encontrado: $DEPLOY_ENV_FILE"
  exit 1
fi

echo "🚀 Iniciando processo de deploy para Hostinger ($VPS_IP)..."

# 1. Build do projeto
echo "📦 1. Compilando o Frontend/Backend (Next.js Standalone)..."
npm run build
npm run verify:standalone

# 2. Preparando diretório na VPS
echo "🛠️ 2. Preparando destino e backup da versão atual..."
ssh "$VPS_USER@$VPS_IP" bash -s -- "$DEST_DIR" "$ROLLBACK_DIR" <<'REMOTE'
set -Eeuo pipefail
DEST_DIR="$1"
ROLLBACK_DIR="$2"
mkdir -p "$DEST_DIR"
if [ -f "$DEST_DIR/server.js" ]; then
  mkdir -p "$ROLLBACK_DIR"
  rsync -a --delete --exclude='.tmp/' "$DEST_DIR/" "$ROLLBACK_DIR/"
  echo "✅ Backup pré-deploy preparado em $ROLLBACK_DIR."
else
  echo "ℹ️ Sem versão anterior para backup."
fi
REMOTE

# 3. Sync dos arquivos Standalone para a VPS
echo "🌐 3. Fazendo upload dos arquivos via Rsync..."
# Copiamos o miolo do servidor (standalone)
# --exclude='.env': o standalone do Next nao contem .env, entao o --delete apagava o env de
# PRODUCAO e, com DEPLOY_ENV_FILE vazio (padrao), nada era enviado no lugar -> app subia sem
# nenhuma variavel e morria no health check. Medido em 30/07; o rollback salvou o site.
rsync -avz --delete --exclude='.tmp/' --exclude='.env' .next/standalone/ "$VPS_USER@$VPS_IP:$DEST_DIR/"
# Copiamos os assets estáticos (necessário para o standalone)
rsync -avz --delete .next/static/ "$VPS_USER@$VPS_IP:$DEST_DIR/.next/static/"
rsync -avz --delete public/ "$VPS_USER@$VPS_IP:$DEST_DIR/public/"

if [ -n "$DEPLOY_ENV_FILE" ]; then
  echo "🔐 Sincronizando ambiente explicitamente informado..."
  rsync -avz "$DEPLOY_ENV_FILE" "$VPS_USER@$VPS_IP:$DEST_DIR/.env"
else
  echo "🔐 Ambiente remoto preservado (defina DEPLOY_ENV_FILE para substituí-lo)."
fi

# 4. Restarting the App
echo "🔄 4. Reiniciando a aplicação com PM2..."
ssh "$VPS_USER@$VPS_IP" bash -s -- "$DEST_DIR" "$PORT" "$ROLLBACK_DIR" < tools/deploy-remote.sh

echo "✅ Deploy concluído com sucesso!"
echo "A Engine de Boomer & Kev está rodando no background da sua VPS na porta $PORT."
