/**
 * Helper Supabase pour le middleware Next.js.
 *
 * Rôle : rafraîchir le token Supabase sur chaque requête + propager les
 * cookies updated vers la réponse, pour que les Server Components voient
 * toujours une session à jour.
 *
 * Importé par `middleware.ts` à la racine du projet.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // IMPORTANT : ce getUser() refresh le token côté serveur.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
