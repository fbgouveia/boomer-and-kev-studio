# Higgsfield: candidato bloqueado na rodada 1

A revisão independente do Gemini encontrou sete achados materiais, incluindo um classificado crítico. A regra canônica do Gauntlet exige parar nesse estado. O candidato permanece fora do aplicativo; não ativar VIDEO_PROVIDER=higgsfield nem copiar o patch para a raiz. A autenticação da chave funciona, mas isso não comprova a segurança da integração nem saldo disponível.

## Reconciliação do Codex com a prova real

- Achados 1 e 2 têm a mesma causa: uma resposta 4xx à repetição do POST não prova que o primeiro POST desconhecido foi recusado. Manter a reserva e a mesma chave; NÃO apagar o registro ou incrementar a tentativa com base apenas no 4xx. A alternativa sugerida no resumo do verifier de limpar o registro não é segura sem confirmação terminal do provedor.
- Achado 3 reproduzido: após US$29 válidos, um registro de US$2 interrompido antes da admissão foi adotado como `existing`; a soma ficou US$31. A prova construiu exatamente o estado persistido nessa janela, sem chamadas externas.
- Achado 4 confirmado na leitura: renomear um arquivo é atômico, mas ler/modificar/gravar sem exclusão mútua permite sobrescrever estados. A correção precisa proteger reserva/admissão e transições, incluindo morte do processo; se o estado não for comprovável, bloquear novos gastos.
- Achado 5 reproduzido: quantia negativa não foi marcada como corrupção. Exigir inteiro seguro positivo, estado enumerado e hash válido; falha de leitura não pode virar saldo livre.
- Achado 6 confirmado: o teste aceita `30.50`. O teto autorizado é US$30 acumulados; o ambiente pode reduzir esse valor, nunca aumentá-lo sem nova decisão.
- Achado 7 confirmado: regex de caminho aceita modelos de outros fornecedores, mas o payload é específico de Kling 3.0 Pro. Restringir ao modelo efetivamente suportado.

Aprimoramentos adicionais identificados pelo Codex: preço fracionário deve arredondar reserva para cima; não apagar registros liberados após sete dias porque são memória de idempotência; não tratar locks abandonados como autorização automática para gastar. As URLs autenticadas devem continuar restritas à origem oficial, sem credencial em storage/CDN.

## Próxima execução de correção

Preparar uma versão corrigida com casos determinísticos para a janela de admissão, transições concorrentes e corrupção semântica; preservar os testes existentes, hashes legados e layout. Validar repetição de POST desconhecido seguida de 401/409/422 e posterior sucesso com a MESMA chave. Exigir nova revisão independente e recibo de lapidação final antes de incorporar. Não presumir que 212 testes verdes cobrem esses cenários.

O teste pago Genjutsu continua não executado. O estudo e a biblioteca ficam em docs/higgsfield; preço aproximado de Restyle não substitui cotação da conta para Object Swap/Motion Transfer.
