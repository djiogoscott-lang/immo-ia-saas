#!/usr/bin/env tsx
/**
 * scripts/diag-rag.ts — Audit complet de l'etat du RAG en BDD Supabase.
 *
 * 4 focus :
 *   1. Etat des fichiers (count, taille, chunks, scope global/conv)
 *   2. Qualite d'extraction (echantillonne 3-5 chunks par fichier)
 *   3. Qualite de la recherche (questions test contre match_agent_files_chunks)
 *   4. Schema global (tables, RLS, fonctions, indexes pgvector)
 *
 * Necessite dans .env.local :
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY  (acces admin pour bypass RLS)
 *   - NOMIC_API_KEY              (pour embed les questions test)
 *
 * Usage :
 *   npm run diag:rag
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Charge .env.local
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
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    console.warn('[diag] .env.local introuvable.');
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NOMIC_API_KEY = process.env.NOMIC_API_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Env vars manquantes : NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function section(title: string): void {
  console.log('\n' + '='.repeat(78));
  console.log('  ' + title);
  console.log('='.repeat(78));
}

function subsection(title: string): void {
  console.log('\n--- ' + title + ' ---');
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(2)} Mo`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + '...';
}

// ---------------------------------------------------------------------------
// FOCUS 1 — Etat des fichiers
// ---------------------------------------------------------------------------

interface FileRow {
  id: string;
  user_id: string;
  conversation_id: string | null;
  name: string;
  size_bytes: number;
  mime_type: string;
  status: string;
  error_message: string | null;
  chunks_count: number;
  created_at: string;
}

async function focusFiles(): Promise<FileRow[]> {
  section('FOCUS 1 — Etat des fichiers RAG');

  const { data, error } = await supabase
    .from('agent_files')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur fetch fichiers:', error.message);
    return [];
  }

  const files = (data ?? []) as FileRow[];

  console.log(`\nTotal : ${files.length} fichier(s)`);

  if (files.length === 0) {
    console.log('(aucun fichier dans la BDD — uploade un PDF/DOCX pour pouvoir analyser)');
    return [];
  }

  const stats = {
    ready: files.filter((f) => f.status === 'ready').length,
    processing: files.filter((f) => f.status === 'processing').length,
    error: files.filter((f) => f.status === 'error').length,
    global: files.filter((f) => f.conversation_id === null).length,
    perConv: files.filter((f) => f.conversation_id !== null).length,
    totalChunks: files.reduce((sum, f) => sum + (f.chunks_count ?? 0), 0),
    totalBytes: files.reduce((sum, f) => sum + (f.size_bytes ?? 0), 0),
  };

  console.log(`\nRepartition par statut : ready=${stats.ready} · processing=${stats.processing} · error=${stats.error}`);
  console.log(`Repartition par scope  : global=${stats.global} · par conversation=${stats.perConv}`);
  console.log(`Total chunks indexes   : ${stats.totalChunks}`);
  console.log(`Taille totale uploadee : ${fmtBytes(stats.totalBytes)}`);

  subsection('Detail par fichier');
  for (const f of files.slice(0, 15)) {
    const scope = f.conversation_id ? 'conv' : 'GLOBAL';
    const date = new Date(f.created_at).toLocaleString('fr-FR');
    console.log(`  [${f.status.padEnd(10)}] ${scope.padEnd(6)} ${fmtBytes(f.size_bytes).padStart(9)} ${String(f.chunks_count).padStart(4)} chunks · ${date} · ${f.name}`);
    if (f.error_message) {
      console.log(`    ERREUR: ${f.error_message}`);
    }
  }
  if (files.length > 15) {
    console.log(`  ... et ${files.length - 15} autre(s)`);
  }

  // Alertes
  subsection('Alertes potentielles');
  const lowChunks = files.filter((f) => f.status === 'ready' && f.chunks_count < 2);
  const highChunks = files.filter((f) => f.chunks_count > 100);
  const errored = files.filter((f) => f.status === 'error');
  if (lowChunks.length > 0) {
    console.log(`  /!\\ ${lowChunks.length} fichier(s) avec < 2 chunks (extraction probablement defectueuse, PDF scanne ?)`);
    lowChunks.forEach((f) => console.log(`      - ${f.name} (${f.chunks_count} chunks)`));
  }
  if (highChunks.length > 0) {
    console.log(`  i  ${highChunks.length} fichier(s) avec > 100 chunks (doc tres long, latence RAG potentielle)`);
  }
  if (errored.length > 0) {
    console.log(`  X  ${errored.length} fichier(s) en erreur (a re-uploader ou supprimer)`);
  }
  if (lowChunks.length === 0 && errored.length === 0) {
    console.log('  OK aucune alerte critique.');
  }

  return files;
}

// ---------------------------------------------------------------------------
// FOCUS 2 — Qualite d'extraction (echantillonne des chunks)
// ---------------------------------------------------------------------------

async function focusExtraction(files: FileRow[]): Promise<void> {
  section('FOCUS 2 — Qualite d\'extraction (echantillon de chunks)');

  const readyFiles = files.filter((f) => f.status === 'ready' && f.chunks_count > 0);
  if (readyFiles.length === 0) {
    console.log('Aucun fichier en status=ready, impossible d\'echantillonner.');
    return;
  }

  // Echantillonne jusqu'a 3 fichiers, 2 chunks par fichier (debut + milieu)
  const sample = readyFiles.slice(0, 3);

  for (const f of sample) {
    subsection(`Fichier : ${f.name} (${f.chunks_count} chunks, ${fmtBytes(f.size_bytes)})`);

    const middleIdx = Math.floor(f.chunks_count / 2);
    const indexesToFetch = [0, middleIdx].filter((i, arr, all) => all.indexOf(i) === arr);

    for (const chunkIdx of indexesToFetch) {
      const { data, error } = await supabase
        .from('agent_files_chunks')
        .select('chunk_index, content, tokens')
        .eq('file_id', f.id)
        .eq('chunk_index', chunkIdx)
        .maybeSingle();

      if (error || !data) {
        console.log(`  chunk ${chunkIdx} : (introuvable)`);
        continue;
      }

      const label = chunkIdx === 0 ? 'DEBUT' : 'MILIEU';
      console.log(`\n  Chunk ${chunkIdx} (${label}) — ${data.content.length} chars, ~${data.tokens ?? '?'} tokens :`);
      console.log('  ' + '-'.repeat(74));
      // Affiche en respectant les retours ligne mais en limitant a 400 chars
      const preview = truncate(data.content, 400);
      preview.split('\n').forEach((line) => console.log('  ' + line));
      console.log('  ' + '-'.repeat(74));

      // Heuristiques qualite
      const issues: string[] = [];
      if (data.content.replace(/\s/g, '').length < 50) issues.push('contenu quasi-vide');
      if (/(.)\1{10,}/.test(data.content)) issues.push('caracteres repetes (extraction cassee)');
      const nonAsciiRatio = (data.content.match(/[^\x00-\x7F]/g)?.length ?? 0) / data.content.length;
      if (nonAsciiRatio > 0.5) issues.push(`forte proportion de chars non-ASCII (${(nonAsciiRatio*100).toFixed(0)}%) — encoding ?`);
      const wordCount = data.content.split(/\s+/).filter(Boolean).length;
      if (wordCount < 10) issues.push(`tres peu de mots (${wordCount})`);
      if (issues.length > 0) {
        console.log(`  /!\\ ${issues.join(' | ')}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// FOCUS 3 — Qualite de la recherche RAG
// ---------------------------------------------------------------------------

const TEST_QUERIES = [
  'Quels sont les points cles de ce document ?',
  'Quelles sont les obligations legales mentionnees ?',
  'Quelles sont les conditions financieres ?',
];

async function embedQuery(text: string): Promise<number[] | null> {
  if (!NOMIC_API_KEY) {
    console.log('  (skip : NOMIC_API_KEY manquant)');
    return null;
  }
  try {
    const res = await fetch('https://api-atlas.nomic.ai/v1/embedding/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${NOMIC_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'nomic-embed-text-v1.5',
        texts: [text],
        task_type: 'search_query',
        dimensionality: 768,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.log(`  Nomic erreur ${res.status} : ${errText.slice(0, 150)}`);
      return null;
    }
    const data = await res.json() as { embeddings: number[][] };
    return data.embeddings[0];
  } catch (err) {
    console.log(`  Nomic exception : ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

async function focusSearch(files: FileRow[]): Promise<void> {
  section('FOCUS 3 — Qualite de la recherche RAG (questions test)');

  const readyFiles = files.filter((f) => f.status === 'ready' && f.chunks_count > 0);
  if (readyFiles.length === 0) {
    console.log('Pas de fichier ready, skip.');
    return;
  }

  // On utilise le 1er user qui a des fichiers
  const userId = readyFiles[0].user_id;
  console.log(`User test : ${userId.slice(0, 8)}... (a ${readyFiles.length} fichier(s) ready)`);

  for (const query of TEST_QUERIES) {
    subsection(`Question : "${query}"`);

    const embedding = await embedQuery(query);
    if (!embedding) continue;

    // 1. Match avec seuil 0.5 (ancien defaut)
    const { data: data05, error: err05 } = await supabase.rpc('match_agent_files_chunks', {
      query_embedding: `[${embedding.join(',')}]`,
      p_user_id: userId,
      p_threshold: 0.5,
      p_count: 12,
      p_conversation_id: null,
    });

    // 2. Match avec seuil 0.25 (nouveau defaut)
    const { data: data025, error: err025 } = await supabase.rpc('match_agent_files_chunks', {
      query_embedding: `[${embedding.join(',')}]`,
      p_user_id: userId,
      p_threshold: 0.25,
      p_count: 12,
      p_conversation_id: null,
    });

    if (err05 || err025) {
      console.log(`  Erreur RPC : ${(err05 ?? err025)?.message}`);
      continue;
    }

    const matches05 = (data05 ?? []) as Array<{ file_name: string; similarity: number; content: string }>;
    const matches025 = (data025 ?? []) as Array<{ file_name: string; similarity: number; content: string }>;

    console.log(`  Avec threshold=0.5  : ${matches05.length} chunk(s) (anciens parametres)`);
    console.log(`  Avec threshold=0.25 : ${matches025.length} chunk(s) (nouveaux parametres)`);

    if (matches025.length > 0) {
      console.log('\n  Top 3 chunks remontes (threshold 0.25) :');
      matches025.slice(0, 3).forEach((m, idx) => {
        const sim = (m.similarity * 100).toFixed(0);
        console.log(`    ${idx + 1}. [${sim}%] ${m.file_name} : ${truncate(m.content.replace(/\s+/g, ' '), 120)}`);
      });
    } else {
      console.log('  /!\\ Aucun chunk ne matche, meme avec threshold tres permissif. Soit la question est hors-sujet, soit les embeddings sont de mauvaise qualite.');
    }
  }
}

// ---------------------------------------------------------------------------
// FOCUS 4 — Schema global (via une fonction RPC custom temporaire si dispo)
// ---------------------------------------------------------------------------

async function focusSchema(): Promise<void> {
  section('FOCUS 4 — Schema global (vue d\'ensemble)');

  // Tente d'inspecter via les tables systeme accessibles
  // Note : la plupart sont dans pg_catalog et inaccessibles via REST.
  // On se contente de ce qu'on peut voir.

  subsection('Tables metier visibles (via REST)');
  const knownTables = ['profiles', 'conversations', 'messages', 'deliverables', 'agent_files', 'agent_files_chunks'];
  for (const tbl of knownTables) {
    const { count, error } = await supabase
      .from(tbl)
      .select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`  ${tbl.padEnd(22)} : (inaccessible : ${error.message.slice(0, 60)})`);
    } else {
      console.log(`  ${tbl.padEnd(22)} : ${count ?? 0} ligne(s)`);
    }
  }

  subsection('Conseil pour audit schema complet');
  console.log('  Pour voir tables/RLS/fonctions/indexes, lance dans Supabase SQL Editor :');
  console.log('');
  console.log('    -- Tables');
  console.log('    select schemaname, tablename from pg_tables where schemaname = \'public\';');
  console.log('');
  console.log('    -- RLS policies');
  console.log('    select tablename, policyname, cmd from pg_policies where schemaname = \'public\';');
  console.log('');
  console.log('    -- Fonctions custom');
  console.log('    select proname, pg_get_function_arguments(oid)');
  console.log('    from pg_proc where pronamespace = \'public\'::regnamespace order by proname;');
  console.log('');
  console.log('    -- Indexes pgvector');
  console.log('    select indexname, indexdef from pg_indexes');
  console.log('    where schemaname = \'public\' and indexdef ilike \'%vector%\';');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`\nAudit RAG — ${new Date().toLocaleString('fr-FR')}`);
  console.log(`Supabase : ${SUPABASE_URL}`);

  try {
    const files = await focusFiles();
    if (files.length > 0) {
      await focusExtraction(files);
      await focusSearch(files);
    }
    await focusSchema();
    console.log('\n' + '='.repeat(78));
    console.log('  AUDIT TERMINE');
    console.log('='.repeat(78) + '\n');
  } catch (err) {
    console.error('\nErreur fatale :', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
