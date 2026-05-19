'use client';

/**
 * AgentSidebar — navigation latérale (11 agents).
 *
 * Design : glassmorphism subtil, accent coloré par agent au survol/actif,
 * affichage du prénom uniquement (le full name est dans le tooltip), gap
 * de 0.5 entre items pour une densité confortable.
 *
 * Sections : 5 catégories (Orchestration / Communication / Production /
 * Analyse / Pilotage) dans cet ordre.
 *
 * Bas de sidebar : ThemeToggle + UserMenu (ou footer minimal en mode démo).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Calculator,
  ClipboardCheck,
  DoorOpen,
  FileSignature,
  FileText,
  Home,
  Mailbox,
  Megaphone,
  PenSquare,
  Phone,
  Presentation,
  Scale,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { UserMenu } from '@/components/auth/UserMenu';
import { getAccentStyle } from '@/lib/agents/accent-styles';
import {
  AGENT_LIST,
  type AgentAudience,
  type AgentCategory,
  type AgentConfig,
} from '@/lib/agents/registry';
import { APP_NAME, APP_NAME_SHORT } from '@/lib/branding';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Mappings
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Phone,
  Megaphone,
  PenSquare,
  DoorOpen,
  Calculator,
  Scale,
  Users,
  Zap,
  TrendingUp,
  FileSignature,
  FileText,
  Mailbox,
  Presentation,
  BarChart3,
  ClipboardCheck,
};

const CATEGORY_LABELS: Record<AgentCategory, string> = {
  orchestrateur: 'Orchestration',
  production: 'Production',
  communication: 'Communication',
  analyse: 'Analyse',
  pilotage: 'Pilotage',
};

const CATEGORY_ORDER: readonly AgentCategory[] = [
  'orchestrateur',
  'communication',
  'production',
  'analyse',
  'pilotage',
] as const;

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

interface AgentSidebarProps {
  /** Rôle métier du user connecté. Si fourni, les agents sont filtrés par audience. */
  userRole?: AgentAudience;
  /** Email du user (affiché dans le UserMenu en bas). */
  userEmail?: string;
  /** Nom complet du user (affiché dans le UserMenu, fallback sur le local part de l'email). */
  userFullName?: string | null;
}

export function AgentSidebar({
  userRole,
  userEmail,
  userFullName,
}: AgentSidebarProps = {}) {
  const pathname = usePathname() ?? '';
  const currentAgentId = pathname.startsWith('/agents/')
    ? pathname.split('/')[2] ?? null
    : null;

  const visibleAgents = userRole
    ? AGENT_LIST.filter((agent) => agent.audience.includes(userRole))
    : AGENT_LIST;

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    agents: visibleAgents.filter((agent) => agent.category === category),
  })).filter((group) => group.agents.length > 0);

  return (
    <aside
      aria-label={`Navigation des agents ${APP_NAME}`}
      className="flex h-screen w-64 shrink-0 flex-col border-r border-zinc-200/60 bg-white/40 backdrop-blur-xl dark:border-zinc-800/40 dark:bg-zinc-950/40"
    >
      {/* Header : logo + nom */}
      <div className="flex h-16 items-center border-b border-zinc-200/60 px-4 dark:border-zinc-800/40">
        <Link
          href="/agents"
          className="flex items-center gap-2 font-semibold text-zinc-900 transition-opacity hover:opacity-80 dark:text-zinc-50"
        >
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs text-white shadow-sm shadow-indigo-500/20"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm tracking-tight">{APP_NAME_SHORT}</span>
        </Link>
      </div>

      {/* Lien Accueil (grille agents) */}
      <div className="border-b border-zinc-200/60 px-2 py-3 dark:border-zinc-800/40">
        <Link
          href="/agents"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
            currentAgentId === null
              ? 'bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900'
              : 'text-zinc-700 hover:bg-zinc-100/60 dark:text-zinc-300 dark:hover:bg-zinc-800/40'
          )}
        >
          <Home className="h-4 w-4 shrink-0" aria-hidden strokeWidth={2} />
          <span className="font-medium">Tous les agents</span>
        </Link>
      </div>

      {/* Agents groupés par catégorie */}
      <nav
        aria-label="Liste des agents"
        className="flex-1 overflow-y-auto px-2 py-3"
      >
        {grouped.map((group) => (
          <div key={group.category} className="mb-5 last:mb-0">
            <h3 className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
              {group.label}
            </h3>
            <ul className="space-y-0.5">
              {group.agents.map((agent) => (
                <AgentSidebarItem
                  key={agent.id}
                  agent={agent}
                  active={currentAgentId === agent.id}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer : theme toggle + UserMenu */}
      <div className="border-t border-zinc-200/60 dark:border-zinc-800/40">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Apparence
          </span>
          <ThemeToggle />
        </div>
        {userEmail && userRole ? (
          <UserMenu
            email={userEmail}
            fullName={userFullName ?? null}
            role={userRole}
          />
        ) : (
          <div className="border-t border-zinc-200/60 px-4 py-3 text-[11px] text-zinc-400 dark:border-zinc-800/40 dark:text-zinc-500">
            Multi-Agents · Start Academy
          </div>
        )}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Sous-composant : un item d'agent
// ---------------------------------------------------------------------------

interface AgentSidebarItemProps {
  agent: AgentConfig;
  active: boolean;
}

function AgentSidebarItem({ agent, active }: AgentSidebarItemProps) {
  const Icon = ICON_MAP[agent.icon] ?? Sparkles;
  const accent = getAccentStyle(agent.accent);

  // Affiche uniquement le prénom dans la sidebar (sidebar étroite).
  // Le nom complet "Sarah — Coordinatrice RDV Vendeur" est dans le tooltip.
  const firstName = agent.name.split('—')[0]?.trim() ?? agent.name;

  return (
    <li>
      <Link
        href={`/agents/${agent.id}`}
        aria-current={active ? 'page' : undefined}
        title={`${agent.name} — ${agent.tagline}`}
        className={cn(
          'group flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-200',
          active
            ? cn(
                'bg-white/60 font-medium text-zinc-900 shadow-sm ring-1 dark:bg-zinc-900/60 dark:text-zinc-50',
                accent.ringActive
              )
            : 'text-zinc-600 hover:bg-zinc-100/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-100'
        )}
      >
        <span
          aria-hidden
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors',
            active ? cn(accent.iconBg, accent.iconText) : 'text-zinc-500 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <span className="truncate">{firstName}</span>
      </Link>
    </li>
  );
}
