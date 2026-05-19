/**
 * Mapping statique des classes Tailwind par couleur d'accent d'agent.
 *
 * Tailwind doit voir les classes au moment du build (purge). Construire
 * une classe dynamiquement (ex : `bg-${accent}-500`) ne marche pas — donc
 * on déclare chaque variante en clair ici.
 *
 * Utilisé par AgentGrid et AgentSidebar pour teinter cartes / badges /
 * anneau actif selon `agent.accent`.
 */

import type { AgentAccent } from '@/lib/agents/registry';

export interface AccentStyle {
  /** Bordure de la carte au survol (subtile). */
  cardHoverBorder: string;
  /** Glow / ombre projetée colorée au survol. */
  cardHoverShadow: string;
  /** Fond de la pastille d'icône. */
  iconBg: string;
  /** Couleur de l'icône. */
  iconText: string;
  /** Anneau autour de la pastille d'icône. */
  iconRing: string;
  /** Couleur du texte du badge persona. */
  badgeText: string;
  /** Fond du badge persona. */
  badgeBg: string;
  /** Couleur de l'accent vif (titre hover, CTA, etc.). */
  accentText: string;
  /** Anneau de focus / actif (sidebar) — version pleine. */
  ringActive: string;
}

export const ACCENT_STYLES: Record<AgentAccent, AccentStyle> = {
  indigo: {
    cardHoverBorder: 'hover:border-indigo-300/60 dark:hover:border-indigo-700/60',
    cardHoverShadow: 'hover:shadow-indigo-500/10 dark:hover:shadow-indigo-400/10',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/50',
    iconText: 'text-indigo-600 dark:text-indigo-400',
    iconRing: 'ring-indigo-200/60 dark:ring-indigo-800/60',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    accentText: 'text-indigo-600 dark:text-indigo-400',
    ringActive: 'ring-indigo-500/40',
  },
  sky: {
    cardHoverBorder: 'hover:border-sky-300/60 dark:hover:border-sky-700/60',
    cardHoverShadow: 'hover:shadow-sky-500/10 dark:hover:shadow-sky-400/10',
    iconBg: 'bg-sky-50 dark:bg-sky-950/50',
    iconText: 'text-sky-600 dark:text-sky-400',
    iconRing: 'ring-sky-200/60 dark:ring-sky-800/60',
    badgeText: 'text-sky-700 dark:text-sky-300',
    badgeBg: 'bg-sky-50 dark:bg-sky-950/40',
    accentText: 'text-sky-600 dark:text-sky-400',
    ringActive: 'ring-sky-500/40',
  },
  pink: {
    cardHoverBorder: 'hover:border-pink-300/60 dark:hover:border-pink-700/60',
    cardHoverShadow: 'hover:shadow-pink-500/10 dark:hover:shadow-pink-400/10',
    iconBg: 'bg-pink-50 dark:bg-pink-950/50',
    iconText: 'text-pink-600 dark:text-pink-400',
    iconRing: 'ring-pink-200/60 dark:ring-pink-800/60',
    badgeText: 'text-pink-700 dark:text-pink-300',
    badgeBg: 'bg-pink-50 dark:bg-pink-950/40',
    accentText: 'text-pink-600 dark:text-pink-400',
    ringActive: 'ring-pink-500/40',
  },
  amber: {
    cardHoverBorder: 'hover:border-amber-300/60 dark:hover:border-amber-700/60',
    cardHoverShadow: 'hover:shadow-amber-500/10 dark:hover:shadow-amber-400/10',
    iconBg: 'bg-amber-50 dark:bg-amber-950/50',
    iconText: 'text-amber-600 dark:text-amber-400',
    iconRing: 'ring-amber-200/60 dark:ring-amber-800/60',
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    accentText: 'text-amber-600 dark:text-amber-400',
    ringActive: 'ring-amber-500/40',
  },
  emerald: {
    cardHoverBorder: 'hover:border-emerald-300/60 dark:hover:border-emerald-700/60',
    cardHoverShadow: 'hover:shadow-emerald-500/10 dark:hover:shadow-emerald-400/10',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    iconRing: 'ring-emerald-200/60 dark:ring-emerald-800/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    ringActive: 'ring-emerald-500/40',
  },
  violet: {
    cardHoverBorder: 'hover:border-violet-300/60 dark:hover:border-violet-700/60',
    cardHoverShadow: 'hover:shadow-violet-500/10 dark:hover:shadow-violet-400/10',
    iconBg: 'bg-violet-50 dark:bg-violet-950/50',
    iconText: 'text-violet-600 dark:text-violet-400',
    iconRing: 'ring-violet-200/60 dark:ring-violet-800/60',
    badgeText: 'text-violet-700 dark:text-violet-300',
    badgeBg: 'bg-violet-50 dark:bg-violet-950/40',
    accentText: 'text-violet-600 dark:text-violet-400',
    ringActive: 'ring-violet-500/40',
  },
  rose: {
    cardHoverBorder: 'hover:border-rose-300/60 dark:hover:border-rose-700/60',
    cardHoverShadow: 'hover:shadow-rose-500/10 dark:hover:shadow-rose-400/10',
    iconBg: 'bg-rose-50 dark:bg-rose-950/50',
    iconText: 'text-rose-600 dark:text-rose-400',
    iconRing: 'ring-rose-200/60 dark:ring-rose-800/60',
    badgeText: 'text-rose-700 dark:text-rose-300',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
    accentText: 'text-rose-600 dark:text-rose-400',
    ringActive: 'ring-rose-500/40',
  },
  orange: {
    cardHoverBorder: 'hover:border-orange-300/60 dark:hover:border-orange-700/60',
    cardHoverShadow: 'hover:shadow-orange-500/10 dark:hover:shadow-orange-400/10',
    iconBg: 'bg-orange-50 dark:bg-orange-950/50',
    iconText: 'text-orange-600 dark:text-orange-400',
    iconRing: 'ring-orange-200/60 dark:ring-orange-800/60',
    badgeText: 'text-orange-700 dark:text-orange-300',
    badgeBg: 'bg-orange-50 dark:bg-orange-950/40',
    accentText: 'text-orange-600 dark:text-orange-400',
    ringActive: 'ring-orange-500/40',
  },
  cyan: {
    cardHoverBorder: 'hover:border-cyan-300/60 dark:hover:border-cyan-700/60',
    cardHoverShadow: 'hover:shadow-cyan-500/10 dark:hover:shadow-cyan-400/10',
    iconBg: 'bg-cyan-50 dark:bg-cyan-950/50',
    iconText: 'text-cyan-600 dark:text-cyan-400',
    iconRing: 'ring-cyan-200/60 dark:ring-cyan-800/60',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/40',
    accentText: 'text-cyan-600 dark:text-cyan-400',
    ringActive: 'ring-cyan-500/40',
  },
  fuchsia: {
    cardHoverBorder: 'hover:border-fuchsia-300/60 dark:hover:border-fuchsia-700/60',
    cardHoverShadow: 'hover:shadow-fuchsia-500/10 dark:hover:shadow-fuchsia-400/10',
    iconBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/50',
    iconText: 'text-fuchsia-600 dark:text-fuchsia-400',
    iconRing: 'ring-fuchsia-200/60 dark:ring-fuchsia-800/60',
    badgeText: 'text-fuchsia-700 dark:text-fuchsia-300',
    badgeBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40',
    accentText: 'text-fuchsia-600 dark:text-fuchsia-400',
    ringActive: 'ring-fuchsia-500/40',
  },
  lime: {
    cardHoverBorder: 'hover:border-lime-300/60 dark:hover:border-lime-700/60',
    cardHoverShadow: 'hover:shadow-lime-500/10 dark:hover:shadow-lime-400/10',
    iconBg: 'bg-lime-50 dark:bg-lime-950/50',
    iconText: 'text-lime-600 dark:text-lime-400',
    iconRing: 'ring-lime-200/60 dark:ring-lime-800/60',
    badgeText: 'text-lime-700 dark:text-lime-300',
    badgeBg: 'bg-lime-50 dark:bg-lime-950/40',
    accentText: 'text-lime-600 dark:text-lime-400',
    ringActive: 'ring-lime-500/40',
  },
};

/** Helper : raccourci pour récupérer le style d'un agent. */
export function getAccentStyle(accent: AgentAccent): AccentStyle {
  return ACCENT_STYLES[accent];
}
