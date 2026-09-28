import 'server-only';

/**
 * Helpers d'authentification côté serveur.
 *
 * - `getCurrentUser()`     → user Supabase Auth (id, email…) ou null
 * - `getCurrentProfile()`  → profile métier (id, full_name, role, agency_id) ou null
 * - `requireUser()`        → user OBLIGATOIRE, throw si non connecté (à utiliser
 *                            dans les Route Handlers protégés par le middleware)
 *
 * `getCurrentUser` et `getCurrentProfile` sont mémoïsés par requête (React
 * `cache`) : layout + page + composants peuvent les appeler sans refaire
 * d'aller-retour réseau vers Supabase.
 */

import { cache } from 'react';

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

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
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
});

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
