# Genjutsu aplicado ao Boomer & Kev

Pesquisa em 08/11/2026. Escopo: adquirir conhecimento e orientar a integração Higgsfield já autorizada. Nenhuma geração Genjutsu foi executada. As aplicações abaixo são propostas, sem homologação de qualidade com animais.

## Conclusão de trabalho

O melhor primeiro uso é testar uma correção pequena em um take que já funciona. Depois, testar transferência de atuação para formar uma biblioteca própria de gestos. A aprovação exige comparar fonte, resultado e master, incluindo voz e boca; promessa de preservação do fornecedor não é prova de fidelidade.

| Recurso documentado | Aplicação proposta no programa | Prova necessária |
|---|---|---|
| Object Swap: substitui um elemento do vídeo guiado por imagens | Corrigir acessório/figurino indevido, limpar um adereço ou preparar uma ocasião | Rosto, corpo, luvas, luz e cenário continuam reconhecíveis |
| Motion Transfer: usa a movimentação de um vídeo para reconstruir a cena | Encenação dirigida de Boomer e Kev a partir de takes próprios | Gestos legíveis, câmera estável e anatomia animal sem deformação |
| Restyle: transforma o tratamento visual do vídeo | Um especial ou vinheta com direção artística aprovada | A mudança preserva a marca e não vira uma nova identidade padrão |
| Light/Lite: variantes mais econômicas, com limites próprios | Comparar uma correção curta com a versão completa | Economia por resultado aprovado, sem presumir qualidade igual |

Os dois modos principais e seu uso estão no [guia oficial](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-genjutsu). A proposta de aplicação é nossa: o guia não comprova que a gravata de Kev ou a corrente de Boomer serão removidas com fidelidade.

## Exemplo local real

Arquivo preservado: `public/latest_episode.mp4`. ffprobe mediu **12,3 s, 1080×1920**, com faixas de vídeo e áudio. A inspeção de quadros mostrou Boomer com corrente dourada, contrária à ficha atual sem corrente, e Kev com folha/microfone. A master `public/assets/master_boomer.png` foi conferida e também não mostra corrente. Não houve nova avaliação auditiva.

Esse material pode servir de candidato a teste de Object Swap para retirar a corrente mantendo o personagem. É um caso delimitado, verificável. Não usar o arquivo como master aprovado nem alterar o original. Foram extraídos somente quadros temporários para inspeção, fora das mídias do projeto.

## Biblioteca de atuação proposta

Criar takes próprios e aprovados por personagem:

- Boomer: inclinação sobre a bancada, reação expansiva, pausa indignada, uma luva batendo na bancada.
- Kev: olhar lateral, pausa seca, pequena inclinação de cabeça, reação contida.
- Começar em planos individuais; a dupla exige prova adicional de associação correta entre referências e personagens.
- Gravar/gerar a fala adequada no take de origem. Transferência visual não é aprovação de timbre, pronúncia ou sincronismo labial.
- Fonte com cortes, movimento de câmera indesejado ou gesto inadequado precisa ser revista antes do uso como referência.
- Preparar fontes separadas para 16:9 e 9:16. O enquadramento deve nascer adequado ao destino.

Isso reduz decisões aleatórias da encenação, caso a repetibilidade seja comprovada. É hipótese a testar, não economia ou desempenho já medido.

## Posição proposta no pipeline

Roteiro e áudio aprovados → clipe-base → edição Genjutsu quando indicada →
conferência de identidade/atuação/áudio → montagem → legendas e gráficos finais.

Aplicar as transformações antes de compor palavras e logos finais evita expor
essas letras a uma nova geração visual. Se duração/FPS mudarem, recalcular os
tempos da montagem e das legendas a partir da saída medida. Preservar o original
permite comparar e rejeitar a transformação. Essa ordem é proposta de engenharia,
não resultado de teste Genjutsu já executado no projeto.

## Contratos REST confirmados

Fontes: [Motion Transfer](https://docs.higgsfield.ai/docs/models/genjutsu/motion-transfer.md), [Object Swap](https://docs.higgsfield.ai/docs/models/genjutsu/object-swap.md).

| Operação | Caminho canônico | Entradas |
|---|---|---|
| Motion Transfer | `higgsfield/genjutsu/motion-transfer/v1.0` | vídeo + 1–8 imagens |
| Object Swap | `higgsfield/genjutsu/object-swap/v1.0` | vídeo + 1–8 imagens |
| Restyle | `higgsfield/genjutsu/restyle/v1.0` | vídeo + preset atual; 0–5 imagens opcionais |
| Light Motion Transfer | `higgsfield/genjutsu-light/motion-transfer/v1.0` | confirmar esquema próprio; fonte limitada aos primeiros 15 s |

Nos dois modos principais, o vídeo precisa ter pelo menos 4 s; acima de 30 s é cortado. Object Swap exige pelo menos **409.600 pixels por quadro**. Aceitam prompt opcional e resolução 480p/720p/1080p. O fluxo é assíncrono: guardar request_id e acompanhar status_url. O caminho legado `higgsfiled/...` ainda aparece num exemplo do Playground; a documentação instrui novas integrações a usar `higgsfield/...`.

Não transportar limites do site para a API: o material comercial menciona 30 ou 40 imagens, enquanto os esquemas REST consultados limitam os dois modos a 8. No plugin, modelos diretos têm IDs `hf_mult_motion_control`, `hf_mult_replace_object` e respectivas variantes `_flash`; eles não são os caminhos REST.

## Restyle exige tratamento separado

A [referência REST de Restyle](https://open.higgsfield.ai/models/higgsfield/genjutsu/restyle/v1.0/api-reference) exige preset_id UUID obtido de `GET /models/higgsfield/genjutsu/restyle/v1.0/presets`. Não usar nome ou imagem de prévia como ID.

O áudio de origem é mantido. Não há controle de trilha nova, duração ou aspect_ratio nesse contrato. O arquivo deve ser baixável sem cookies, ter no mínimo 4 s e até 200 MiB. O enquadramento vem da fonte, e duração/FPS exatos podem variar. Não há mapeamento explícito referência→personagem para múltiplos personagens. O catálogo REST não aceita estilo pessoal/customizado nesse campo, apesar de outros fluxos do site mencionarem referências de estilo.

Portanto, Restyle não resolve sozinho voz fixa, legenda sincronizada ou a necessidade de vídeo nativo em outro formato.

## Complementos úteis do Higgsfield

[Cinema Studio](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-cinema-studio) oferece controle de câmera, iluminação e referências, além de Elements para reutilizar personagens, cenários e objetos. Pode ajudar a produzir o take inicial adequado. Isso continua exigindo teste e aprovação; não recriar o Studio em outra plataforma.

[O catálogo oficial de ferramentas](https://higgsfield.ai/enterprise-help-center/platform/ai-models) inclui Intone e ferramentas de voz/lipsync. Intone é candidato para fala guiada por áudio; a compatibilidade com bocas de canguru e coala ainda não foi medida. Upscale/deflicker ficam para acabamento após aprovar identidade e atuação. Para palavras e logos exatos nas TVs, usar composição controlada no acabamento.

## Comparação mínima antes de adotar

1. Selecionar fonte curta com apenas um problema e master já aprovada.
2. Cotar o mesmo trecho no Object Swap completo e Light, com referências reais.
3. Comparar lado a lado: alvo corrigido, rosto/corpo preservados, cenário, áudio, boca e texto novo.
4. Testar Motion Transfer em outro take próprio; começar com um personagem.
5. Registrar custo real por resultado aprovado e tentativas que falharam.
6. Adotar somente o caminho que passar. Não enviar automaticamente todas as cenas a uma segunda geração: cada transformação pode adicionar custo e deriva.

Usar o teto já autorizado de **US$30 acumulados** para os primeiros testes. Preço numérico Genjutsu da nossa conta ainda não foi cotado com mídias preparadas. Valores de blog, créditos MCP e valores REST não são intercambiáveis. Light tem regra de cobrança que considera duração de saída e de vídeos de referência; não calcular apenas a duração de saída.

## Custo de Restyle: referência de planejamento

A [documentação REST de Restyle](https://open.higgsfield.ai/models/higgsfield/genjutsu/restyle/v1.0/api-reference) informa tarifas aproximadas por segundo de vídeo-fonte: **US$0,318 em 480p, US$0,681 em 720p e US$1,632 em 1080p**. A duração é arredondada para cima em segundos inteiros após o corte a 30 s.

Com essa tabela, uma fonte de 5 s daria aproximadamente US$3,405 em 720p; nosso clipe de 12,3 s seria contado como 13 s, aproximadamente US$8,853 em 720p ou US$21,216 em 1080p. Esses cálculos são exemplos para Restyle, sem cotação autenticada da conta, e não se aplicam automaticamente a Object Swap, Motion Transfer ou Lite. Uma comparação inicial curta permite reservar parte dos US$30 para novas tentativas.

## Estado da implementação

O usuário pediu prosseguir com a integração direta antes deste aprofundamento. O estudo refina esse trabalho; não o cancela. Primeiro entregar o render pelo provedor Higgsfield e sua recuperação/custo. A edição Genjutsu é uma etapa distinta, com vídeo de entrada e comparação explícita, a integrar depois da prova visual. Pendências e resultados de execução vivem somente no HANDOFF.
