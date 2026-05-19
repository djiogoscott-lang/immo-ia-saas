-- =============================================================================
-- v4 — RAG : fichiers utilisateurs partagés entre agents
-- =============================================================================
-- Stockage : Supabase Storage bucket "agent-files" (privé, path = userId/fileId.ext)
-- Embeddings : Nomic Atlas (nomic-embed-text-v1.5, 768 dimensions)
-- Pipeline : sync inline (upload → extract → chunk → embed → insert)
-- Scope : 1 pool de fichiers global par user, tous les agents y accèdent.
-- =============================================================================

-- Activer pgvector (nécessaire pour les colonnes vector(N))
create extension if not exists vector;

-- =============================================================================
-- Table agent_files — 1 ligne par fichier uploadé
-- =============================================================================
create table public.agent_files (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  storage_path  text not null,            -- "{userId}/{fileId}.{ext}"
  name          text not null,            -- nom original (display)
  size_bytes    integer not null check (size_bytes > 0),
  mime_type     text not null,
  status        text not null default 'processing'
                  check (status in ('processing', 'ready', 'error')),
  error_message text,
  chunks_count  integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index agent_files_user_created_idx
  on public.agent_files (user_id, created_at desc);

create index agent_files_user_status_idx
  on public.agent_files (user_id, status);

-- =============================================================================
-- Table agent_files_chunks — 1 ligne par morceau embeddé
-- =============================================================================
create table public.agent_files_chunks (
  id           uuid primary key default gen_random_uuid(),
  file_id      uuid not null references public.agent_files(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  chunk_index  integer not null,
  content      text not null,
  embedding    vector(768) not null,     -- Nomic Atlas = 768 dims
  tokens       integer,
  created_at   timestamptz not null default now(),
  unique (file_id, chunk_index)
);

-- Index IVFFLAT pour recherche cosine. `lists=100` convient jusqu'à ~100k chunks ;
-- au-delà, ré-évaluer (rule of thumb : lists ≈ sqrt(n_rows)).
create index agent_files_chunks_embedding_idx
  on public.agent_files_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index agent_files_chunks_user_idx
  on public.agent_files_chunks (user_id);

-- =============================================================================
-- Trigger updated_at
-- =============================================================================
create or replace function public.agent_files_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger agent_files_updated_at
  before update on public.agent_files
  for each row execute procedure public.agent_files_set_updated_at();

-- =============================================================================
-- RLS — isolation stricte par user_id
-- =============================================================================
alter table public.agent_files enable row level security;
alter table public.agent_files_chunks enable row level security;

create policy "agent_files: select own"
  on public.agent_files for select
  using (auth.uid() = user_id);

create policy "agent_files: insert own"
  on public.agent_files for insert
  with check (auth.uid() = user_id);

create policy "agent_files: update own"
  on public.agent_files for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "agent_files: delete own"
  on public.agent_files for delete
  using (auth.uid() = user_id);

create policy "agent_files_chunks: select own"
  on public.agent_files_chunks for select
  using (auth.uid() = user_id);

create policy "agent_files_chunks: insert own"
  on public.agent_files_chunks for insert
  with check (auth.uid() = user_id);

create policy "agent_files_chunks: delete own"
  on public.agent_files_chunks for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- Fonction de recherche similarité (cosine)
-- Retourne les top-N chunks d'un user au-dessus d'un seuil de similarité.
-- Filtre status='ready' pour ignorer les fichiers en cours / en erreur.
-- =============================================================================
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

-- =============================================================================
-- Storage policies — bucket "agent-files" doit être créé manuellement (privé).
-- Ces policies isolent l'accès aux objets par préfixe = userId.
-- =============================================================================
-- À exécuter après création du bucket via dashboard ou supabase-cli :
--
--   create policy "agent_files storage: select own"
--     on storage.objects for select
--     using (
--       bucket_id = 'agent-files'
--       and auth.uid()::text = (storage.foldername(name))[1]
--     );
--
--   create policy "agent_files storage: insert own"
--     on storage.objects for insert
--     with check (
--       bucket_id = 'agent-files'
--       and auth.uid()::text = (storage.foldername(name))[1]
--     );
--
--   create policy "agent_files storage: delete own"
--     on storage.objects for delete
--     using (
--       bucket_id = 'agent-files'
--       and auth.uid()::text = (storage.foldername(name))[1]
--     );
