#!/usr/bin/env tsx
/**
 * scripts/migrate-rag.ts — Active le RAG en une commande.
 *
 * Effectue 3 actions sur Supabase :
 *   1. Migration SQL v4_agent_files.sql (tables + index + RLS + match function)
 *   2. Création du bucket Storage `agent-files` (privé, max 5MB)
 *   3. Application des storage policies (isolation par user_id)
 *   4. Vérification finale (tables / policies / fonction / extension)
 *
 * IDEMPOTENT : peut être relancé sans casser un état déjà migré (utilise
 * IF NOT EXISTS partout, et gère gracefully les "policy already exists").
 *
 * Variables d'env requises (.env.local) :
 *   - DATABASE_URL                  (récupéré depuis Supabase Settings > Database)
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage :
 *   npm run migrate:rag
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';

// ---------------------------------------------------------------------------
// Charge .env.local manuellement (sans dépendre de next/dotenv)
// ---------------------------------------------------------------------------

function loadEnvLocal(): void {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      // Strip surrounding quotes si présents
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch (err) {
    console.warn('[migrate:rag] .env.local introuvable ou illisible — utilisation des env vars existantes uniquement.');
  }
}

loadEnvLocal();

// ---------------------------------------------------------------------------
// Validation des env vars
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DATABASE_URL || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Env vars manquantes :');
  if (!DATABASE_URL) {
    console.error('   - DATABASE_URL (Supabase Dashboard > Settings > Database > Connection string > URI)');
    console.error('     Format : postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres');
  }
  if (!SUPABASE_URL) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  if (!SERVICE_ROLE_KEY) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers logging
// ---------------------------------------------------------------------------

const log = {
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  ok: (msg: string) => console.log(`✅ ${msg}`),
  warn: (msg: string) => console.log(`⚠️  ${msg}`),
  err: (msg: string) => console.error(`❌ ${msg}`),
  section: (title: string) => console.log(`\n━━━ ${title} ━━━`),
};

// ---------------------------------------------------------------------------
// Étape 1 : Migration SQL
// ---------------------------------------------------------------------------

async function runSqlMigration(client: Client): Promise<void> {
  log.section('Étape 1/4 — Migration SQL (tables + index + RLS + fonction)');

  const sqlPath = resolve(process.cwd(), 'migrations/v4_agent_files.sql');
  let sql = readFileSync(sqlPath, 'utf-8');

  // Le fichier contient des storage policies en COMMENTAIRE (à exécuter
  // après création du bucket). On les laisse en commentaire ici, elles seront
  // exécutées à l'étape 3.

  // Patch idempotent : transforme `create table` en `create table if not exists`,
  // `create index` en `create index if not exists`, `create policy` → géré par try/catch.
  sql = sql.replace(/^\s*create\s+table\s+(public\.)/gim, 'create table if not exists $1');
  sql = sql.replace(/^\s*create\s+index\s+([a-z_]+)/gim, 'create index if not exists $1');
  sql = sql.replace(/^\s*create\s+trigger\s+/gim, 'create or replace trigger ');

  try {
    await client.query(sql);
    log.ok('SQL exécuté : tables agent_files / agent_files_chunks, indexes, RLS, trigger, fonction match_agent_files_chunks');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Les policies "create policy" peuvent échouer si déjà existantes — on tolère
    if (/already exists/i.test(msg)) {
      log.warn(`Certains objets existaient déjà — c'est OK (idempotent). Détail : ${msg.slice(0, 200)}`);
    } else {
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Étape 2 : Création du bucket Storage
// ---------------------------------------------------------------------------

async function createBucket(): Promise<void> {
  log.section('Étape 2/4 — Création du bucket Storage agent-files');

  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  // Vérifie si le bucket existe déjà
  const { data: existing } = await supabase.storage.getBucket('agent-files');
  if (existing) {
    log.warn(`Bucket "agent-files" déjà présent (créé le ${existing.created_at}) — skip création`);
    return;
  }

  const { data, error } = await supabase.storage.createBucket('agent-files', {
    public: false,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
  });

  if (error) {
    throw new Error(`Création bucket : ${error.message}`);
  }
  log.ok(`Bucket "agent-files" créé (privé, max 5MB) — id : ${data.name}`);
}

// ---------------------------------------------------------------------------
// Étape 3 : Storage policies
// ---------------------------------------------------------------------------

async function applyStoragePolicies(client: Client): Promise<void> {
  log.section('Étape 3/4 — Application des storage policies (isolation par user_id)');

  const policies: Array<{ name: string; sql: string }> = [
    {
      name: 'agent_files storage: select own',
      sql: `create policy "agent_files storage: select own"
              on storage.objects for select
              using (
                bucket_id = 'agent-files'
                and auth.uid()::text = (storage.foldername(name))[1]
              );`,
    },
    {
      name: 'agent_files storage: insert own',
      sql: `create policy "agent_files storage: insert own"
              on storage.objects for insert
              with check (
                bucket_id = 'agent-files'
                and auth.uid()::text = (storage.foldername(name))[1]
              );`,
    },
    {
      name: 'agent_files storage: delete own',
      sql: `create policy "agent_files storage: delete own"
              on storage.objects for delete
              using (
                bucket_id = 'agent-files'
                and auth.uid()::text = (storage.foldername(name))[1]
              );`,
    },
  ];

  for (const policy of policies) {
    try {
      await client.query(policy.sql);
      log.ok(`Policy créée : "${policy.name}"`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/already exists/i.test(msg)) {
        log.warn(`Policy "${policy.name}" déjà présente — skip`);
      } else {
        throw err;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Étape 4 : Vérification finale
// ---------------------------------------------------------------------------

async function verify(client: Client): Promise<void> {
  log.section('Étape 4/4 — Vérification finale');

  const checkSql = `
    select
      (select count(*) from pg_tables where schemaname='public' and tablename in ('agent_files','agent_files_chunks'))::int as tables_created,
      (select count(*) from pg_policies where schemaname='public' and tablename like 'agent_files%')::int as db_policies,
      (select count(*) from pg_policies where schemaname='storage' and policyname like 'agent_files storage%')::int as storage_policies,
      (select count(*) from pg_proc where proname = 'match_agent_files_chunks')::int as match_function,
      (select count(*) from pg_extension where extname='vector')::int as pgvector_enabled
  `;

  const { rows } = await client.query<{
    tables_created: number;
    db_policies: number;
    storage_policies: number;
    match_function: number;
    pgvector_enabled: number;
  }>(checkSql);

  const r = rows[0]!;
  console.table(r);

  const expected = {
    tables_created: 2,
    db_policies: 7,
    storage_policies: 3,
    match_function: 1,
    pgvector_enabled: 1,
  };

  const issues: string[] = [];
  if (r.tables_created !== expected.tables_created)
    issues.push(`tables_created : ${r.tables_created} (attendu ${expected.tables_created})`);
  if (r.db_policies !== expected.db_policies)
    issues.push(`db_policies : ${r.db_policies} (attendu ${expected.db_policies})`);
  if (r.storage_policies !== expected.storage_policies)
    issues.push(`storage_policies : ${r.storage_policies} (attendu ${expected.storage_policies})`);
  if (r.match_function !== expected.match_function)
    issues.push(`match_function : ${r.match_function} (attendu ${expected.match_function})`);
  if (r.pgvector_enabled !== expected.pgvector_enabled)
    issues.push(`pgvector_enabled : ${r.pgvector_enabled} (attendu ${expected.pgvector_enabled})`);

  if (issues.length > 0) {
    log.err('Vérification incomplète :');
    issues.forEach((i) => console.error(`   - ${i}`));
    process.exit(2);
  }

  log.ok('Tout est en place : RAG prêt à recevoir des fichiers 🎉');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  log.info(`Connexion à ${SUPABASE_URL}`);

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  log.ok('Connecté à Postgres');

  try {
    await runSqlMigration(client);
    await createBucket();
    await applyStoragePolicies(client);
    await verify(client);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log("✨ Migration RAG terminée. Tu peux maintenant uploader des PDF/DOCX sur /agents/files");
    console.log("   N'oublie pas : passer DEMO_MODE=false dans .env.local pour tester.");
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  log.err(err instanceof Error ? err.message : String(err));
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
