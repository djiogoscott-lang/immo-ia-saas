#!/usr/bin/env tsx
/**
 * scripts/clean-rag.ts — Nettoie la base RAG des fichiers "polluants".
 *
 * Catégories de fichiers candidats à la suppression :
 *   1. status = 'error'      → fichiers dont l'extraction a échoué (PDF scannés, etc.)
 *   2. scope = global ET 1 chunk seulement
 *                             → fichiers globaux ultra-courts qui polluent toutes
 *                               les conversations (matchent un peu tout).
 *   3. doublons exacts        → même nom + même taille en bytes (même user)
 *
 * Modes :
 *   npm run clean:rag             → affiche les candidats, ne supprime RIEN (dry-run)
 *   npm run clean:rag -- --apply  → supprime apres confirmation interactive
 *   npm run clean:rag -- --force  → supprime sans confirmation (ATTENTION)
 *
 * Suppression :
 *   - Storage Supabase (objet PDF)
 *   - Ligne agent_files (les chunks tombent en CASCADE)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';

// --- env loader (idem migrate:rag) ----------------------------------------

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
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    console.warn('[clean] .env.local introuvable.');
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Env vars manquantes : NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BUCKET = 'agent-files';

// --- Args -----------------------------------------------------------------

const args = process.argv.slice(2);
const APPLY = args.includes('--apply') || args.includes('--force');
const FORCE = args.includes('--force');

// --- Types ----------------------------------------------------------------

interface FileRow {
  id: string;
  user_id: string;
  conversation_id: string | null;
  storage_path: string;
  name: string;
  size_bytes: number;
  status: string;
  chunks_count: number;
  created_at: string;
}

interface Candidate {
  file: FileRow;
  reason: string;
}

// --- Helpers --------------------------------------------------------------

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`;
  return `${(b / 1024 / 1024).toFixed(2)} Mo`;
}

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolveAns) => {
    rl.question(question, (answer) => {
      rl.close();
      resolveAns(answer.trim().toLowerCase());
    });
  });
}

// --- Identification des candidats -----------------------------------------

async function findCandidates(): Promise<Candidate[]> {
  const { data, error } = await supabase
    .from('agent_files')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur fetch fichiers:', error.message);
    process.exit(1);
  }
  const files = (data ?? []) as FileRow[];

  const candidates: Candidate[] = [];

  // 1. Erreurs
  for (const f of files) {
    if (f.status === 'error') {
      candidates.push({ file: f, reason: "status='error' (extraction echouee, PDF scanne probablement)" });
    }
  }

  // 2. Fichiers globaux ultra-courts (1 chunk)
  for (const f of files) {
    if (f.conversation_id === null && f.chunks_count <= 1 && f.status === 'ready') {
      candidates.push({
        file: f,
        reason: 'GLOBAL + 1 chunk seulement → embedding fourre-tout qui pollue toutes les conversations',
      });
    }
  }

  // 3. Doublons exacts (meme name + meme size dans le meme user)
  const byKey = new Map<string, FileRow[]>();
  for (const f of files) {
    const key = `${f.user_id}|${f.name}|${f.size_bytes}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(f);
  }
  for (const dups of byKey.values()) {
    if (dups.length < 2) continue;
    // On garde le 1er, on propose la suppression des suivants
    // (sauf si déjà identifie comme candidat pour d'autres raisons)
    const alreadyFlaggedIds = new Set(candidates.map((c) => c.file.id));
    for (let i = 1; i < dups.length; i++) {
      const dup = dups[i];
      if (!alreadyFlaggedIds.has(dup.id)) {
        candidates.push({
          file: dup,
          reason: `Doublon de "${dups[0].name}" (meme nom + meme taille uploades plusieurs fois)`,
        });
      }
    }
  }

  return candidates;
}

// --- Suppression d'un fichier ---------------------------------------------

async function deleteFile(f: FileRow): Promise<{ ok: boolean; error?: string }> {
  // 1. Storage
  if (f.storage_path && f.storage_path !== 'pending') {
    const { error: storageErr } = await supabase.storage.from(BUCKET).remove([f.storage_path]);
    if (storageErr) {
      // Pas bloquant : on continue à supprimer la row DB même si l'objet Storage manque
      console.warn(`  /!\\ Storage : ${storageErr.message} (on continue)`);
    }
  }

  // 2. DB row (chunks droppes en CASCADE)
  const { error: dbErr } = await supabase.from('agent_files').delete().eq('id', f.id);
  if (dbErr) return { ok: false, error: dbErr.message };

  return { ok: true };
}

// --- Main ------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`\nClean RAG — ${new Date().toLocaleString('fr-FR')}`);
  console.log(`Supabase : ${SUPABASE_URL}`);
  console.log(`Mode : ${APPLY ? (FORCE ? 'APPLY + FORCE (sans confirmation)' : 'APPLY (avec confirmation)') : 'DRY-RUN (lecture seule)'}`);

  const candidates = await findCandidates();

  console.log(`\n=== ${candidates.length} candidat(s) a supprimer ===\n`);

  if (candidates.length === 0) {
    console.log('Aucun fichier polluant detecte. Base RAG saine.');
    return;
  }

  // Affichage
  candidates.forEach((c, idx) => {
    const scope = c.file.conversation_id ? 'conv' : 'GLOBAL';
    const date = new Date(c.file.created_at).toLocaleDateString('fr-FR');
    console.log(`  [${idx + 1}] ${c.file.name}`);
    console.log(`      ${scope} | ${fmtBytes(c.file.size_bytes)} | ${c.file.chunks_count} chunks | ${c.file.status} | ${date}`);
    console.log(`      Raison : ${c.reason}`);
    console.log('');
  });

  if (!APPLY) {
    console.log('--- DRY-RUN : aucune suppression effectuee. ---');
    console.log('Pour supprimer reellement :');
    console.log('  npm run clean:rag -- --apply       (avec confirmation par fichier)');
    console.log('  npm run clean:rag -- --force       (sans confirmation, ATTENTION)');
    return;
  }

  // Mode APPLY
  let deleted = 0;
  let skipped = 0;
  let failed = 0;

  for (const c of candidates) {
    let confirm = 'y';
    if (!FORCE) {
      confirm = await prompt(`Supprimer "${c.file.name}" (${c.file.id.slice(0, 8)})? [y/N/q] : `);
      if (confirm === 'q') {
        console.log('Arret demande.');
        break;
      }
      if (confirm !== 'y' && confirm !== 'yes' && confirm !== 'o' && confirm !== 'oui') {
        console.log('  Skip.');
        skipped++;
        continue;
      }
    }

    const res = await deleteFile(c.file);
    if (res.ok) {
      console.log(`  OK supprime.`);
      deleted++;
    } else {
      console.log(`  ECHEC : ${res.error}`);
      failed++;
    }
  }

  console.log(`\n--- Bilan ---`);
  console.log(`  Supprimes : ${deleted}`);
  console.log(`  Ignores   : ${skipped}`);
  console.log(`  Echecs    : ${failed}`);
}

main().catch((err) => {
  console.error('\nErreur fatale :', err instanceof Error ? err.message : err);
  process.exit(1);
});
