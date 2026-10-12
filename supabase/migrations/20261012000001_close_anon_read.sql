-- BK-27 — fecha a leitura anônima de episódios e roteiros (NÃO aplicado).
-- Verificado em 12/10/2026: com a anon key (embutida no bundle público) qualquer
-- pessoa lia os 15 episódios inteiros (script_json, rascunhos, video_url).
--
-- ORDEM OBRIGATÓRIA: primeiro publicar o Studio com `GET /api/episodes`
-- (Library lê pelo servidor com service role); só depois aplicar este arquivo.
-- Aplicar antes deixa a Library vazia.
--
-- `trends` continua legível: são manchetes públicas de RSS, sem dado próprio.
-- Rollback: recriar as duas policies com `FOR SELECT USING (true)` (schema.sql:123/126).

drop policy if exists "Allow anonymous read access on public episodes" on public.episodes;
drop policy if exists "Allow anonymous read access on public script_lines" on public.script_lines;
-- RLS continua ativo e sem política pública: só service role lê/escreve.
