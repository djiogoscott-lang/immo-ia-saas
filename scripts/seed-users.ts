#!/usr/bin/env tsx
/**
 * scripts/seed-users.ts — Cree des comptes utilisateurs dans Supabase Auth.
 *
 * Utilise l'API admin (service_role) pour creer des users directement avec
 * email_confirm=true (pas d'email de verification a attendre).
 *
 * Le trigger `handle_new_user()` cree automatiquement la ligne dans profiles.
 *
 * Usage :
 *   npx tsx scripts/seed-users.ts
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
  } catch {
    /* ignore */
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Env vars manquantes : NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Liste des users a creer (modifie cette liste si besoin)
// ---------------------------------------------------------------------------

interface SeedUser {
  email: string;
  password: string;
  fullName?: string;
  role?: 'conseiller' | 'manager' | 'assistante';
}

const USERS_TO_CREATE: SeedUser[] = [
  {
    email: 'laurent@start-academy.fr',
    password: 'Elio1104!!',
    fullName: 'Laurent',
    role: 'manager',
  },
  {
    email: 'djiogoscott@gmail.com',
    password: 'Elio1104!!',
    fullName: 'Laurent (perso)',
    role: 'conseiller',
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  console.log(`ℹ️  Connexion : ${SUPABASE_URL}`);
  console.log(`ℹ️  Creation de ${USERS_TO_CREATE.length} utilisateur(s)\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const u of USERS_TO_CREATE) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: {
        full_name: u.fullName,
        role: u.role ?? 'conseiller',
      },
    });

    if (error) {
      const msg = error.message;
      if (/already (registered|exists)/i.test(msg) || /User already/i.test(msg)) {
        console.log(`⚠️  ${u.email} : deja existant, skip`);
        skipped++;
        continue;
      }
      console.error(`❌ ${u.email} : ${msg}`);
      failed++;
      continue;
    }

    console.log(`✅ ${u.email} cree (id: ${data.user?.id.slice(0, 8)}…)`);
    created++;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✨ Termine : ${created} cree(s), ${skipped} skip, ${failed} echec(s)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (created > 0) {
    console.log('Tu peux maintenant te connecter sur http://localhost:3004 avec :');
    for (const u of USERS_TO_CREATE) {
      console.log(`  - ${u.email} / ${u.password}`);
    }
  }
}

main().catch((err) => {
  console.error('❌', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
