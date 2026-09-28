/**
 * Page de connexion `/login` — connexion GitHub (OAuth), sans mot de passe.
 *
 * Server component qui rend un form posté vers une server action :
 * `signInWithOAuth` renvoie l'URL d'autorisation GitHub, vers laquelle on
 * redirige. Au retour, `/auth/callback` crée la session et vérifie la liste
 * blanche `ALLOWED_EMAILS`. Le compte (et son profil, via le trigger SQL
 * `handle_new_user`) est créé automatiquement à la première connexion.
 */

import { Github } from 'lucide-react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import { APP_NAME } from '@/lib/branding';
import { createClient } from '@/lib/supabase/server';

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

async function signInWithGitHub(formData: FormData) {
  'use server';

  const next = safeRedirectPath(String(formData.get('next') ?? ''));
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? `https://${(await headers()).get('host') ?? 'localhost:3000'}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect('/login?error=oauth_failed');
  }
  redirect(data.url);
}

const ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: 'La connexion avec GitHub a échoué. Réessaie.',
  not_allowed: "Ce compte GitHub n'est pas autorisé à utiliser cette application.",
  profile_missing: 'Profil introuvable. Contacte l’administrateur.',
};

export default async function LoginPage(props: LoginPageProps) {
  const searchParams = await props.searchParams;
  const errorMessage = searchParams.error
    ? ERROR_MESSAGES[searchParams.error] ?? 'Erreur inconnue.'
    : null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      <header className="mb-6 text-center">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
          {APP_NAME}
        </p>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Connexion
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Accède à ta plateforme multi-agents avec ton compte GitHub.
        </p>
      </header>

      {errorMessage && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
        >
          {errorMessage}
        </div>
      )}

      <form action={signInWithGitHub}>
        <input type="hidden" name="next" value={searchParams.next ?? '/agents'} />
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-offset-zinc-900"
        >
          <Github className="h-4 w-4" aria-hidden />
          Continuer avec GitHub
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
        Aucun mot de passe : l&apos;authentification est déléguée à GitHub.
      </p>
    </div>
  );
}
