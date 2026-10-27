# Verificação do painel audiovisual

27/10/2026. Projeto Open Design `boomer-kev-biblia-audiovisual-20261027`.
Criação por Local Codex, run `a1c25158-14b8-47c0-bf1a-d7b495371fd8`, concluída.
Após a criação, foram adicionados pelo Open Design os três trechos reais do
piloto de Kev e corrigido o README. Nenhuma mídia original foi alterada.

## Inspeção realizada

- Chrome conectado, viewport 1440 × 1000 e 390 × 844; largura do documento
  igual à do viewport nos dois tamanhos, sem overflow horizontal.
- Abertura, elenco, ocasiões, voz, storyboard, sponsor, distribuição e decisões
  conferidos por DOM e inspeção visual das seções.
- Imagens carregadas, inclusive estudos de composição que usam os masters.
- Sete mídias com metadados carregados e sem erro reportado pelo navegador:
  dois clipes nativos de aproximadamente 5,04 s; piloto de Boomer de 6,9 s;
  trechos de Kev de 1,7 s, 1,9 s e 1,97 s; régua montada de 9,73 s.
- Troca de ocasião testada em Halloween e Natal; abas indicaram o estado selecionado.
- Storyboard vertical selecionado e estado do botão 9:16 confirmado.
- Seletor visual testado com Revisar e restaurado para Sem decisão; os cinco
  eixos terminaram pendentes. Nenhum estado de aprovação foi selecionado.
- Exportar JSON mostrou o retorno da interface e criou o arquivo esperado em
  Downloads. O evento de download não retornou pelo controle do navegador;
  a conferência independente do arquivo confirmou cinco eixos com status null,
  publication false e engineChanged false.
- O override de viewport foi removido. A prévia foi mantida aberta no Chrome.
  O navegador integrado não estava disponível nesta sessão.

## Limites da evidência

Carregar mídia não homologa timbre, texto falado ou sincronismo. A escuta e a
aprovação artística pertencem à próxima revisão. Não foi feito teste físico em
telefone nem publicado conteúdo nas redes. Não foram gerados novos figurinos,
áudios ou vídeos de personagem. Os pacotes de ocasião são fichas de direção.

O parecer em REVISAO_FGSS.json verifica contrato e procedência no gate
design_review. Não concede aprovação artística nem autorização de produção.

## Acesso

Studio:
http://127.0.0.1:49476/projects/boomer-kev-biblia-audiovisual-20261027/conversations/d0c73501-59b1-4e31-ab37-673dc0d16e83/files/index.html

Prévia direta:
http://127.0.0.1:49439/api/projects/boomer-kev-biblia-audiovisual-20261027/raw/index.html

Os links dependem da sessão local do Open Design. Após reiniciar o aplicativo,
usar get_run com a run registrada para obter links atuais. O projeto é a referência durável.
