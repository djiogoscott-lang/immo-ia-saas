import 'server-only';

/**
 * Helpers d'authentification côté serveur.
 *
 * - `getCurrentUser()`     → user Supabase Auth (id, email…) ou null
 * - `getCurrentProfile()`  → profile métier (id, full_name, role, agency_id) ou null
 * - `requireUser()`        → user OBLIGATOIRE, throw si non connecté (à utiliser
 *                            dans les Route Handlers protégés par le middleware)
 */

import { createClient } from '@/lib/supabase/server';

import type { AgentAudience } from '@/lib/agents/registry';

export interface Profile {
  id: string;
  full_name: string | null;
  role: AgentAudience;
  agency_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('[getCurrentProfile]', error.message);
    return null;
  }
  return profile as Profile;
}

export class UnauthorizedError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * À utiliser dans les Route Handlers (`/api/*`).
 * Le middleware doit déjà avoir rafraîchi la session ; ici on récupère le user
 * et on lève si pas connecté — le caller renvoie un 401 propre.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
