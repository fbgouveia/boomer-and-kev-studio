-- BK-29 — fecha a leitura anônima do histórico de sondas (APLICADO 12/10/2026 via SQL Editor).
-- Único leitor anônimo era o hook local `.claude/deriva-status.sh` (raiz do workspace),
-- que passou a ler com a service role do `.env.local`. O n8n grava com service role.
-- Rollback: create policy "Allow anonymous read access on deriva_runs"
--   on public.deriva_runs for select using (true);

drop policy if exists "Allow anonymous read access on deriva_runs" on public.deriva_runs;
