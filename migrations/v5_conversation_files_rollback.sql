-- =============================================================================
-- v5 ROLLBACK — Annule v5_conversation_files.sql
-- =============================================================================
-- ATTENTION : si des fichiers ont été uploadés avec un conversation_id non
-- NULL, ce rollback ne les supprime PAS, mais la colonne disparaît et tu
-- perds l'info de scope. Vérifie d'abord :
--   select count(*) from public.agent_files where conversation_id is not null;
-- =============================================================================

-- 1. Restaurer l'ancienne signature de match_agent_files_chunks (sans p_conversation_id)
create or replace function public.match_agent_files_chunks(
  query_embedding vector(768),
  p_user_id       uuid,
  p_threshold     float default 0.5,
  p_count         int   default 5
)
returns table (
  chunk_id     uuid,
  file_id      uuid,
  file_name    text,
  chunk_index  integer,
  content      text,
  similarity   float
)
language sql stable as $$
  select
    c.id        as chunk_id,
    c.file_id,
    f.name      as file_name,
    c.chunk_index,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.agent_files_chunks c
  join public.agent_files f on f.id = c.file_id
  where c.user_id = p_user_id
    and f.status  = 'ready'
    and 1 - (c.embedding <=> query_embedding) > p_threshold
  order by c.embedding <=> query_embedding asc
  limit p_count;
$$;

-- 2. Drop la version avec le 5e arg (Postgres ne fait pas de drop "implicite"
--    quand on `create or replace` avec une signature différente — il garde
--    les deux. Donc on supprime explicitement la nouvelle.)
drop function if exists public.match_agent_files_chunks(
  vector(768), uuid, float, int, uuid
);

-- 3. Supprimer l'index combiné
drop index if exists public.agent_files_user_conv_idx;

-- 4. Supprimer la colonne conversation_id (perte de données si non vide !)
alter table public.agent_files drop column if exists conversation_id;

-- 5. Restaurer l'ancien CHECK constraint (anciens IDs V2)
--    À ne faire QUE si tu veux vraiment revenir aux anciens noms d'agents !
--    Sinon, laisser le nouveau CHECK en place (le code attend les nouveaux IDs).
--
-- alter table public.conversations
--   drop constraint if exists conversations_agent_id_check;
-- alter table public.conversations
--   add constraint conversations_agent_id_check
--   check (agent_id in (
--     'assist-immo', 'my-boitage', 'my-dpe', 'reunion-immo', 'ma-perf-immo',
--     'immo-predictor', 'post-rdv-vendeur', 'redac-offre', 'assistant-compromis',
--     'my-juridic-assistant', 'train-my-agent', 'assistant-immo-vendeur'
--   ));
