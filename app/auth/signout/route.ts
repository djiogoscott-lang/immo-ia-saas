/**
 * POST /auth/signout — déconnexion.
 *
 * Appelé par le bouton "Se déconnecter" dans la sidebar (UserMenu).
 * Détruit la session Supabase et redirige vers /login.
 */

import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const url = new URL('/login', request.url);
  return NextResponse.redirect(url, { status: 303 });
}
