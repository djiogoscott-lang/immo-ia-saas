/**
 * Middleware Next.js — Nestenn IA V2.
 *
 * Rôle :
 *   1. Rafraîchir la session Supabase à chaque requête (via `updateSession`).
 *   2. Protéger les routes nécessitant l'auth :
 *        - /agents/*  → redirection vers /login si non connecté
 *        - /api/*     → 401 JSON si non connecté
 *   3. Refuser les comptes hors liste blanche (`ALLOWED_EMAILS`).
 *   4. Empêcher d'accéder à /login quand on est déjà connecté.
 *
 * Routes publiques (toujours accessibles) :
 *   - /, /login
 *   - /auth/* (callback OAuth, signout)
 *
 * Le matcher en bas exclut les assets statiques (.next, fichiers Next.js).
 */

import { NextResponse, type NextRequest } from 'next/server';

import { isEmailAllowed } from '@/lib/auth/allowlist';
import { updateSession } from '@/lib/supabase/middleware';

const LOGIN_ROUTE = '/login';
const AUTH_CALLBACK_PREFIX = '/auth/';

function isProtectedRoute(pathname: string): boolean {
  return pathname.startsWith('/agents') || pathname.startsWith('/api/');
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(AUTH_CALLBACK_PREFIX)) {
    return response;
  }

  // Session valide mais compte non autorisé : traité comme non connecté.
  const authorizedUser = user && isEmailAllowed(user.email) ? user : null;

  // Si user autorisé ET sur /login → renvoyer vers /agents
  if (authorizedUser && pathname === LOGIN_ROUTE) {
    const url = request.nextUrl.clone();
    url.pathname = '/agents';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (!authorizedUser && isProtectedRoute(pathname)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Connexion requise.' },
        { status: 401 }
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_ROUTE;
    url.search = '';
    if (user) {
      url.searchParams.set('error', 'not_allowed');
    } else {
      url.searchParams.set('next', pathname);
    }
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
