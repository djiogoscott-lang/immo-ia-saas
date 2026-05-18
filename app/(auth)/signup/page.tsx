/**
 * Page d'inscription `/signup`.
 *
 * Crée un compte Supabase Auth + (via trigger SQL) un profil dans `public.profiles`.
 * Le rôle métier est saisi à l'inscription : conseiller / manager / assistante.
 * Si Supabase Dashboard a "Confirm email" activé, l'utilisateur reçoit un mail
 * de confirmation avant d'être redirigé.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { createClient } from '@/lib/supabase/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

interface SignupPageProps {
  searchParams: { error?: string; success?: string };
}

async function signupAction(formData: FormData) {
  'use server';

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('full_name') ?? '').trim();
  const role = String(formData.get('role') ?? 'conseiller');

  if (!email || !password) {
    redirect('/signup?error=missing_fields');
  }
  if (password.length < 8) {
    redirect('/signup?error=password_too_short');
  }
  if (!['conseiller', 'manager', 'assistante'].includes(role)) {
    redirect('/signup?error=invalid_role');
  }

  // Rate limit par IP
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit({ identifier: `signup:${ip}`, ...RATE_LIMITS.auth });
  if (!rl.success) {
    redirect('/signup?error=rate_limit');
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || email.split('@')[0],
        role,
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      redirect('/signup?error=email_taken');
    }
    redirect('/signup?error=signup_failed');
  }

  // Si "Confirm email" est activé côté Supabase, on attend la confirmation par email.
  // Sinon, on est déjà connecté → on redirige vers /agents.
  redirect('/signup?success=1');
}

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: 'Tous les champs sont obligatoires.',
  password_too_short: 'Le mot de passe doit faire au moins 8 caractères.',
  invalid_role: 'Rôle invalide.',
  rate_limit: "Trop d'inscriptions tentées. Réessaie plus tard.",
  email_taken: 'Un compte existe déjà avec cet email.',
  signup_failed: "L'inscription a échoué. Vérifie ton email et réessaie.",
};

export default function SignupPage({ searchParams }: SignupPageProps) {
  const errorMessage = searchParams.error
    ? ERROR_MESSAGES[searchParams.error] ?? 'Erreur inconnue.'
    : null;
  const success = searchParams.success === '1';

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      <header className="mb-6 text-center">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          Nestenn IA
        </p>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Créer un compte
        </h1>
      </header>

      {errorMessage && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
          Inscription réussie. Si la confirmation email est activée, vérifie ta
          boîte de réception. Sinon, tu peux te{' '}
          <Link href="/login" className="font-medium underline">
            connecter
          </Link>{' '}
          maintenant.
        </div>
      )}

      <form action={signupAction} className="space-y-4">
        <div>
          <label
            htmlFor="full_name"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Nom complet
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            autoComplete="name"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            placeholder="Prénom Nom"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Email professionnel
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            placeholder="prenom.nom@agence.fr"
          />
        </div>

        <div>
          <label
            htmlFor="role"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Rôle dans l'agence
          </label>
          <select
            id="role"
            name="role"
            defaultValue="conseiller"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="conseiller">Conseiller immobilier</option>
            <option value="manager">Manager / Directeur d'agence</option>
            <option value="assistante">Assistant·e commercial·e</option>
          </select>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Détermine les agents auxquels tu auras accès.
          </p>
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
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            placeholder="Au moins 8 caractères"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
        >
          Créer mon compte
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Déjà un compte ?{' '}
        <Link
          href="/login"
          className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
