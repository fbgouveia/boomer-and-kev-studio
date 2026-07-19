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
