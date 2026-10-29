# POP — Supervisor de qualidade por cena (QC)

Status: **plano, 27/10/2026. Nada implementado.**
Pergunta que responde (Felipe): "com o Kling, a voz e a consistência dos dois se mantêm?"
Se o QC mostrar que sim, fica o Kling. Se não, mostra em quantas cenas e por quê.

## Onde roda

`processPipeline` (`src/app/api/pipeline/run/route.ts`), depois do mux de cada cena
e antes da montagem. Cena reprovada nunca entra na montagem sem passar pelas regras abaixo.

## Três checagens

| # | Checagem | Ferramenta | Custo | Estado |
|---|---|---|---|---|
| 1 | **Fala**: texto falado = roteiro; palavras trocadas ou sensíveis | Transcrição local (faster-whisper `small`, já instalado e com o modelo no cache) | US$0 | **Provado em 27/10** nos 4 clipes do ep. `c05a674c` |
| 2 | **Imagem**: personagem = master (rosto, pelagem, figurino, acessórios); sem roupa nova, personagem extra, marca real ou texto embaralhado | Claude com visão (Sonnet 5, pelo roteador de modelos): 4 quadros da cena + master do personagem | centavos por cena (medir na primeira execução) | Plano |
| 3 | **Voz**: assinatura vocal próxima da referência aprovada | Embedding de locutor | US$0 local | **Adiado**: exige dependência nova; decidir após a calibração com o ouvido do Felipe |

## Esquema de dados (gravado no job, por cena)

```json
{
  "sceneId": "scene-…",
  "qc": {
    "speech": {
      "status": "PASS | FLAG | FAIL",
      "transcript": "texto transcrito",
      "words": [{ "w": "Crikey", "start": 0.0, "end": 0.4 }],
      "diffs": ["petrol → pectoral"],
      "sensitive": ["pricks"]
    },
    "visual": {
      "status": "PASS | FLAG | FAIL",
      "issues": [{ "kind": "wardrobe_added | identity_drift | extra_character | real_brand | garbled_text | camera_cut", "detail": "gravata-borboleta azul surge em ~5s" }]
    },
    "verdict": "PASS | NEEDS_REVIEW | RERENDERED",
    "attempts": 1
  }
}
```

## Regras de decisão

- **FAIL de fala** (fala faltando ou cortada) ou **FAIL visual** (roupa nova, personagem extra,
  rosto diferente): refaz a cena **uma vez**, se o orçamento do episódio permitir.
  A segunda falha marca `NEEDS_REVIEW`; nunca há laço infinito de gasto.
- **FLAG** (palavra trocada, palavra sensível, marca no fundo): não refaz; marca
  `NEEDS_REVIEW` e mostra na tela o trecho e o motivo. Felipe decide.
- Episódio com qualquer `NEEDS_REVIEW` é montado, mas fica **bloqueado para publicação**
  até aprovação humana.
- Teto de refações por episódio: definir com Felipe (proposta: no máximo 1 cena refeita
  por episódio de 4 cenas).
- QC indisponível (modelo fora do ar): episódio vira `NEEDS_REVIEW` com aviso,
  nunca é aprovado em silêncio.

## Efeitos colaterais desejados

- As legendas passam a usar `words[].start/end`: sincronia real (resolve o item 3 do plano).
- Duração real da fala por cena, que melhora a escolha entre clipe de 5 s e de 10 s.

## Calibração (antes de confiar no QC)

1. Material: 8 clipes salvos em `review_frames/qc-calibracao-20261027/`
   (2 episódios, 9:16 e 16:9; inclui a gravata do Kev na cena 2).
2. Felipe ouve e vê os 8 e marca: voz certa? fala correta? personagem consistente?
3. O QC roda nos mesmos 8. Critério: o QC reprova tudo o que Felipe reprovou
   (a gravata do Kev precisa reprovar nos dois formatos).
4. Só então o QC passa a decidir refações sozinho.

## Fora do escopo

- Corrigir a causa da gravata do Kev: item 2 do plano de correções. O QC detecta;
  a correção do prompt é separada.
- Sincronia labial medida por máquina: avaliação humana até haver ferramenta validada.
