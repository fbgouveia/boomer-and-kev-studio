# Cópia versionada do painel de revisão

Fonte produzida no Open Design, com Local Codex, em 27/10/2026.
O projeto original permanece no Open Design. Esta cópia guarda HTML, CSS e
JavaScript e referencia as mídias existentes; não duplica nem move os originais.

## Abrir

Abra index.html no navegador. Se o navegador restringir mídia em arquivos locais,
sirva a raiz completa do workspace com:

```sh
python3 -m http.server 8017 --bind 127.0.0.1
```

Execute na pasta `PROJETO Boomer and Kev`, acima de `BOOMER AND KEV`, e abra:

http://127.0.0.1:8017/BOOMER%20AND%20KEV/boomer-and-kev-studio/docs/programa/painel-fonte/index.html

As três imagens pertencem ao aplicativo; os áudios e vídeos estão em
`review_frames/` na raiz do workspace. Um clone isolado do Git não contém essas
mídias externas. `ASSETS.json` informa caminhos e hashes para conferir a restauração.

## Diferença para o projeto Open Design

Somente os caminhos locais de mídia foram adaptados nesta cópia.
O comportamento e o desenho do painel foram preservados. A chave de decisões
é local ao navegador/origem: escolhas na prévia Open Design não migram para
esta cópia automaticamente. O JSON exportado registra as decisões daquela sessão.

README_OPEN_DESIGN.md preserva o relatório do painel original; brand-spec.md
preserva a direção visual usada para organizar a página de revisão.

A regra editorial de personalidade por bloco foi acrescentada depois à bíblia.
O painel não possui validação automática dessa regra. Ela deverá orientar a
avaliação humana de roteiro, atuação e montagem na próxima sessão.

Nenhuma voz, roupa temática ou versão final de personagem foi aprovada por esta cópia.
