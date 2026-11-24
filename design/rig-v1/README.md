# Rig v1 — estúdio 3D de podcast (DNA de câmeras)

Cenário **só de cenário** (sem personagens) feito 100% por script no Blender 5.2.3, sem assets de terceiros, sem IA, sem custo. Serve de "gabarito" de câmeras/luz/telas: os personagens virão de IA usando estes plates. Primeira passada de look — **aguarda aprovação do Felipe**.

## Reconstruir
```sh
blender -b --python tools/rig/build_studio.py     # ~2 min: .blend, 42 plates, rig.json (EEVEE)
python3 tools/rig/composite_sponsor.py            # 14 composições em composite/ (precisa ffmpeg)
```
Idempotente (parte de cena vazia). `-- --no-render` só gera .blend e rig.json (sem visibilidade/oclusão).

## Câmeras (sensor 36 mm, locked-off, eye level 1,3 m)
| Câmera | 16:9 | 9:16 nativo (câmera `_V`) | Uso |
|---|---|---|---|
| CAM_WIDE | 28 mm | 35 mm, recuo menor, ambos de frente | W2, hook/payoff |
| CAM_MCU_L / CAM_MCU_R | 50 mm | 50 mm, mais perto | MCU Boomer / Kev |
| CAM_CU_L / CAM_CU_R | 85 mm | 85 mm | CU Boomer / Kev |
| CAM_TV_INSERT | 85 mm frontal na TV_C | 85 mm frontal na TV_L | INS neutro |
| CAM_LOW_L | 35 mm baixo | 35 mm baixo | hero low angle Boomer |

Sem OTS. Boomer câmera-esquerda (−X), Kev câmera-direita (+X), corpos girados ~20° para dentro.

## Plates (`plates/`)
`<cam>_<16x9|9x16>_clean.png` (telas cinza 50%), `_green.png` (telas #00FF00 puro, conferido), `_mask.png` (branco = tela visível, preto = resto, já com oclusão por mannequins/mics).

## Composição
`rig.json` traz, por câmera e tela, `corners_px` (TL,TR,BR,BL, projeção exata dos 4 cantos 3D com `world_to_camera_view`), `visible`, `occluded_fraction`. O script usa ffmpeg `perspective` para deformar o criativo nos cantos e `maskedmerge` com a máscara, então só pinta onde a tela está visível. Criativos de teste: `sponsor_placeholder.png` (9:16, TVs laterais), `sponsor_placeholder_16x9.png` (TV central). Para a produção real: trocar esses PNGs, ou usar o plate `_green` com chroma key.

## Limitações
- Mannequins são placeholders genéricos (elipsoides): só servem para julgar enquadramento/oclusão.
- Look é primeira passada: espuma é grade de cubos chapados, luz 5600K aproximada por cor RGB, sem teste de QA R18.
- Sem variante "logo" na TV_C (opcional, não feito). Nenhum texto legível no cenário.
- Câmeras CAM_LOW_L e 9:16 de topo mostram muito teto/mesa; ajuste de composição pendente.
- Plates têm bordas anti-aliased; mask não é binária nas bordas.
