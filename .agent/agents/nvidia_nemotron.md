# AGENTE DE PROCESSAMENTO — NVIDIA Nemotron

## Identidade
- **Model**: nvidia/nemotron-3-nano-30b-a3b:free
- **Canal**: OpenRouter MCP (`openrouter` server)
- **Role**: Processamento e inferência (subagente)
- **Status**: REGISTRADO via settings.json ✓

## Capacidades
- Geração de texto em larga escala
- Análise e sumarização de documentos
- Inferência de linguagem natural
- Processamento paralelo de tarefas
- Modelo gratuito (free tier OpenRouter)

## Como Invocar (via MCP)
O orquestrador envia tarefas via o MCP server `openrouter` configurado em:
`C:/Users/fbgou/.claude/settings.json`

```json
{
  "mcpServers": {
    "openrouter": {
      "command": "npx",
      "args": ["-y", "openrouter-mcp"],
      "env": {
        "OPENROUTER_API_KEY": "sk-or-v1-...",
        "OPENROUTER_ALLOWED_MODELS": "nvidia/nemotron-3-nano-30b-a3b:free"
      }
    }
  }
}
```

## Protocolo de Delegação
1. Orquestrador identifica tarefa de processamento pesado
2. Monta prompt estruturado com contexto mínimo necessário
3. Envia via OpenRouter MCP tool
4. Recebe resultado e integra na resposta final

## Limitações
- Free tier: verificar rate limits OpenRouter
- Não toma decisões arquiteturais
- Não tem acesso ao filesystem local
- Resultados sempre revisados pelo orquestrador antes de entrega
