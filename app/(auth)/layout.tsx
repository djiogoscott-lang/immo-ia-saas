import type { ReactNode } from 'react';

/**
 * Layout minimaliste pour les pages d'authentification (/login, /signup).
 * Pas de sidebar, pas de header : juste un fond et un container centré.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-50 via-white to-zinc-50 px-4 py-12 dark:from-cyan-950/30 dark:via-zinc-950 dark:to-zinc-900">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
