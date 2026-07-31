# Constituição de Edição e Retenção

Fonte adaptada: `Ebook - Entenda a Estrutura e Como editar Vídeos Virais.pdf`.

Este documento internaliza os princípios úteis do material sem transformar
heurísticas de marketing em fatos ou regras rígidas. A identidade cômica de
Boomer & Kev prevalece: contraste de energia, pausa e deadpan também produzem
retenção.

## Princípios duráveis

1. O vídeo começa no conflito, surpresa ou pergunta; nunca com saudação ou
   vinheta.
2. Cada episódio tem uma promessa clara, desenvolvimento, pico e payoff.
3. Mudanças de plano, emoção, ritmo ou áudio devem servir à narrativa. Não
   existe quota obrigatória de efeitos ou cortes.
4. Boomer cria energia; Kev cria contraste. Uma pausa seca do Kev pode ser um
   pattern interrupt mais forte que zoom, meme ou transição.
5. Música permanece abaixo da voz e sofre ducking. Silêncio, rufo, risada e
   impactos entram em beats identificáveis do roteiro, não em percentuais
   arbitrários da duração.
6. Cortes secos são o padrão para energia e comédia. Transições visíveis
   marcam mudança de bloco; não decoram toda troca de cena.
7. O final entrega o payoff e encerra sem despedida longa, favorecendo replay
   no formato curto.
8. A exportação só é aprovada depois de assistir ao arquivo completo e
   conferir diálogo, cortes, enquadramento e mix.

## Estrutura adaptada de oito cenas

| Cenas | Beat | Objetivo editorial |
|---|---|---|
| 1 | Gancho | Parar o scroll com conflito ou curiosidade imediata |
| 2 | Setup/open loop | Explicar por que vale continuar |
| 3 | Desenvolvimento | Primeira resposta e mudança de energia |
| 4–5 | Escalada/sponsor break | Desvio cômico deliberado e micro-payoff |
| 6–7 | Clímax | Retorno ao tema com maior contraste |
| 8 | Payoff/loop | Fechar a promessa e cortar sem cauda |

## Heurísticas, não fatos

Os números do ebook — como atenção em 8 segundos, cortes a cada 2–4 segundos,
85% sem som e percentuais atribuídos ao áudio — não têm fonte apresentada.
Eles podem originar hipóteses de teste, mas não entram como alegações do
produto nem como gates universais.

## Aplicação no Studio

- O roteiro expressa os beats usando `shotType`, `emotion`, `action` e posição
  da cena.
- `src/lib/editing-policy.ts` converte esses campos em plano determinístico.
- O pipeline usa o plano para transições e para posicionar rufo/risada nos
  beats narrativos.
- Captions, B-roll e publicação continuam pendentes; documentação não deve
  descrevê-los como recursos construídos.
