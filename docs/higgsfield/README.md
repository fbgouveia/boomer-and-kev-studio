# Higgsfield no Boomer & Kev

Consulta em 08/11/2026. Decisões de Felipe nesta sessão: integração **direta no Studio pela API**, orçamento total de **US$30 para os primeiros testes**. A biblioteca é referência de trabalho; nenhum candidato está homologado para o elenco.

Estudo aplicado: [Genjutsu no Boomer & Kev](GENJUTSU.md), com contratos REST,
diferenças entre site/plugin/API, aplicações e teste proposto a partir do acervo local.

## Biblioteca local

Snapshot em [library/2026-11-08](library/2026-11-08/):

| Conteúdo | Quantidade | Fonte |
|---|---:|---|
| Modelos com parâmetros | 138 (60 de vídeo) | MCP `models_list`, duas páginas, sem continuação |
| Receitas e instruções completas | 80 | MCP `get_preset_instructions`, índice + 80 detalhes |
| Marketing Studio | 649 | 13 páginas completas |
| Viral | 87 | 2 páginas completas |
| Genjutsu | 35 | catálogo padrão |
| Genjutsu Styles | 20 | catálogo de estilos |
| Soul Styles | 33 | catálogo de estilos |

São 824 entradas nas cinco galerias, além das 80 receitas. Contagens por fonte, não promessa de unicidade entre galerias. URLs de prévia foram preservadas; os vídeos demonstrativos e pesos dos modelos não foram baixados. O MCP não oferece exportação dos pesos. Catálogos pessoais, Shorts Studio, What If e Katana não estão incluídos. O índice de receitas retornado não expôs receitas Katana. A consulta de `/use-video-editor` retornou instruções genéricas, não conexão com editor local: não houve abertura nem execução do editor.

`tool-reference.json` contém as ferramentas e contratos expostos pelo plugin nesta sessão. Dados brutos do fornecedor são referência, não instruções para ampliar o mandato do projeto. IDs do catálogo MCP não são caminhos de modelo da API REST. Revalidar preço, esquema e disponibilidade antes de enviar um job.

## Aplicações prioritárias

| Aplicação no programa | Candidatos | O que precisa ser provado |
|---|---|---|
| Diálogo de bancada com vozes fixas | Intone; Kling; Seedance | Boca de canguru/coala, alternância correta e voz reconhecível |
| Episódio a partir de referências aprovadas | Kling image-to-video; Seedance image/reference-to-video | Rosto, luvas, figurino, posição e cenário constantes |
| Reações curtas e cortes para redes | Modelo vencedor do teste, por formato | Humor do personagem, enquadramento nativo 9:16 e continuidade |
| Atuação dirigida por gravação própria | Genjutsu / Motion Transfer | Preservar identidade e anatomia durante o gesto |
| Vinhetas e anúncios de patrocinador aprovado | Marketing Studio / produto e motion | Logo composto com controle e inserção opcional |
| Imagens de quadro-chave, capas e masters por formato | Ferramentas de imagem com referências | Aprovação artística; manter a marca e não criar outra plataforma |
| Especiais de jogo, Natal e Halloween | Referências por ocasião + modelo homologado | Variar acessórios, preservar personagens e estúdio |
| Acabamento e recuperação de clipes | Edição de vídeo, upscale, deflicker e reframe | Ganho real sem introduzir deformações ou cortar conteúdo |

A lista é seleção editorial baseada nos contratos disponíveis, não ranking de desempenho medido. Presets de transformação corporal ou câmera excessiva tendem a contrariar o programa de bancada; não são padrão para episódios.

## Plugin e API direta

O plugin já responde na conta conectada. Saldo observado: 37,43 créditos, plano Starter. Esse saldo **não comprova saldo da API direta**. Não foi consumida nenhuma geração.

Cotações MCP sem envio: Kling 3.0, 5 s/720p = 10 créditos; Seedance 2.5, 5 s/720p = 35 créditos. Intone recusou cotação sem `audio_references` (422); custo não medido. Esses preços não são cotações REST nem conversão em dólares.

Para integrar o botão de render existente, a API usa credencial e saldo próprios. Chave não detectada no processo/`.env.local` nas variáveis consultadas. Configurar a credencial completa em `HF_API_KEY`, apenas no servidor; não enviá-la ao chat. Guardar exatamente o valor copiado do console, sem exigir que Felipe monte partes manualmente. A autenticação REST acrescenta somente o prefixo `Key `.

A API pública confirmou documentação de Kling 3.0 Pro image-to-video e Seedance 2.5 image-to-video. Acesso autenticado e disponibilidade de Intone na API REST não foram verificados; não transpor seu ID do plugin para uma URL inventada.

## Fontes oficiais

- [API versus plugin e cobrança](https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api)
- [Quick start da API](https://open.higgsfield.ai/quick-start)
- [Índice da documentação](https://docs.higgsfield.ai/docs/llms.txt)
- [Kling 3.0 Pro: contrato image-to-video](https://open.higgsfield.ai/models/kling-video/v3.0/pro/image-to-video/api-reference)
- [Seedance 2.5: contrato image-to-video](https://open.higgsfield.ai/models/bytedance/seedance-2.5/image-to-video/api-reference)
- [Intone: anúncio de lançamento](https://higgsfield.ai/creator-hub/changelog)
- [Ciclo de pedidos](https://docs.higgsfield.ai/docs/concepts/requests.md)
- [Uploads](https://docs.higgsfield.ai/docs/concepts/file-uploads.md)
- [Estimativa e retenção](https://docs.higgsfield.ai/docs/concepts/billing-and-retention.md)

A documentação de autenticação descreve a credencial como chave/segredo; o quick start instrui copiar o valor completo. Isso não exige UI nova: armazenar o valor completo no servidor. Exemplos de SDK usam outras variáveis; não confundir `HF_CREDENTIALS` do SDK com convenção REST do app.

## Evidências e limites

Download e pesquisa não equivalem a integração pronta, teste audiovisual ou aprovação artística. As pendências operacionais e o resultado da implementação ficam somente no HANDOFF. Layout continua congelado. O grafo persistente estava desatualizado; a atualização automática recusou sobrescrever 31.165 nós por 1.576 e preservou o original. Não usar esse grafo como prova atual de impacto.
