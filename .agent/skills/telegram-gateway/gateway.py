import logging
import os
import sys
import subprocess
import asyncio
from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler, MessageHandler, filters
from lorena_ai import LorenaConsciousness
from lorena_shield import LorenaShield
from database_manager import ImperialDatabase
from credentials_vault import load_vault

# 🔱 TELEGRAM SOVEREIGN GATEWAY v1.0
# Parte da arquitetura OpenClaw para controle remoto do Windows.

logger = logging.getLogger("TelegramGateway")

class TelegramGateway:
    def __init__(self):
        self.vault = load_vault()
        if not self.vault:
            logger.critical("❌ VAULT NÃO ENCONTRADO!")
            sys.exit(1)
            
        self.token = self.vault.get("TELEGRAM_TOKEN")
        self.founder_id = int(self.vault.get("FOUNDER_ID", 0))
        self.brain = LorenaConsciousness()
        self.shield = LorenaShield()
        
    async def start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Boas-vindas soberanas."""
        user = update.effective_user
        ImperialDatabase.register_subject(user.id, user.username, user.first_name)
        await update.message.reply_text(
            f"👑 **Gateway Soberano Ativo.**\n\nBem-vindo ao centro de comando, {user.first_name}.",
            parse_mode='Markdown'
        )

    async def handle_exec(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Executa comandos no Windows (Apenas Fundador)."""
        if update.effective_user.id != self.founder_id:
            await update.message.reply_text("⛔ **Acesso Negado.**")
            return

        command = " ".join(context.args)
        if not command:
            await update.message.reply_text("⚠️ **Uso:** `/exec <comando>`")
            return

        try:
            # Executa no PowerShell e captura saída
            result = subprocess.run(["powershell", "-Command", command], capture_output=True, text=True, timeout=30)
            output = result.stdout if result.stdout else result.stderr
            if not output:
                output = "✅ Comando executado sem retorno."
            
            # Limitar tamanho da resposta do Telegram (4096 chars)
            if len(output) > 4000:
                output = output[:4000] + "\n... (truncado)"
                
            await update.message.reply_text(f"💻 **Output:**\n```\n{output}\n```", parse_mode='Markdown')
        except Exception as e:
            await update.message.reply_text(f"❌ **Erro:** {e}")

    async def handle_status(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Relatório de saúde do hardware."""
        drive_d = "D:\\"
        free_gb = 0
        if os.path.exists(drive_d):
            import shutil
            total, used, free = shutil.disk_usage(drive_d)
            free_gb = free // (2**30)

        status_msg = (
            f"📊 **DIAGNÓSTICO DE HARDWARE**\n"
            f"📂 Drive D (Sanctum): {free_gb} GB Livres\n"
            f"🤖 Status Consciência: ON\n"
            f"⚡ Gateway: OpenClaw v1.0"
        )
        await update.message.reply_text(status_msg, parse_mode='Markdown')

    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Processa mensagens via Consciência LLM."""
        text = update.message.text
        # Revelar se estiver protegido pelo Shield
        clear_text = self.shield.reveal(text)
        
        await update.message.reply_chat_action(action="typing")
        response = self.brain.think(clear_text)
        
        ImperialDatabase.log_thought(update.effective_user.id, clear_text, response)
        await update.message.reply_text(response, parse_mode='Markdown')

    def run(self):
        """Inicia o polling do Telegram."""
        application = ApplicationBuilder().token(self.token).build()
        
        application.add_handler(CommandHandler("start", self.start))
        application.add_handler(CommandHandler("exec", self.handle_exec))
        application.add_handler(CommandHandler("status", self.handle_status))
        application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.handle_message))
        
        logger.info("🚀 Telegram Gateway (OpenClaw) iniciado...")
        application.run_polling()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    gateway = TelegramGateway()
    gateway.run()
