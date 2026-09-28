/**
 * GET /auth/callback — endpoint de callback Supabase Auth (OAuth GitHub).
 *
 * Atteint au retour de GitHub : Supabase passe un `code` dans le query string
 * qu'on échange contre une session via `exchangeCodeForSession`. Si l'email
 * du compte n'est pas dans `ALLOWED_EMAILS`, la session est détruite aussitôt.
 * Sinon on redirige vers `next` (chemin interne uniquement) ou `/agents`.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { isEmailAllowed } from '@/lib/auth/allowlist';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeRedirectPath(searchParams.get('next'));

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (!isEmailAllowed(data.user?.email)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=not_allowed`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Échec ou code absent → on renvoie vers login avec un message
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
