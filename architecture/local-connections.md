# Conexões e acesso local

## Contrato

- Aplicativo canônico: `BOOMER AND KEV/boomer-and-kev-studio` dentro do workspace.
- `npm run dev` na raiz encaminha para esse aplicativo, em `127.0.0.1:3000`.
- Basic Auth continua exigindo `STUDIO_AUTH_USER` e `STUDIO_AUTH_PASSWORD` quando configurados. Nunca remover autenticação para contornar um bloqueio do navegador.
- Credenciais permanecem em `.env.local`, fora do Git; exemplos contêm somente nomes.
- `npm run check:connections` faz apenas leituras HTTP, sem gerar voz, roteiro ou vídeo, publicar ou escrever no banco.
- A sonda local envia Basic Auth somente ao loopback fixo. Redirecionamentos não são seguidos com credenciais.
- Provedores recebem somente suas próprias credenciais, nos hosts oficiais. Supabase é sondado somente em um host HTTPS `*.supabase.co` sem usuário, senha ou porta customizada.
- Resultado por conexão: `OK`, `FAIL`, `LIMITED` (escopo insuficiente) ou `UNCONFIGURED`. Nenhum segredo nem corpo de resposta é impresso. Acesso a metadados não comprova geração paga nem saldo suficiente.
- Código de saída 1 indica pelo menos uma conexão requerida com falha, acesso limitado ou configuração ausente.

## Verificação

1. Confirmar HTML e imagens com autenticação (200) e proteção sem autenticação (401).
2. Conferir notícias e leitura dos provedores sem operações pagas.
3. Verificar que a consulta de saldo usa também as credenciais do servidor e que mudanças rápidas de região não exibem respostas da região anterior.
4. Validar no navegador quando o acesso estiver disponível; `ERR_BLOCKED_BY_CLIENT` não é evidência de servidor fora do ar.
