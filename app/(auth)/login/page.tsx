/**
 * Page de connexion `/login`.
 *
 * Server component qui rend un form posté vers une server action.
 * - Si succès : redirect vers `?next=...` ou `/agents`.
 * - Si échec : redirect vers `/login?error=...`.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { headers } from 'next/headers';

interface LoginPageProps {
  searchParams: { next?: string; error?: string };
}

async function loginAction(formData: FormData) {
  'use server';

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/agents');

  if (!email || !password) {
    redirect('/login?error=missing_fields');
  }

  // Rate limit par IP (brute force protection)
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit({
    identifier: `login:${ip}`,
    ...RATE_LIMITS.auth,
  });
  if (!rl.success) {
    redirect('/login?error=rate_limit');
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=invalid_credentials`);
  }

  redirect(next.startsWith('/') ? next : '/agents');
}

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: 'Email et mot de passe sont requis.',
  invalid_credentials: 'Email ou mot de passe incorrect.',
  rate_limit: 'Trop de tentatives. Réessaie dans quelques minutes.',
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const errorMessage = searchParams.error
    ? ERROR_MESSAGES[searchParams.error] ?? 'Erreur inconnue.'
    : null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      <header className="mb-6 text-center">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
          Nestenn IA
        </p>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Connexion
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Accède à ta plateforme multi-agents.
        </p>
      </header>

      {errorMessage && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      <form action={loginAction} className="space-y-4">
        <input type="hidden" name="next" value={searchParams.next ?? '/agents'} />

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            placeholder="ton@email.fr"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
        >
          Se connecter
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Pas encore de compte ?{' '}
        <Link
          href="/signup"
          className="font-medium text-cyan-700 hover:underline dark:text-cyan-400"
        >
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
