-- ===========================================================================
-- TOUT-EN-UN — Migration complète pour un nouveau projet Supabase Immo IA SaaS
-- ===========================================================================
-- Contient : v2 (tables de base) + v3 (livrables) + v4 (RAG fichiers)
-- + storage (bucket + policies) + v5 (fichiers par conversation) + v6 (sécurité)
--
-- À copier-coller intégralement dans Supabase Dashboard > SQL Editor > Run.
-- IDEMPOTENT : peut être relancé sans casser.
-- ===========================================================================

-- ===========================================================================
-- V2 — Tables de base (profiles, conversations, messages)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'conseiller'
    CHECK (role IN ('conseiller', 'manager', 'assistante')),
  agency_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS
  'Profil utilisateur etendu (role metier + agence). 1:1 avec auth.users.';

-- Conversations — agent_id sans CHECK (validation cote application via isValidAgentId)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nouvelle conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id
  ON public.conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON public.conversations(user_id, updated_at DESC);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON public.messages(conversation_id, created_at);

-- RLS — activation
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages      ENABLE ROW LEVEL SECURITY;

-- Policies profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policies conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
CREATE POLICY "Users can view their own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.conversations;
CREATE POLICY "Users can insert their own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
CREATE POLICY "Users can update their own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;
CREATE POLICY "Users can delete their own conversations"
  ON public.conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Policies messages
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.messages;
CREATE POLICY "Users can view messages from their conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON public.messages;
CREATE POLICY "Users can insert messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- Trigger : creer un profile auto a l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'conseiller')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger : auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_conversations_updated_at ON public.conversations;
CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===========================================================================
-- V3 — Livrables d'agents (Markdown + frontmatter YAML)
-- ===========================================================================

create table if not exists public.agent_deliverables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  conversation_id uuid references public.conversations(id) on delete set null,
  agent_id text not null,
  campagne text,
  type text not null,
  slug text not null,
  frontmatter jsonb not null default '{}'::jsonb,
  markdown_body text not null,
  version int not null default 1,
  status text not null default 'draft',
  parent_id uuid references public.agent_deliverables(id) on delete set null,
  model_used text,
  tokens_in int,
  tokens_out int,
  prompt_source text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint deliverables_status_chk
    check (status in ('draft', 'final', 'archived'))
);

create index if not exists agent_deliverables_user_created_idx
  on public.agent_deliverables (user_id, created_at desc);

create index if not exists agent_deliverables_user_agent_idx
  on public.agent_deliverables (user_id, agent_id, created_at desc);

create index if not exists agent_deliverables_user_campagne_idx
  on public.agent_deliverables (user_id, campagne, created_at desc)
  where campagne is not null;

create or replace function public.update_agent_deliverables_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists agent_deliverables_set_updated_at on public.agent_deliverables;
create trigger agent_deliverables_set_updated_at
  before update on public.agent_deliverables
  for each row execute function public.update_agent_deliverables_updated_at();

alter table public.agent_deliverables enable row level security;

drop policy if exists "Users read their own deliverables" on public.agent_deliverables;
create policy "Users read their own deliverables"
  on public.agent_deliverables for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert their own deliverables" on public.agent_deliverables;
create policy "Users insert their own deliverables"
  on public.agent_deliverables for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update their own deliverables" on public.agent_deliverables;
create policy "Users update their own deliverables"
  on public.agent_deliverables for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete their own deliverables" on public.agent_deliverables;
create policy "Users delete their own deliverables"
  on public.agent_deliverables for delete
  using (auth.uid() = user_id);

-- ===========================================================================
-- V4 — RAG : fichiers utilisateurs + embeddings Nomic 768 dims
-- ===========================================================================

create extension if not exists vector;

create table if not exists public.agent_files (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  storage_path  text not null,
  name          text not null,
  size_bytes    integer not null check (size_bytes > 0),
  mime_type     text not null,
  status        text not null default 'processing'
                  check (status in ('processing', 'ready', 'error')),
  error_message text,
  chunks_count  integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists agent_files_user_created_idx
  on public.agent_files (user_id, created_at desc);

create index if not exists agent_files_user_status_idx
  on public.agent_files (user_id, status);

create table if not exists public.agent_files_chunks (
  id           uuid primary key default gen_random_uuid(),
  file_id      uuid not null references public.agent_files(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  chunk_index  integer not null,
  content      text not null,
  embedding    vector(768) not null,
  tokens       integer,
  created_at   timestamptz not null default now(),
  unique (file_id, chunk_index)
);

create index if not exists agent_files_chunks_embedding_idx
  on public.agent_files_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists agent_files_chunks_user_idx
  on public.agent_files_chunks (user_id);

create or replace function public.agent_files_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists agent_files_updated_at on public.agent_files;
create trigger agent_files_updated_at
  before update on public.agent_files
  for each row execute procedure public.agent_files_set_updated_at();

alter table public.agent_files enable row level security;
alter table public.agent_files_chunks enable row level security;

drop policy if exists "agent_files: select own" on public.agent_files;
create policy "agent_files: select own"
  on public.agent_files for select
  using (auth.uid() = user_id);

drop policy if exists "agent_files: insert own" on public.agent_files;
create policy "agent_files: insert own"
  on public.agent_files for insert
  with check (auth.uid() = user_id);

drop policy if exists "agent_files: update own" on public.agent_files;
create policy "agent_files: update own"
  on public.agent_files for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "agent_files: delete own" on public.agent_files;
create policy "agent_files: delete own"
  on public.agent_files for delete
  using (auth.uid() = user_id);

drop policy if exists "agent_files_chunks: select own" on public.agent_files_chunks;
create policy "agent_files_chunks: select own"
  on public.agent_files_chunks for select
  using (auth.uid() = user_id);

drop policy if exists "agent_files_chunks: insert own" on public.agent_files_chunks;
create policy "agent_files_chunks: insert own"
  on public.agent_files_chunks for insert
  with check (auth.uid() = user_id);

drop policy if exists "agent_files_chunks: delete own" on public.agent_files_chunks;
create policy "agent_files_chunks: delete own"
  on public.agent_files_chunks for delete
  using (auth.uid() = user_id);

-- Fonction de recherche similarite cosine top-N
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

-- ===========================================================================
-- Storage policies — bucket "agent-files" (a creer dans l'UI Storage)
-- Ces policies referencent juste le nom du bucket comme string, donc on peut
-- les creer AVANT le bucket — elles s'activeront automatiquement quand le
-- bucket sera cree.
-- ===========================================================================

drop policy if exists "agent_files storage: select own" on storage.objects;
create policy "agent_files storage: select own"
  on storage.objects for select
  using (
    bucket_id = 'agent-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "agent_files storage: insert own" on storage.objects;
create policy "agent_files storage: insert own"
  on storage.objects for insert
  with check (
    bucket_id = 'agent-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "agent_files storage: delete own" on storage.objects;
create policy "agent_files storage: delete own"
  on storage.objects for delete
  using (
    bucket_id = 'agent-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ===========================================================================
-- STORAGE — Bucket privé des fichiers RAG
-- ===========================================================================

insert into storage.buckets (id, name, public)
values ('agent-files', 'agent-files', false)
on conflict (id) do nothing;

-- ===========================================================================
-- V5 — Fichiers attachés à une conversation
-- ===========================================================================
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
language sql stable as $
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
$;


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

-- ===========================================================================
-- V6 — Sécurité : rôles non modifiables par l'utilisateur
-- ===========================================================================
--
-- Corrige une escalade de privilèges :
--   (1) `handle_new_user` lisait le rôle dans `raw_user_meta_data`, donnée
--       fournie par le client à l'inscription → n'importe qui pouvait
--       s'inscrire "manager".
--   (2) La policy UPDATE sur `profiles` autorisait l'utilisateur à modifier
--       TOUTES les colonnes de son profil, dont `role` et `agency_id`.
--
-- Après cette migration :
--   - tout nouveau compte est créé avec le rôle `conseiller` ;
--   - l'utilisateur ne peut plus modifier que son `full_name` ;
--   - un rôle ne se change que par un administrateur (SQL Editor Supabase,
--     qui s'exécute en tant que `postgres` et contourne la RLS) :
--
--       update public.profiles set role = 'manager'
--       where id = (select id from auth.users where email = 'ton@email.com');
--
-- Idempotent : peut être ré-exécuté sans effet de bord.
-- =============================================================================

-- 1. Trigger de création de profil : rôle imposé côté serveur.
--    `name` / `user_name` : champs fournis par GitHub OAuth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'user_name',
      split_part(NEW.email, '@', 1)
    ),
    'conseiller'
  );
  RETURN NEW;
END;
$;

-- 2. Seul `full_name` est modifiable par l'utilisateur lui-même.
--    La policy RLS "Users can update their own profile" reste en place
--    (elle filtre les LIGNES) ; les privilèges de colonne filtrent les COLONNES.
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;

-- ===========================================================================
-- VERIFICATION FINALE
-- ===========================================================================

select
  (select count(*) from pg_tables where schemaname='public'
    and tablename in ('profiles','conversations','messages','agent_deliverables','agent_files','agent_files_chunks'))::int as tables,
  (select count(*) from pg_policies where schemaname='public')::int as db_policies,
  (select count(*) from pg_policies where schemaname='storage' and policyname like 'agent_files storage%')::int as storage_policies,
  (select count(*) from pg_proc where proname = 'match_agent_files_chunks')::int as match_function,
  (select count(*) from pg_extension where extname='vector')::int as pgvector;
