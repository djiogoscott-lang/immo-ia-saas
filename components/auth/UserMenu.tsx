'use client';

/**
 * UserMenu — affichage premium du user connecté en bas de la sidebar.
 *
 *   ┌─────────────────────────────────────┐
 *   │ ┌──┐  Laurent Dupont      ▾         │
 *   │ │LD│  prenom.nom@agence.fr          │
 *   │ └──┘                                │
 *   │       [● Manager]                   │
 *   │                                     │
 *   │  ↪ Se déconnecter                   │
 *   └─────────────────────────────────────┘
 *
 * - Avatar avec initiales colorées (couleur dépendante du rôle)
 * - Badge de rôle harmonisé avec la palette des catégories agents
 * - Bouton de déconnexion qui POST /auth/signout
 */

import { LogOut } from 'lucide-react';

import type { AgentAudience } from '@/lib/agents/registry';

interface UserMenuProps {
  email: string;
  fullName: string | null;
  role: AgentAudience;
}

const ROLE_LABELS: Record<AgentAudience, string> = {
  conseiller: 'Conseiller',
  manager: 'Manager',
  assistante: 'Assistant·e',
};

/**
 * Palette par rôle, alignée avec la palette des catégories de la grille
 * d'accueil (cohérence visuelle entre les écrans).
 */
const ROLE_STYLES: Record<
  AgentAudience,
  {
    avatarBg: string;
    avatarText: string;
    avatarRing: string;
    badgeBg: string;
    badgeText: string;
    badgeDot: string;
  }
> = {
  conseiller: {
    avatarBg: 'bg-indigo-100 dark:bg-indigo-900/40',
    avatarText: 'text-indigo-700 dark:text-indigo-200',
    avatarRing: 'ring-indigo-200/60 dark:ring-indigo-800/60',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-900/30',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    badgeDot: 'bg-indigo-500',
  },
  manager: {
    avatarBg: 'bg-violet-100 dark:bg-violet-900/40',
    avatarText: 'text-violet-700 dark:text-violet-200',
    avatarRing: 'ring-violet-200/60 dark:ring-violet-800/60',
    badgeBg: 'bg-violet-50 dark:bg-violet-900/30',
    badgeText: 'text-violet-700 dark:text-violet-300',
    badgeDot: 'bg-violet-500',
  },
  assistante: {
    avatarBg: 'bg-sky-100 dark:bg-sky-900/40',
    avatarText: 'text-sky-700 dark:text-sky-200',
    avatarRing: 'ring-sky-200/60 dark:ring-sky-800/60',
    badgeBg: 'bg-sky-50 dark:bg-sky-900/30',
    badgeText: 'text-sky-700 dark:text-sky-300',
    badgeDot: 'bg-sky-500',
  },
};

/**
 * Extrait les initiales d'un nom complet ou d'un email.
 * - "Laurent Dupont" → "LD"
 * - "laurent.dupont@..." → "LD"
 * - "laurent@..." → "LA"
 */
function getInitials(fullName: string | null, email: string): string {
  if (fullName && fullName.trim().length > 0) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  // Fallback : local part de l'email, on tente prenom.nom → "PN", sinon 2 lettres
  const local = email.split('@')[0] ?? email;
  const segs = local.split(/[._-]/).filter(Boolean);
  if (segs.length >= 2) {
    return (segs[0][0] + segs[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

export function UserMenu({ email, fullName, role }: UserMenuProps) {
  const displayName = fullName ?? email.split('@')[0];
  const initials = getInitials(fullName, email);
  const style = ROLE_STYLES[role];

  return (
    <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      {/* Bloc identité */}
      <div className="flex items-center gap-3 px-1 py-1.5">
        <div
          aria-hidden
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-2 ${style.avatarBg} ${style.avatarText} ${style.avatarRing}`}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {displayName}
          </p>
          <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            {email}
          </p>
        </div>
      </div>

      {/* Badge rôle */}
      <div className="mt-1 px-1">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style.badgeBg} ${style.badgeText}`}
        >
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 rounded-full ${style.badgeDot}`}
          />
          {ROLE_LABELS[role]}
        </span>
      </div>

      {/* Bouton de déconnexion */}
      <form action="/auth/signout" method="post" className="mt-3">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition-colors hover:bg-slate-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
