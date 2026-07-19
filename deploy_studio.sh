#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# DEPLOY SCRIPT: BOOMER & KEV STUDIO -> HOSTINGER VPS (Next.js Standalone)
# ─────────────────────────────────────────────────────────────────────────────

VPS_IP="2.25.182.106"
VPS_USER="root"
DEST_DIR="/var/www/boomerandkev.fgss.io"
PORT="3001" # Porta sugerida para a Engine (a porta 3000 deve estar com outro app)

echo "🚀 Iniciando processo de deploy para Hostinger ($VPS_IP)..."

# 1. Build do projeto
echo "📦 1. Compilando o Frontend/Backend (Next.js Standalone)..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erro durante o build. Abortando deploy."
    exit 1
fi

# 2. Preparando diretório na VPS
echo "🛠️ 2. Criando diretório na VPS caso não exista..."
ssh $VPS_USER@$VPS_IP "mkdir -p $DEST_DIR"

# 3. Sync dos arquivos Standalone para a VPS
echo "🌐 3. Fazendo upload dos arquivos via Rsync..."
# Copiamos o miolo do servidor (standalone)
rsync -avz --delete .next/standalone/ $VPS_USER@$VPS_IP:$DEST_DIR/
# Copiamos os assets estáticos (necessário para o standalone)
rsync -avz --delete .next/static/ $VPS_USER@$VPS_IP:$DEST_DIR/.next/static/
rsync -avz --delete public/ $VPS_USER@$VPS_IP:$DEST_DIR/public/
# Envia o arquivo .env (CUIDADO, verifique se a VPS já possui o env de prod)
rsync -avz .env.local $VPS_USER@$VPS_IP:$DEST_DIR/.env

if [ $? -ne 0 ]; then
    echo "❌ Falha ao transferir os arquivos para a VPS."
    exit 1
fi

# 4. Restarting the App
echo "🔄 4. Reiniciando a aplicação com PM2..."
ssh $VPS_USER@$VPS_IP "
  cd $DEST_DIR
  # Reinicia o serviço usando npx pm2 para evitar problemas de PATH no SSH
  PORT=$PORT npx pm2 start server.js --name 'boomer-engine' || PORT=$PORT npx pm2 restart 'boomer-engine'
  npx pm2 save
"

echo "✅ Deploy concluído com sucesso!"
echo "A Engine de Boomer & Kev está rodando no background da sua VPS na porta $PORT."
echo "IMPORTANTE: Você precisará configurar o Nginx ou Apache na VPS para apontar boomerandkev.fgss.io para http://127.0.0.1:$PORT"
