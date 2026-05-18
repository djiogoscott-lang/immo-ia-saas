/**
 * GET /auth/callback — endpoint de callback Supabase Auth.
 *
 * Atteint quand l'utilisateur :
 *   - clique sur le lien de confirmation d'email après signup
 *   - clique sur un magic link
 *   - revient d'un flow OAuth (si activé)
 *
 * Supabase passe un `code` dans le query string qu'on échange contre une
 * session via `exchangeCodeForSession`. Puis on redirige vers `next` ou `/agents`.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/agents';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/agents'}`);
    }
  }

  // Échec ou code absent → on renvoie vers login avec un message
  return NextResponse.redirect(`${origin}/login?error=invalid_credentials`);
}
