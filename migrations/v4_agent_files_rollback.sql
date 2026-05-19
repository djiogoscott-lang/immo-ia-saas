-- =============================================================================
-- v4 ROLLBACK — supprime les tables RAG (chunks d'abord pour la FK)
-- =============================================================================

drop function if exists public.match_agent_files_chunks(vector, uuid, float, int);
drop trigger  if exists agent_files_updated_at on public.agent_files;
drop function if exists public.agent_files_set_updated_at();

drop table if exists public.agent_files_chunks;
drop table if exists public.agent_files;

-- Note : on ne désactive PAS l'extension vector ici car elle peut servir
-- à d'autres tables. À droper manuellement si plus aucune table ne l'utilise :
--   drop extension if exists vector;

-- Storage policies (à exécuter si elles avaient été créées) :
--   drop policy "agent_files storage: select own" on storage.objects;
--   drop policy "agent_files storage: insert own" on storage.objects;
--   drop policy "agent_files storage: delete own" on storage.objects;
