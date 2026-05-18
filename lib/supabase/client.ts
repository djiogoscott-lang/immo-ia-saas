'use client';

/**
 * Client Supabase pour les Client Components (browser).
 *
 * À utiliser dans les composants `'use client'` qui ont besoin d'appeler
 * Supabase Auth (login, signup, signout) ou de souscrire à des changements
 * temps réel. Pour les Server Components, voir `./server.ts`.
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
