-- ===========================================================================
-- V3 — Livrables d'agents persistés (Markdown + frontmatter YAML)
-- ===========================================================================
--
-- Pattern NAIOM : chaque livrable d'agent (annonce, post LinkedIn, consultation
-- juridique, simulation financière, etc.) peut être sauvegardé sur demande
-- de l'utilisateur, avec un frontmatter YAML auto-généré (audit + reproductibilité).
--
-- À appliquer dans Supabase Dashboard > SQL Editor > Run.
-- Idempotent : peut être re-rejoué sans casser.
-- ===========================================================================

create table if not exists agent_deliverables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  conversation_id uuid references conversations(id) on delete set null,
  agent_id text not null,
  campagne text,                       -- optionnel (regroupe les livrables)
  type text not null,                  -- "annonce-seloger", "consultation-juridique"...
  slug text not null,                  -- ex : "appt-t3-nice-285k"
  frontmatter jsonb not null default '{}'::jsonb,
  markdown_body text not null,
  version int not null default 1,
  status text not null default 'draft', -- 'draft' | 'final' | 'archived'
  parent_id uuid references agent_deliverables(id) on delete set null,
  model_used text,
  tokens_in int,
  tokens_out int,
  prompt_source text,                  -- requête d'origine (pour reproductibilité)
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint deliverables_status_chk
    check (status in ('draft', 'final', 'archived'))
);

-- Index pour list par user (tri chronologique)
create index if not exists agent_deliverables_user_created_idx
  on agent_deliverables (user_id, created_at desc);

-- Index pour filtrer par agent
create index if not exists agent_deliverables_user_agent_idx
  on agent_deliverables (user_id, agent_id, created_at desc);

-- Index pour filtrer par campagne (only when set)
create index if not exists agent_deliverables_user_campagne_idx
  on agent_deliverables (user_id, campagne, created_at desc)
  where campagne is not null;

-- Trigger updated_at
create or replace function update_agent_deliverables_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists agent_deliverables_set_updated_at on agent_deliverables;
create trigger agent_deliverables_set_updated_at
  before update on agent_deliverables
  for each row execute function update_agent_deliverables_updated_at();

-- ===========================================================================
-- Row Level Security : chaque user voit uniquement ses propres livrables.
-- ===========================================================================
alter table agent_deliverables enable row level security;

drop policy if exists "Users read their own deliverables" on agent_deliverables;
create policy "Users read their own deliverables"
  on agent_deliverables for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert their own deliverables" on agent_deliverables;
create policy "Users insert their own deliverables"
  on agent_deliverables for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update their own deliverables" on agent_deliverables;
create policy "Users update their own deliverables"
  on agent_deliverables for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete their own deliverables" on agent_deliverables;
create policy "Users delete their own deliverables"
  on agent_deliverables for delete
  using (auth.uid() = user_id);
