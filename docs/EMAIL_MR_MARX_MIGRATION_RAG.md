# Email à envoyer à Mr Marx

**Objet** : Migration Supabase — Activation du RAG (recherche fichiers dans Immo IA SaaS)

**Destinataire** : Mr Marx
**De** : Laurent (laurent@start-academy.fr)

---

Bonjour Mr Marx,

J'ai terminé le développement de la fonctionnalité **RAG** (Retrieval-Augmented Generation) pour notre plateforme Immo IA SaaS. Elle permettra aux conseillers immobiliers de téléverser leurs propres documents (PDF, Word) — modèles d'actes, lois, baux, fiches produits — et nos agents IA pourront s'appuyer dessus pour répondre avec précision.

Pour activer cette fonctionnalité en production, **3 opérations sont nécessaires côté Supabase**. Comme tu es administrateur du projet, je te transmets ici les instructions détaillées et les requêtes SQL prêtes à exécuter.

L'opération est **non destructive** : elle ajoute uniquement de nouvelles tables (`agent_files`, `agent_files_chunks`) et un nouveau bucket de stockage. Aucune donnée existante n'est touchée. Un script de rollback est également fourni au cas où.

Temps estimé : **5 à 10 minutes**.

---

## Action 1 — Exécuter la migration SQL

1. Aller sur https://supabase.com/dashboard
2. Sélectionner le projet **Immo IA SaaS** (ou Nestenn IA selon le nom)
3. Dans le menu de gauche, cliquer sur **SQL Editor**
4. Cliquer sur **+ New query**
5. Coller le bloc SQL ci-dessous **en entier**
6. Cliquer sur **Run** (ou Ctrl+Enter)
7. Vérifier qu'il n'y a pas d'erreur en bas de l'éditeur

```sql
-- =============================================================================
-- v4 — RAG : fichiers utilisateurs partagés entre agents
-- =============================================================================
-- Stockage : Supabase Storage bucket "agent-files" (privé)
-- Embeddings : Nomic Atlas (nomic-embed-text-v1.5, 768 dimensions)
-- Scope : 1 pool de fichiers global par user, tous les agents y accèdent.
-- =============================================================================

-- Activer pgvector (nécessaire pour les colonnes vector(N))
create extension if not exists vector;

-- Table agent_files — 1 ligne par fichier uploadé
create table public.agent_files (
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

create index agent_files_user_created_idx
  on public.agent_files (user_id, created_at desc);

create index agent_files_user_status_idx
  on public.agent_files (user_id, status);

-- Table agent_files_chunks — 1 ligne par morceau embeddé
create table public.agent_files_chunks (
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

create index agent_files_chunks_embedding_idx
  on public.agent_files_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index agent_files_chunks_user_idx
  on public.agent_files_chunks (user_id);

-- Trigger updated_at
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

-- RLS — isolation stricte par user_id
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

-- Fonction de recherche similarité (cosine)
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
```

**Résultat attendu** : message `Success. No rows returned` (ou équivalent).

---

## Action 2 — Créer le bucket de stockage des fichiers

1. Toujours sur le dashboard Supabase, dans le menu de gauche, cliquer sur **Storage**
2. Cliquer sur le bouton **New bucket**
3. Remplir le formulaire :
   - **Name** : `agent-files`
   - **Public bucket** : **DÉSACTIVÉ** (toggle off — c'est crucial pour la confidentialité des documents utilisateurs)
   - **File size limit** : `5 MB` (optionnel mais recommandé)
   - **Allowed MIME types** : laisser vide (la validation se fait côté application)
4. Cliquer sur **Save** (ou **Create bucket**)

**Résultat attendu** : un nouveau bucket `agent-files` apparaît dans la liste, avec une icône de cadenas (indiquant qu'il est privé).

---

## Action 3 — Appliquer les policies de sécurité sur le bucket

Ces policies garantissent qu'un utilisateur ne peut accéder qu'à ses propres fichiers (isolation stricte par user_id).

1. Retourner dans **SQL Editor** > **+ New query**
2. Coller le bloc SQL ci-dessous
3. Cliquer sur **Run**

```sql
-- Storage policies — isolent l'accès aux objets par préfixe = userId
-- Le path convention est "{userId}/{fileId}.{ext}", donc on vérifie que
-- le premier segment du path correspond bien à l'auth.uid() du requester.

create policy "agent_files storage: select own"
  on storage.objects for select
  using (
    bucket_id = 'agent-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "agent_files storage: insert own"
  on storage.objects for insert
  with check (
    bucket_id = 'agent-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "agent_files storage: delete own"
  on storage.objects for delete
  using (
    bucket_id = 'agent-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
```

**Résultat attendu** : `Success. No rows returned`.

---

## Vérification finale (optionnel mais recommandé)

Pour confirmer que tout est bien en place, exécuter cette requête de contrôle dans le SQL Editor :

```sql
-- Vérifie que les tables, indexes, RLS et fonction sont bien créés
select
  (select count(*) from pg_tables where schemaname='public' and tablename in ('agent_files','agent_files_chunks')) as tables_created,
  (select count(*) from pg_policies where schemaname='public' and tablename like 'agent_files%') as db_policies,
  (select count(*) from pg_policies where schemaname='storage' and policyname like 'agent_files storage%') as storage_policies,
  (select count(*) from pg_proc where proname = 'match_agent_files_chunks') as match_function,
  (select count(*) from pg_extension where extname='vector') as pgvector_enabled;
```

**Résultat attendu** :

| tables_created | db_policies | storage_policies | match_function | pgvector_enabled |
|----------------|-------------|------------------|----------------|------------------|
| 2              | 7           | 3                | 1              | 1                |

Si tous les chiffres correspondent : tout est bon, je peux activer la fonctionnalité côté application.

---

## En cas de problème — rollback

Si jamais un souci survient (peu probable, mais au cas où), voici la requête pour annuler complètement la migration :

```sql
-- ROLLBACK v4 — supprime les tables RAG et la fonction.
-- Les fichiers déjà uploadés dans Storage doivent être supprimés manuellement.

drop function if exists public.match_agent_files_chunks(vector, uuid, float, int);
drop trigger  if exists agent_files_updated_at on public.agent_files;
drop function if exists public.agent_files_set_updated_at();

drop table if exists public.agent_files_chunks;
drop table if exists public.agent_files;

drop policy if exists "agent_files storage: select own" on storage.objects;
drop policy if exists "agent_files storage: insert own" on storage.objects;
drop policy if exists "agent_files storage: delete own" on storage.objects;
```

L'extension `vector` peut être conservée (elle peut servir à d'autres usages futurs).

---

## Pour conclure

Une fois ces 3 actions effectuées, peux-tu me confirmer simplement par retour de mail :

- [ ] Migration SQL exécutée sans erreur
- [ ] Bucket `agent-files` créé en mode privé
- [ ] Storage policies appliquées
- [ ] Requête de vérification renvoie 2 / 7 / 3 / 1 / 1

Je m'occuperai ensuite de la configuration côté application (variable d'environnement `MISTRAL_API_KEY` pour les embeddings) et du déploiement.

Si tu as la moindre question sur un point précis, n'hésite pas à m'appeler ou me répondre.

Merci d'avance pour ton aide,

Bien cordialement,
Laurent
Start Academy
laurent@start-academy.fr
