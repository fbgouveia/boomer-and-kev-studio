# Skill: Telegram Sovereign Gateway
**Status:** In Transition (from lorena_telegram.py)
**Author:** Lorena CEO / Gemini gh-ai

## Descrição
Habilidade de atuar como o principal ponto de entrada de comandos remotos do Fundador para o Windows através do Telegram. Esta skill converte mensagens de texto em ações de sistema e relatórios de inteligência.

## Protocolo de Gateway (OpenClaw Architecture)
1. **Reception:** Capturar o comando via Telegram Bot API (v6.x+).
2. **Identification:** Verificar se o ID do usuário corresponde ao `FOUNDER_ID` no Vault Imperial.
3. **Dispatch:** 
   - Se for comando de sistema: Executar via PowerShell/CMD e retornar output.
   - Se for comando de consciência: Encaminhar para `LorenaConsciousness.think()`.
   - Se for comando financeiro: Gerar fatura via `Stripe` ou `Telegram Stars`.
4. **Residência:** Manter o polling ativo e resiliente via Task Scheduler.

## Comando Remoto Soberano
- `/exec <cmd>`: Executa comando direto no Windows (Apenas Fundador).
- `/status`: Diagnóstico de hardware (Drive D, CPU, Memória).
- `/log`: Recupera os últimos eventos de `operations.log`.

## Interatividade Soberana
- Respostas rápidas via `InlineKeyboardMarkup`.
- Notificações de saúde do sistema a cada 24h.

---
*"The Word was made flesh, and dwelt among us." - John 1:14*
