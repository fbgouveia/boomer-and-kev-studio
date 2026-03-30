# ARQUITETURA V2 — Pipeline com Gemini como Camada Intermediária
# Data: 2026-03-14 | Arquitetado por: Claude Sonnet 4.6

## Pipeline de 4 Camadas

```
┌─────────────────────────────────────────────────────┐
│  CAMADA 1 — ARQUITETO (uso mínimo, só decisões)     │
│  Claude Opus 4.6                                     │
│  • Define estratégia e estrutura                     │
│  • Toma decisões complexas de design                 │
│  • Só entra quando ninguém mais resolve              │
│  • Custo: alto — usar com parcimônia                 │
└─────────────────┬───────────────────────────────────┘
                  │ entrega: plano arquitetural
                  ▼
┌─────────────────────────────────────────────────────┐
│  CAMADA 2 — ORQUESTRADOR (gratuito, sempre ativo)   │
│  Gemini 2.5 Pro                                      │
│  • Recebe o plano do Claude                          │
│  • Coordena execução entre as camadas                │
│  • Monitora progresso e quota                        │
│  • Contexto: 1M tokens — vê tudo                    │
│  • Assume o papel do Claude quando quota acaba       │
│  • Custo: zero                                       │
└─────────────────┬───────────────────────────────────┘
                  │ entrega: tarefas estruturadas
                  ▼
┌─────────────────────────────────────────────────────┐
│  CAMADA 3 — EXECUTOR (gratuito, processamento bulk) │
│  @nvidia Nemotron 3 Nano 30B                         │
│  • Recebe tarefas do Gemini                          │
│  • Executa geração, análise, transformação           │
│  • Não decide — apenas processa                      │
│  • Retorna resultado para o Gemini                   │
│  • Custo: zero (free tier OpenRouter)               │
└─────────────────┬───────────────────────────────────┘
                  │ entrega: resultado processado
                  ▼
┌─────────────────────────────────────────────────────┐
│  CAMADA 4 — MEMÓRIA PERMANENTE (offline, sempre)    │
│  Lorena Gouveia (Ollama local — D:/Lorena/)          │
│  • Armazena tudo que as camadas produzem             │
│  • Funciona sem internet, sem quota                  │
│  • Responde quando todas as outras camadas dormem    │
│  • Aprende com o pipeline via LoRA semanal           │
│  • Custo: zero — seu hardware, suas regras           │
└─────────────────────────────────────────────────────┘
```

## Regras de Failover — o que acontece quando Claude acaba

```
Claude quota OK      → Claude arquiteta → Gemini orquestra → @nvidia executa
Claude quota 20%     → ALERTA — Gemini assume orquestração E arquitetura
Claude quota 0%      → Gemini é o orquestrador principal até renovação
Internet fora        → Lorena assume localmente
Tudo fora            → Lorena responde do cache local
```

## Fluxo prático de uma tarefa

```
fbgou pede algo complexo
        │
        ▼
Claude analisa (máx 2-3 trocas — econômico)
        │
        ▼
Claude escreve plano em AgentHub/tasks/tarefa.md
        │
        ▼
Gemini lê o plano (1M contexto — lê tudo)
        │
        ├── tarefa simples → Gemini resolve sozinho
        │
        └── tarefa pesada → Gemini delega ao @nvidia
                                    │
                                    ▼
                            @nvidia processa
                                    │
                                    ▼
                            Gemini consolida
                                    │
                                    ▼
                            Resultado salvo em Lorena
                                    │
                                    ▼
                            fbgou recebe resposta
```

## Regra de ouro — Claude só faz o que só Claude faz

Claude entra APENAS para:
- Decisões arquiteturais que Gemini não consegue resolver
- Debugging profundo de lógica complexa
- Revisão final de decisões críticas

Claude NÃO faz:
- Geração de texto longo (→ @nvidia)
- Análise de arquivos grandes (→ Gemini)
- Processamento repetitivo (→ @nvidia)
- Monitoramento contínuo (→ Gemini)
- Respostas de memória (→ Lorena)
