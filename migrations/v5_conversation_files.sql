-- =============================================================================
-- v5 — Fichiers attachés à une conversation + fix CHECK agent_id obsolète
-- =============================================================================
--
-- Évolutions :
--   (1) `agent_files.conversation_id` (nullable) — scope d'un fichier :
--         NULL  = pool global du user (visible par toutes ses conversations)
--         UUID  = ponctuel à une conversation précise (CASCADE à sa suppression)
--   (2) Fonction `match_agent_files_chunks` mise à jour : nouveau paramètre
--       `p_conversation_id` qui inclut les fichiers globaux + ceux de la conv.
--   (3) Fix du CHECK constraint `conversations.agent_id` qui listait encore les
--       anciens IDs V2 (assist-immo, my-boitage, …). Remplacé par les 11
--       nouveaux IDs Limova (charly, tom, john, lou, elio, manue, julia, rony,
--       theo, ines, anais).
--
-- À exécuter dans Supabase Dashboard > SQL Editor > Run.
-- Idempotent : utilise IF NOT EXISTS / DROP CONSTRAINT IF EXISTS.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Fix CHECK constraint sur conversations.agent_id (anciens IDs V2 → V3)
-- -----------------------------------------------------------------------------

-- Le nom du CHECK généré par Postgres est "conversations_agent_id_check".
-- On le drop si présent puis on en pose un nouveau avec la liste à jour.
alter table public.conversations
  drop constraint if exists conversations_agent_id_check;

alter table public.conversations
  add constraint conversations_agent_id_check
  check (agent_id in (
    'charly',
    'tom',
    'john',
    'lou',
    'elio',
    'manue',
    'julia',
    'rony',
    'theo',
    'ines',
    'anais'
  ));


-- -----------------------------------------------------------------------------
-- 2. Ajout colonne conversation_id à agent_files
-- -----------------------------------------------------------------------------

alter table public.agent_files
  add column if not exists conversation_id uuid null
    references public.conversations(id) on delete cascade;

comment on column public.agent_files.conversation_id is
  'NULL = fichier du pool global utilisateur. UUID = fichier attaché à une conversation précise (supprimé en cascade avec elle).';

-- Index combiné pour les requêtes "fichiers de cette conv" et "fichiers globaux du user"
create index if not exists agent_files_user_conv_idx
  on public.agent_files (user_id, conversation_id, created_at desc);


-- -----------------------------------------------------------------------------
-- 3. Mise à jour de match_agent_files_chunks pour accepter un scope conversation
-- -----------------------------------------------------------------------------
-- Sémantique :
--   p_conversation_id = NULL  → renvoie uniquement les fichiers globaux
--   p_conversation_id = UUID  → renvoie globaux + fichiers de cette conv
--                               (ignore les fichiers des autres conversations)

create or replace function public.match_agent_files_chunks(
  query_embedding   vector(768),
  p_user_id         uuid,
  p_threshold       float default 0.5,
  p_count           int   default 5,
  p_conversation_id uuid  default null
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
    and (
      f.conversation_id is null
      or (p_conversation_id is not null and f.conversation_id = p_conversation_id)
    )
    and 1 - (c.embedding <=> query_embedding) > p_threshold
  order by c.embedding <=> query_embedding asc
  limit p_count;
$$;


-- -----------------------------------------------------------------------------
-- 4. Vérification rapide (à exécuter et relire après run)
-- -----------------------------------------------------------------------------
-- select count(*) filter (where conversation_id is null)  as global_files,
--        count(*) filter (where conversation_id is not null) as conv_files,
--        count(*) as total
-- from public.agent_files;
--
-- select conname, pg_get_constraintdef(oid) from pg_constraint
-- where conrelid = 'public.conversations'::regclass;
--
-- select proname, pg_get_function_arguments(oid) from pg_proc
-- where proname = 'match_agent_files_chunks';

-- =============================================================================
-- Fin v5
-- =============================================================================
