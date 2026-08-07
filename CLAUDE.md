# CLAUDE.md — Diretrizes de Desenvolvimento e Comandos

Este arquivo serve como guia de referência rápida de comandos e políticas de desenvolvimento para este projeto.

## 🚀 COMANDOS DO PROJETO
- **Iniciar servidor de desenvolvimento:** `npm run dev` (dentro de `boomer-and-kev-studio/`)
- **Compilar o projeto:** `npm run build`
- **Executar Linter:** `npm run lint`
- **Checagem de Tipos (TypeScript):** `npx tsc --noEmit`
- **Concatenação de clipes de vídeo (FFmpeg):** `node tools/assemble.mjs`

---

## 🎨 DIRETRIZES DE DESIGN (UI/UX)
**Sempre usar a skill `ui-ux-pro-max`** antes de tomar qualquer decisão de design (cores, tipografia, layout, componentes). Nunca decida no olho.
- Cor primária: `#FF5F1F` (Signal Orange).
- Fundo: `#000000` / `#0d0d0d`.
- Estilo: Brutalist Neural Glass (bordas sólidas de 4px laranja, overlays HUD com blur).
- **Proibido:** Qualquer tom de roxo/violeta.

---

## 📰 PAUTA DE EPISÓDIO — skill `last30days` (regra estreita)

**Regra:** nenhuma pauta de episódio entra na fila de render sem uma passada de `last30days` no tema.
B&K é comédia de atualidade — piada sobre assunto de 3 meses atrás morre. A skill é a camada
factual do brainstorm (hoje dependente do Gemini, bloqueado por cobrança GCP desde 06/08).

**Escopo — só isso:** escolha de *tema/pauta* do episódio.
**Fora de escopo:** formato, thumbnail, corte, decisão técnica ou de design. Ali a tendência de
30 dias não muda nada e a pesquisa só encarece o episódio.

### Forma da busca — conflito, não assunto
O motor do show é **hype × deflação** (Boomer surta, Kev esvazia em uma frase). Buscar assunto
retorna tema; falta o atrito. `"AI video tools"` → `"people mocking AI hype claims"`.
Reddit = falas do Kev prontas (comentário sarcástico mais votado); HN = tema do Boomer.
Colher em lote (10–15 pautas/sessão), nunca uma busca por episódio.
**Filtro de admissão (os 3):** tem hype nominal? a deflação cabe em UMA frase? sobrevive 30 dias?
*Heurística não validada — revisar quando os primeiros episódios tiverem número real.*

### Como rodar (medido em 07/08/2026)
```bash
cd ~/Developer/CÉREBRO/AGENTES_SKILLS/skills/last30days
~/.local/bin/python3.12 scripts/last30days.py doctor      # ou: <tema>
```
⚠️ O `python3` do sistema é 3.9.6 e a skill **exige 3.12+** — chamar com `python3` falha na hora.

### Cobertura real hoje (saída do `doctor`, sem chave nenhuma configurada)
- ✅ Funcionando: **reddit** (público, keyless), **hackernews**, **github** (gh 2.91.0), **web** (busca nativa do host)
- ❌ Quebrado: **polymarket**
- ⭕ Desligado — inclui **tiktok, instagram, threads, youtube, x, linkedin, pinterest**

**Consequência honesta:** as plataformas onde B&K vive (TikTok/Instagram/YouTube) estão **mudas**.
Um `last30days` hoje entrega sinal de Reddit/HN — bom pra tema de notícia, fraco pra tendência de
short-form. Não tratar o resultado como leitura de audiência do nicho até destravar as fontes.

**Destravar (grátis, quando valer a pena):**
- `brew install yt-dlp` → liga YouTube
- `last30days.py setup --github` (device flow, 10.000 chamadas grátis) → liga TikTok, Instagram, Threads, LinkedIn, Pinterest

---

## ⚖️ FILOSOFIA DE DESENVOLVIMENTO

### 🧠 KARPATHY (Sempre Ligado)
1. **Pensar antes de codar:** Declarar suposições e perguntar ao Felipe antes de fazer escolhas em silêncio.
2. **Simplicidade primeiro:** Fazer o mínimo necessário para resolver o problema.
3. **Mudanças cirúrgicas:** Tocar apenas no necessário, mantendo o restante intocado.
4. **Meta verificável:** Ter um critério de teste claro antes de executar alterações.

### 🚀 VLAEG (Automação)
- Seguir o fluxo: **Visão → Link → Arquitetura → Estilo → Gatilho**.
- **Protocolo 0:** Sempre definir/confirmar o schema de dados antes de iniciar o código.

### ✅ HONESTIDADE
- Sem métricas inventadas ou números artificiais.
- Relatar falhas exatamente com a saída real do terminal/logs.

### 🐎 PONYTAIL (Nível `full` ativo por padrão)
- **YAGNI:** Não construa o que não foi expressamente pedido.
- **Standard Library:** Dar preferência a recursos nativos em vez de adicionar dependências desnecessárias.
- **Mínimo de Boilerplate:** Simplificar o código ao máximo. Se couber em uma linha, use uma linha.
- **Comentários de atalho:** Marque atalhos técnicos com o comentário `ponytail:`.
