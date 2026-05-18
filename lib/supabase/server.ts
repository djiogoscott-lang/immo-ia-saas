import 'server-only';

/**
 * Client Supabase pour les Server Components / Server Actions / Route Handlers.
 *
 * Utilise les cookies HTTP pour persister la session. À ne JAMAIS importer
 * dans un Client Component (use client) — pour ça, voir `./client.ts`.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // `cookies().set()` lève dans les Server Components statiques.
            // Le middleware se charge de rafraîchir le cookie côté requête.
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // idem
          }
        },
      },
    }
  );
}
