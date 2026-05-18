/**
 * Middleware Next.js — Nestenn IA V2.
 *
 * Rôle :
 *   1. Rafraîchir la session Supabase à chaque requête (via `updateSession`).
 *   2. Protéger les routes nécessitant l'auth :
 *        - /agents/*  → redirection vers /login si non connecté
 *        - /api/chat        → 401 si non connecté (la route renvoie elle-même)
 *        - /api/route-agent → idem
 *   3. Empêcher d'accéder à /login et /signup quand on est déjà connecté.
 *
 * Routes publiques (toujours accessibles) :
 *   - /login, /signup
 *   - /auth/* (callbacks email, signout)
 *
 * Le matcher en bas exclut les assets statiques (.next, fichiers Next.js).
 */

import { NextResponse, type NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_ROUTES = ['/login', '/signup'];
const AUTH_CALLBACK_PREFIX = '/auth/';

function isProtectedRoute(pathname: string): boolean {
  if (pathname.startsWith('/agents')) return true;
  return false;
}

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (pathname.startsWith(AUTH_CALLBACK_PREFIX)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  // Mode démo : auth complètement désactivée, toutes les routes accessibles
  // publiquement. ACTIVÉ PAR DÉFAUT — désactiver via DEMO_MODE=false en prod.
  // ⚠️ TODO : repasser à `=== 'true'` dès que l'auth Supabase est validée.
  if (process.env.DEMO_MODE !== 'false') {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Si user connecté ET sur /login ou /signup → renvoyer vers /agents
  if (user && isPublicRoute(pathname) && !pathname.startsWith(AUTH_CALLBACK_PREFIX)) {
    const url = request.nextUrl.clone();
    url.pathname = '/agents';
    return NextResponse.redirect(url);
  }

  // Si user non connecté ET route protégée → redirect /login avec ?next=...
  if (!user && isProtectedRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * On match TOUT sauf :
     * - _next/static (fichiers statiques)
     * - _next/image (assets optimisés)
     * - favicon.ico, robots.txt, sitemap.xml
     * - Fichiers avec extension (.svg, .png, .jpg, .css, .js, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.[\\w]+$).*)',
  ],
};
