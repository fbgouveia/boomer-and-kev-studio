# Integração direta Higgsfield — contrato para execução

Status: especificação em 08/11/2026. Felipe escolheu API direta no Studio e teto total de US$30 para os testes. Não autoriza publicação, assinatura nova nem compra de créditos. Preservar layout, mídias e alterações preexistentes.

## Visão e fonte de verdade

O mesmo botão de render do Studio envia as cenas ao backend existente. O backend escolhe o provedor pela configuração do servidor. O roteiro e a identidade continuam pertencendo ao Studio. A biblioteca em `docs/higgsfield/` orienta modelos, mas não decide aprovação artística. HANDOFF é a única continuidade operacional.

## Conectividade e credencial

REST em `https://api.higgsfield.ai`. `HF_API_KEY` contém o valor completo copiado do console; enviar `Authorization: Key <valor-completo>`. Nunca no browser, logs ou respostas. Ausência de credencial é erro de configuração; não simular sucesso nem gastar no Replicate como fallback.

Credencial configurada e autenticação aceita por consulta de estimativa (HTTP 200).
Saldo suficiente para geração ainda não foi comprovado. A conexão do plugin não
comprova saldo da API. Nenhuma operação paga nos testes automatizados.

Cotação autenticada de 08/11/2026: Kling 3.0 Pro image-to-video, 5 s, sound=on,
cfg_scale=0.5, multi_shots=false retornou type=estimate, usd="0.714". Foi consulta
de preço, sem upload nem geração, usando a URL de exemplo do contrato; não é
validação de mídias nem cotação reaproveitável para todo episódio.
Respostas como a do Seedance 2.5, com type/pricing_description sem usd, não
autorizam geração automática: retornar custo desconhecido e bloquear gasto.

## Contratos do provedor

- Kling 3.0 Pro: `kling-video/v3.0/pro/image-to-video`. `image_url` obrigatório; `prompt` opcional; `duration` inteiro 3–15; `sound` on/off; `cfg_scale` 0–1; `multi_shots=false` para câmera/cena controlada. A proporção vem da imagem de entrada apropriada.
- Seedance 2.5: `bytedance/seedance-2.5/image-to-video`. `image_url` obrigatório; duração 4–30; resolução 480p/720p/1080p; `generate_audio` booleano; `end_image_url` opcional; saída mp4/mov. Não adicionar parâmetros do catálogo MCP que não constam no contrato REST.
- Nunca converter ID MCP em URL por suposição. Intone fica candidato até seu contrato REST ser verificado.
- Estimar antes de gerar usando `POST /estimate/<caminho-do-modelo>` com o mesmo payload. Resposta `{usd: string}`; validar como valor monetário finito, não negativo. Não usar a fórmula antiga `duração * 0.14`.
- Submeter com `Idempotency-Key` estável por cena e payload. Resposta contém `request_id`, `status_url` e `cancel_url`.
- Persistir o identificador assim que aceito, antes de esperar o resultado. Status: queued/in_progress; terminais completed/failed/nsfw/canceled. Em completed, usar `video.url`.
- Polling com prazo e backoff; nunca encaminhar Authorization para origem arbitrária vinda do provedor. Validar URLs autenticadas contra a origem oficial.
- Após timeout ambíguo de POST, reusar a mesma chave e payload. Nunca gerar outro pedido pago para obter um ID perdido.
- Cancelamento real só quando queued. Falha/NSFW e cancelamento precisam permanecer visíveis; não reclassificar como vídeo pronto.
- Copiar saída ao armazenamento do Studio; as URLs do fornecedor expiram. Reutilizar montagem, legendas e acervo existentes.

## Estado interno mínimo

Adaptar os checkpoints existentes sem criar worker/migração BK-17:

```text
provider = replicate | higgsfield
model = caminho confirmado
requestId = identificador estável
statusUrl/cancelUrl = URLs verificadas
idempotencyKey = identidade da submissão da cena
estimatedUsd = null até cotação válida
reservedUsd = valor retido, inclusive quando submissão tiver resultado desconhecido
status = queued | in_progress | completed | failed | nsfw | canceled | submission_unknown
outputUrl = null até completed
```

Os dados do provedor e a configuração devem entrar no hash de retomada; não reaproveitar clipe de outro modelo silenciosamente. Checkpoints anteriores Replicate precisam continuar legíveis. A reserva de custo deve sobreviver à retomada e impedir corrida entre cenas/jobs; falha sem confirmação não libera verba por suposição.

## Portas de entrada e critérios de aceite

1. Seleção do provedor por variável do servidor, sem alterar telas/classes/CSS; manter comportamento legado sem configuração explícita.
2. Credenciais ausentes/invalidas, saldo insuficiente e parâmetros inválidos falham claramente antes de geração duplicada.
3. Estimativa autenticada de cada cena e soma da reserva respeitam os US$30 acumulados dos testes, não US$30 por job. Não confundir saldo MCP.
4. Estados de submissão/polling/retomada têm testes com transporte simulado. Cobrir timeout ambíguo, mesma chave, falha de persistência e URL externa.
5. Arquivo baixado e montagem passam pela validação existente; não presumir áudio correto só porque o clipe terminou.
6. TypeScript, unitários, lint no código tocado e testes de idempotência/reconciliação. Relatar lint global preexistente.
7. Antes de teste pago: chave e saldo verificados, referências aprovadas ou explicitamente identificadas como diagnóstico, preço real estimado e orçamento remanescente suficiente.
8. Homologação audiovisual exige Felipe ouvir e assistir; nenhuma LLM aprova identidade por ele.

## Execução governada

Codex arquiteta/lapida; GLM 5.3 Flash pago executa; Gemini 3.8 Flash verifica em linhagem diferente. Provedor e runtime devem comprovar contexto >=1.000.000 antes do despacho. O catálogo OpenRouter e o cache OpenCode consultados indicaram 1.048.576 para o executor canônico, sem despacho de código nesta etapa de especificação.

Fontes e snapshots: `docs/higgsfield/README.md`. Não instalar outro Studio nem importar template de layout. Recurso nativo de HTTP antes de acrescentar SDK.
